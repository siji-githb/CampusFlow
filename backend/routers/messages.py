from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from supabase import create_client
from config import get_settings
from services.ai_service import get_or_create_session, save_messages
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/messages", tags=["Messages"])


def get_current_user(authorization: str):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.replace("Bearer ", "")
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_user_profile(user_id: str):
    admin = create_client(settings.supabase_url, settings.supabase_service_key)
    try:
        res = admin.table("users").select("*").eq("id", user_id).single().execute()
        return res.data
    except Exception:
        raise HTTPException(status_code=404, detail="User profile not found")


@router.get("/")
def get_messages(authorization: str = Header(...)):
    """Staff/admin: get all AI-escalated messages, newest first."""
    user = get_current_user(authorization)
    profile = get_user_profile(user.id)
    if profile["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Staff only")

    admin = create_client(settings.supabase_url, settings.supabase_service_key)
    res = admin.table("messages") \
        .select("*, users(first_name, last_name, student_id)") \
        .order("created_at", desc=True) \
        .execute()
    return res.data or []


@router.patch("/{message_id}/read")
def mark_read(message_id: str, authorization: str = Header(...)):
    """Mark a message as read."""
    user = get_current_user(authorization)
    profile = get_user_profile(user.id)
    if profile["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Staff only")

    admin = create_client(settings.supabase_url, settings.supabase_service_key)
    admin.table("messages").update({"is_read": True}).eq("id", message_id).execute()
    return {"success": True}


class ReplyRequest(BaseModel):
    replyText: str

@router.post("/{message_id}/reply")
def reply_to_message(message_id: str, data: ReplyRequest, authorization: str = Header(...)):
    """Staff/admin: reply to a message, inserting the reply into the student's AI chat history."""
    user = get_current_user(authorization)
    profile = get_user_profile(user.id)
    if profile["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Staff only")

    admin = create_client(settings.supabase_url, settings.supabase_service_key)
    
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