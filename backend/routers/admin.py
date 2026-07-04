from fastapi import APIRouter, Depends
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