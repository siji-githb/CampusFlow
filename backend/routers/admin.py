from fastapi import APIRouter, Depends, Request
from typing import Optional
from services.admin_service import (
    get_dashboard_stats,
    get_reports,
    get_registrar_records,
    get_audit_log,
    get_office_config,
    update_office_config,
    get_all_users,
    update_user_role,
    toggle_user_status,
    get_transaction_types,
    get_ai_insights,          # ← M12
    get_window_assignments,   # ← Window Assignment
    claim_window,
    release_window,
)
from models.admin_models import OfficeConfigUpdate
from models.appointment_models import ReleaseDateUpdate
from pydantic import BaseModel
from services.appointment_service import get_all_appointments, update_appointment_status, set_release_date
from deps import require_admin, require_staff_or_admin
from rate_limit import limiter

router = APIRouter(prefix="/admin", tags=["Admin"])

class StatusUpdate(BaseModel):
    status: str


@router.get("/stats")
def dashboard_stats(user=Depends(require_admin)):
    return get_dashboard_stats()


@router.get("/reports")
def reports(days: int = 7, user=Depends(require_admin)):
    return get_reports(days)


@router.get("/records")
def registrar_records(days: int = 30, user=Depends(require_admin)):
    return get_registrar_records(days)


@router.get("/audit-log")
def audit_log(limit: int = 50, user=Depends(require_admin)):
    return get_audit_log(limit)


@router.get("/office-config")
def office_config(user=Depends(require_admin)):
    return get_office_config()


@router.patch("/office-config")
def update_config(data: OfficeConfigUpdate, user=Depends(require_admin)):
    return update_office_config(data.key, data.value, user.id)


@router.get("/users")
def all_users(user=Depends(require_admin)):
    return get_all_users()


@router.patch("/users/{user_id}/role")
def change_role(user_id: str, role: str, user=Depends(require_admin)):
    return update_user_role(user_id, role, user.id)


@router.patch("/users/{user_id}/status")
def change_status(user_id: str, is_active: bool, user=Depends(require_admin)):
    return toggle_user_status(user_id, is_active, user.id)


@router.get("/transaction-types")
def transaction_types(user=Depends(require_admin)):
    return get_transaction_types()


@router.get("/appointments")
def all_appointments(date: str = None, user=Depends(require_admin)):
    return get_all_appointments(date)


@router.patch("/appointments/{appointment_id}/status")
def change_appointment_status(appointment_id: str, data: StatusUpdate, user=Depends(require_admin)):
    return update_appointment_status(appointment_id, data.status, user.id)


@router.patch("/appointments/{appointment_id}/release-date")
def update_release_date(appointment_id: str, data: ReleaseDateUpdate, user=Depends(require_admin)):
    return set_release_date(appointment_id, data.release_date, user.id)



# ── M12: AI-Generated Admin Insights ─────────────────────────────────────────

@router.get("/insights")
def ai_insights(user=Depends(require_admin)):
    """Today's appointment stats + AI-generated summary for the Reports tab."""
    return get_ai_insights()

class DateOverrideRequest(BaseModel):
    date: str
    is_blocked: bool
    note: Optional[str] = None

@router.post("/date-overrides")
def set_date_override(req: DateOverrideRequest, user=Depends(require_admin)):
    """Block a date or add a notice note, automatically rescheduling existing appointments if blocked."""
    from services.admin_service import apply_date_override
    return apply_date_override(req.date, req.is_blocked, req.note, user.id)

@router.get("/id-requests")
def get_all_id_requests(user=Depends(require_staff_or_admin)):
    """Fetch all pending ID requests for staff/admin dashboard."""
    from deps import get_supabase_admin
    admin = get_supabase_admin()
    res = admin.table("id_requests").select("*").order("created_at", desc=True).execute()
    return res.data or []

class SendEmailBody(BaseModel):
    subject: str
    body: str

@router.post("/id-requests/{request_id}/send-email")
@limiter.limit("10/minute")
def send_id_email(request: Request, request_id: str, data: SendEmailBody, user=Depends(require_staff_or_admin)):
    """Send an email directly via backend SMTP, skipping local mail clients."""
    from deps import get_supabase_admin
    from services.email_service import send_email
    from fastapi import HTTPException
    
    admin = get_supabase_admin()
    res = admin.table("id_requests").select("email").eq("id", request_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="ID Request not found")
        
    try:
        send_email(to_email=res.data["email"], subject=data.subject, body=data.body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {"message": "Email sent successfully!"}


@router.patch("/id-requests/{request_id}")
def update_id_request(request_id: str, data: dict, user=Depends(require_staff_or_admin)):
    """Update status of an ID request."""
    from deps import get_supabase_admin
    admin = get_supabase_admin()
    
    update_data = {"status": data.get("status")}
    if data.get("status") in ["resolved", "ignored"]:
        update_data["resolved_at"] = "now()"
        
    res = admin.table("id_requests").update(update_data).eq("id", request_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="ID Request not found")
    return {"message": "Request updated", "data": res.data[0]}


@router.delete("/id-requests/{request_id}")
def delete_id_request(request_id: str, user=Depends(require_staff_or_admin)):
    """Delete an ID request (used for clearing history)."""
    from deps import get_supabase_admin
    from fastapi import HTTPException
    admin = get_supabase_admin()
    
    res = admin.table("id_requests").delete().eq("id", request_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="ID Request not found")
    return {"message": "Request deleted successfully"}


# ── Window Assignment ─────────────────────────────────────────────────────────

class ClaimWindowBody(BaseModel):
    window: int

@router.get("/window-assignments")
def window_assignments(user=Depends(require_staff_or_admin)):
    """Get current window assignments and configured num_windows. Staff-accessible."""
    return get_window_assignments()


@router.post("/claim-window")
def claim_window_route(body: ClaimWindowBody, user=Depends(require_staff_or_admin)):
    """Staff claims a window. Rejects if taken or out of range."""
    return claim_window(user.id, body.window)


@router.delete("/release-window")
def release_window_route(user=Depends(require_staff_or_admin)):
    """Staff releases their window on logout."""
    return release_window(user.id)