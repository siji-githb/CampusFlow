"""
Handles PWD / pregnancy priority requests: document upload, AI-assisted
legitimacy scoring (advisory only), and staff approval workflow.

Important design principle: the AI NEVER makes the final approval decision
and NEVER analyzes a photo of the student's body or condition. It only
reads the uploaded DOCUMENT (a PWD ID or medical certificate) and scores
how much it looks like a legitimate official document — text presence,
expected formatting cues, official letterhead/seal mentions, etc. Staff
always make the actual approve/reject call.
"""
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from config import get_settings
from deps import get_supabase_admin as get_admin

settings = get_settings()

PREGNANCY_VALIDITY_MONTHS = 9


def scan_document_legitimacy(document_url: str, priority_type: str) -> dict:
    """
    Sends the uploaded document image to OpenAI's vision-capable model to:
    1. Extract any visible text (OCR-style reading)
    2. Score 0-100 how much it resembles a legitimate document of the
       expected type (PWD ID card, or medical/pregnancy certificate)
    Returns a dict with extracted_text, confidence_score, reasoning.
    Never raises — on any failure, returns a 0 score and flags for manual
    staff review rather than blocking the submission.
    """
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url)

        expected_doc = (
            "a Philippine PWD (Person with Disability) ID card, issued by a local government unit"
            if priority_type == "pwd"
            else "a medical/pregnancy certificate issued by a licensed physician or OB-GYN"
        )

        resp = client.chat.completions.create(
            model=settings.openai_model,
            max_tokens=350,
            temperature=0,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            f"You are assisting a school registrar staff member reviewing a document "
                            f"submission. The student claims this image is {expected_doc}.\n\n"
                            f"Do NOT analyze any person's body, appearance, or physical condition in "
                            f"this image. Only evaluate the DOCUMENT itself as a piece of paper/ID: "
                            f"does it contain the kind of text, layout, and official markings you'd "
                            f"expect from this document type (e.g. government seal, ID number format, "
                            f"physician's letterhead, signature line, issuing office name)?\n\n"
                            f"Reply with ONLY a JSON object, no extra text:\n"
                            f'{{"extracted_text": "<any visible text you can read, or empty string>", '
                            f'"confidence_score": <integer 0-100, how much this looks like a legitimate '
                            f'{priority_type} document based on visible formatting and text>, '
                            f'"reasoning": "<one short sentence explaining the score>"}}'
                        )
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": document_url}
                    }
                ]
            }]
        )

        import json, re
        raw = resp.choices[0].message.content.strip()
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            raise ValueError("No JSON found in AI response")
        data = json.loads(match.group())

        score = int(data.get("confidence_score", 0))
        score = max(0, min(100, score))  # clamp to 0-100

        return {
            "extracted_text": data.get("extracted_text", "")[:2000],
            "confidence_score": score,
            "reasoning": data.get("reasoning", "")[:500],
        }

    except Exception as e:
        # Never block submission on AI failure — just flag for full manual review
        return {
            "extracted_text": "",
            "confidence_score": 0,
            "reasoning": f"Automatic scan unavailable ({str(e)[:100]}) — please review manually.",
        }


