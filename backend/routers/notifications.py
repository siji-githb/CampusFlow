from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from deps import get_current_user, get_supabase_anon, get_supabase_admin, get_ws_user
from services.websocket_manager import manager

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/")
async def get_notifications(user=Depends(get_current_user)):
    # Use anon client — RLS ensures users only see their own notifications
    supabase = get_supabase_anon()
    response = supabase.table("notifications").select("*").eq("user_id", user.id).order("created_at", desc=True).execute()
    return response.data


@router.patch("/{notification_id}/read")
async def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
    # Use admin client for writes to avoid RLS insert/update permission issues
    admin = get_supabase_admin()
    response = admin.table("notifications").update({"is_read": True}).eq("id", notification_id).eq("user_id", user.id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read", "notification": response.data[0]}


@router.patch("/read-all")
async def mark_all_notifications_read(user=Depends(get_current_user)):
    # Use admin client for writes to avoid RLS insert/update permission issues
    admin = get_supabase_admin()
    response = admin.table("notifications").update({"is_read": True}).eq("user_id", user.id).eq("is_read", False).execute()
    return {"message": f"Marked {len(response.data) if response.data else 0} as read"}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, user=Depends(get_ws_user)):
    await manager.connect(websocket, user.id)
    try:
        while True:
            # We don't expect the client to send messages here, but we must
            # wait on receive() to detect when the client disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)