from fastapi import APIRouter, Header, HTTPException
from supabase import create_client
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_current_user(authorization: str):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.replace("Bearer ", "")
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user.user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.get("/")
async def get_notifications(authorization: str = Header(None)):
    user = get_current_user(authorization)
    supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
    # The client can only read their own notifications due to RLS
    response = supabase.table("notifications").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    return response.data


@router.patch("/{notification_id}/read")
async def mark_notification_read(notification_id: str, authorization: str = Header(None)):
    user = get_current_user(authorization)
    supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
    
    response = supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).eq("user_id", user.id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read", "notification": response.data[0]}


@router.patch("/read-all")
async def mark_all_notifications_read(authorization: str = Header(None)):
    user = get_current_user(authorization)
    supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
    
    response = supabase.table("notifications").update({"is_read": True}).eq("user_id", user.id).eq("is_read", False).execute()
    return {"message": f"Marked {len(response.data) if response.data else 0} as read"}
