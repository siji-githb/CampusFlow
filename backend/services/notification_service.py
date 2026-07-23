import logging
import asyncio
from config import get_settings
from deps import get_supabase_admin as get_admin_client
from services.websocket_manager import manager

settings = get_settings()
logger = logging.getLogger(__name__)

def create_system_notification(user_id: str, title: str, message: str, type: str = "info"):
    """
    Creates a notification for a specific user.
    Uses the admin client to bypass any RLS on inserts.
    """
    try:
        admin = get_admin_client()
        res = admin.table("notifications").insert({
            "user_id": user_id,
            "title": title,
            "message": message,
            "type": type
        }).execute()
        
        if res.data:
            notification = res.data[0]
            # Thread-safe websocket push from sync route
            manager.send_personal_message_sync(notification, user_id)
    except Exception as e:
        logger.error(f"Failed to create notification for {user_id}: {e}")

def notify_staff_urgent_message(student_name: str):
    """
    Finds all staff users and sends them an urgent notification.
    """
    try:
        admin = get_admin_client()
        # Fetch staff users only
        res = admin.table("users").select("id").eq("role", "staff").execute()
        if not res.data:
            return
            
        notifications = [{
            "user_id": u["id"],
            "title": "Urgent Message Escalated",
            "message": f"An urgent message requires your attention from {student_name}.",
            "type": "warning"
        } for u in res.data]
        
        res_insert = admin.table("notifications").insert(notifications).execute()
        if res_insert.data:
            for notif in res_insert.data:
                manager.send_personal_message_sync(notif, notif["user_id"])
    except Exception as e:
        logger.error(f"Failed to notify staff of urgent message: {e}")

def notify_staff_id_request(student_name: str):
    """
    Finds all staff users and sends them a notification about a new ID request.
    """
    try:
        admin = get_admin_client()
        res = admin.table("users").select("id").eq("role", "staff").execute()
        if not res.data:
            return
            
        notifications = [{
            "user_id": u["id"],
            "title": "New ID Request",
            "message": f"A new Student ID request was submitted by {student_name}.",
            "type": "info"
        } for u in res.data]
        
        res_insert = admin.table("notifications").insert(notifications).execute()
        if res_insert.data:
            for notif in res_insert.data:
                manager.send_personal_message_sync(notif, notif["user_id"])
    except Exception as e:
        logger.error(f"Failed to notify staff of ID request: {e}")