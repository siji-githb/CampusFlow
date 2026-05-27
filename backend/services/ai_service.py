from openai import OpenAI
from fastapi import HTTPException
from supabase import create_client
from config import get_settings
from datetime import date, timedelta
import json

settings = get_settings()


def get_admin():
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_openai_client():
    return OpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url,
    )


def get_system_prompt():
    """Build the system prompt with current transaction types and office config."""
    admin = get_admin()

    try:
        tt_res = admin.table("transaction_types").select("*").eq("is_active", True).execute()
        transaction_types = tt_res.data
    except Exception:
        transaction_types = []

    try:
        config_res = admin.table("office_config").select("*").execute()
        config = {row["key"]: row["value"] for row in config_res.data}
    except Exception:
        config = {}

    tt_info = ""
    for tt in transaction_types:
        tt_info += f"\n- {tt['name']}: requires {', '.join(tt.get('required_documents') or [])}"

    return f"""You are CampusFlow Assistant, an AI scheduling helper for the Registrar's Office of Cebu Roosevelt Memorial Colleges (CRMC).

You help students with:
1. Booking, modifying, or cancelling appointments
2. Answering FAQs about registrar transactions
3. Telling students what documents they need to bring
4. Explaining the step-by-step process for each transaction

AVAILABLE TRANSACTION TYPES:{tt_info}

OFFICE HOURS: {config.get('office_open_time', '08:00')} - {config.get('office_close_time', '17:00')}, Monday to Friday
SLOT DURATION: {config.get('slot_duration_minutes', '30')} minutes per slot
BOOKING CUTOFF: At least {config.get('booking_cutoff_days', '1')} day(s) in advance

TODAY'S DATE: {date.today().strftime('%B %d, %Y')} ({date.today().strftime('%A')})

IMPORTANT RULES:
- You can only book appointments on weekdays (Monday to Friday)
- Students must bring ALL required documents on their appointment date
- Appointments can be cancelled before the cutoff period
- If a student asks something outside your knowledge, tell them you will escalate to a staff member

When a student wants to book an appointment, ask for:
1. Transaction type
2. Preferred date (must be a weekday, at least 1 day in advance)
3. Preferred time slot

Always be friendly, helpful, and concise. Respond in plain English."""


def get_or_create_session(student_id: str):
    admin = get_admin()
    try:
        res = admin.table("ai_chat_sessions") \
            .select("*") \
            .eq("student_id", student_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        if res.data:
            return res.data[0]
        # Create new session
        new_session = admin.table("ai_chat_sessions").insert({
            "student_id": student_id,
            "messages": []
        }).execute()
        return new_session.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def save_messages(session_id: str, messages: list):
    admin = get_admin()
    try:
        admin.table("ai_chat_sessions") \
            .update({"messages": messages}) \
            .eq("id", session_id) \
            .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def escalate_to_staff(student_id: str, question: str):
    admin = get_admin()
    try:
        admin.table("messages").insert({
            "student_id": student_id,
            "subject": "AI Escalation — Unanswered Question",
            "body": f"A student asked the AI assistant: \"{question}\"\n\nThe AI could not answer this. Please follow up with the student.",
            "is_resolved": False
        }).execute()
    except Exception:
        pass


def chat(student_id: str, user_message: str):
    client = get_openai_client()

    # Get or create session
    session = get_or_create_session(student_id)
    session_id = session["id"]
    history = session.get("messages") or []

    # Add user message to history
    history.append({"role": "user", "content": user_message})

    # Keep only last 20 messages to avoid token limits
    recent_history = history[-20:]

    # Build messages for API call
    messages = [
        {"role": "system", "content": get_system_prompt()}
    ] + recent_history

    try:
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            max_tokens=500,
            temperature=0.7,
        )
        assistant_message = response.choices[0].message.content

        # Check if escalation needed
        escalation_keywords = [
            "i don't know", "i'm not sure", "cannot answer",
            "please contact", "outside my knowledge", "escalate"
        ]
        should_escalate = any(kw in assistant_message.lower() for kw in escalation_keywords)

        if should_escalate:
            escalate_to_staff(student_id, user_message)
            assistant_message += "\n\n*Your question has been forwarded to a Registrar staff member who will follow up with you.*"

        # Save to history
        history.append({"role": "assistant", "content": assistant_message})
        save_messages(session_id, history[-20:])

        return {
            "message": assistant_message,
            "session_id": session_id,
            "escalated": should_escalate
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


def clear_session(student_id: str):
    admin = get_admin()
    try:
        res = admin.table("ai_chat_sessions") \
            .select("id") \
            .eq("student_id", student_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        if res.data:
            admin.table("ai_chat_sessions") \
                .update({"messages": []}) \
                .eq("id", res.data[0]["id"]) \
                .execute()
        return {"message": "Chat cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))