def submit_priority_request(student_id: str, priority_type: str, document_url: str) -> dict:
    if priority_type not in ("pwd", "pregnant"):
        raise HTTPException(status_code=400, detail="priority_type must be 'pwd' or 'pregnant'")

    admin = get_admin()

    # Prevent duplicate pending requests
    existing = admin.table("priority_requests") \
        .select("id") \
        .eq("student_id", student_id) \
        .eq("status", "pending") \
        .execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="You already have a pending priority request.")

    scan = scan_document_legitimacy(document_url, priority_type)

    try:
        res = admin.table("priority_requests").insert({
            "student_id": student_id,
            "priority_type": priority_type,
            "document_url": document_url,
            "ocr_extracted_text": scan["extracted_text"],
            "ocr_confidence_score": scan["confidence_score"],
            "ocr_reasoning": scan["reasoning"],
            "status": "pending",
        }).execute()
        return res.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_pending_requests() -> list:
    admin = get_admin()
    try:
        res = admin.table("priority_requests") \
            .select("*, users(first_name, last_name, student_id)") \
            .eq("status", "pending") \
            .order("created_at") \
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def approve_request(request_id: str, staff_id: str) -> dict:
    admin = get_admin()

    try:
        req_res = admin.table("priority_requests").select("*").eq("id", request_id).single().execute()
        req = req_res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Priority request not found")

    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="This request has already been reviewed.")

    now = datetime.now(timezone.utc)
    expires_at = None
    if req["priority_type"] == "pregnant":
        expires_at = (now + timedelta(days=30 * PREGNANCY_VALIDITY_MONTHS)).isoformat()

    admin.table("priority_requests").update({
        "status": "approved",
        "reviewed_by": staff_id,
        "reviewed_at": now.isoformat(),
        "expires_at": expires_at,
    }).eq("id", request_id).execute()

    admin.table("users").update({
        "priority_class": req["priority_type"],
    }).eq("id", req["student_id"]).execute()

    try:
        admin.table("appointments").update({
            "priority_class": req["priority_type"]
        }).eq("student_id", req["student_id"]).eq("status", "confirmed").execute()
    except Exception as e:
        pass  # non-critical if it fails

    return {"message": "Priority request approved.", "expires_at": expires_at}


def reject_request(request_id: str, staff_id: str, reason: str) -> dict:
    admin = get_admin()

    try:
        req_res = admin.table("priority_requests").select("*").eq("id", request_id).single().execute()
        req = req_res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Priority request not found")

    if req["status"] != "pending":
        raise HTTPException(status_code=400, detail="This request has already been reviewed.")

    admin.table("priority_requests").update({
        "status": "rejected",
        "reviewed_by": staff_id,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "rejection_reason": reason,
    }).eq("id", request_id).execute()

    return {"message": "Priority request rejected."}


def sync_priority_status(student_id: str) -> None:
    """
    Lazy expiry check — call this whenever a student's priority_class is
    about to be read/used (login, booking). If their pregnancy priority
    has expired, silently revert them to 'regular'. PWD status never
    expires so it's untouched here. Never raises — this is a background
    correctness check, not a critical path.
    """
    admin = get_admin()
    try:
        user_res = admin.table("users").select("priority_class").eq("id", student_id).single().execute()
        user = user_res.data
        if not user or user.get("priority_class") != "pregnant":
            return

        req_res = admin.table("priority_requests") \
            .select("expires_at") \
            .eq("student_id", student_id) \
            .eq("priority_type", "pregnant") \
            .eq("status", "approved") \
            .order("reviewed_at", desc=True) \
            .limit(1) \
            .execute()

        if not req_res.data or not req_res.data[0].get("expires_at"):
            return

        expires_at = datetime.fromisoformat(req_res.data[0]["expires_at"].replace("Z", "+00:00"))
        if expires_at < datetime.now(timezone.utc):
            admin.table("users").update({"priority_class": "regular"}).eq("id", student_id).execute()
            # Also downgrade any future confirmed appointments back to regular
            try:
                admin.table("appointments").update({
                    "priority_class": "regular"
                }).eq("student_id", student_id).eq("status", "confirmed").execute()
            except Exception:
                pass
    except Exception:
        pass  # never block login/booking on this check


def get_student_priority_status(student_id: str) -> dict:
    admin = get_admin()
    sync_priority_status(student_id)

    try:
        user_res = admin.table("users").select("priority_class").eq("id", student_id).single().execute()
        current_class = user_res.data.get("priority_class", "regular")

        latest_res = admin.table("priority_requests") \
            .select("*") \
            .eq("student_id", student_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        latest = latest_res.data[0] if latest_res.data else None

        return {"current_priority_class": current_class, "latest_request": latest}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))