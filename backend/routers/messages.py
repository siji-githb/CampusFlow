from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from services.ai_service import get_or_create_session, save_messages
from deps import require_staff_or_admin, get_user_profile, get_supabase_admin

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/")
def get_messages(user=Depends(require_staff_or_admin)):
    """Staff/admin: get all AI-escalated messages, newest first."""
    admin = get_supabase_admin()
    res = admin.table("messages") \
        .select("*, users(first_name, last_name, student_id)") \
        .order("created_at", desc=True) \
        .execute()
    return res.data or []


@router.patch("/{message_id}/read")
def mark_read(message_id: str, user=Depends(require_staff_or_admin)):
    """Mark a message as read."""
    admin = get_supabase_admin()
    admin.table("messages").update({"is_read": True}).eq("id", message_id).execute()
    return {"success": True}


class ReplyRequest(BaseModel):
    replyText: str

@router.post("/{message_id}/reply")
def reply_to_message(message_id: str, data: ReplyRequest, user=Depends(require_staff_or_admin)):
    """Staff/admin: reply to a message, inserting the reply into the student's AI chat history."""
    profile = get_user_profile(user.id)
    admin = get_supabase_admin()

    # Get the original message to find the student_id
    msg_res = admin.table("messages").select("student_id").eq("id", message_id).single().execute()
    if not msg_res.data:
        raise HTTPException(status_code=404, detail="Message not found")

    student_id = msg_res.data["student_id"]

    # Mark as read
    admin.table("messages").update({"is_read": True}).eq("id", message_id).execute()

    # Append to AI chat history
    session = get_or_create_session(student_id)
    history = session.get("messages") or []
    history.append({
        "role": "staff",
        "content": data.replyText,
        "staff_name": f"{profile.get('first_name', 'Staff')} {profile.get('last_name', '')}".strip()
    })

    save_messages(session["id"], history[-20:])

    return {"success": True}