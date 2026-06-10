from fastapi import APIRouter, Header, HTTPException
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
)
from models.admin_models import OfficeConfigUpdate
from models.appointment_models import ReleaseDateUpdate
from pydantic import BaseModel
from services.appointment_service import get_all_appointments, update_appointment_status, set_release_date
from supabase import create_client
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/admin", tags=["Admin"])

class StatusUpdate(BaseModel):
    status: str


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


def require_admin(authorization: str):
    user = get_current_user(authorization)
    admin_client = create_client(settings.supabase_url, settings.supabase_service_key)
    try:
        profile = admin_client.table("users").select("role").eq("id", user.id).single().execute()
        if profile.data["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/stats")
def dashboard_stats(authorization: str = Header(...)):
    require_admin(authorization)
    return get_dashboard_stats()


@router.get("/reports")
def reports(days: int = 7, authorization: str = Header(...)):
    require_admin(authorization)
    return get_reports(days)


@router.get("/records")
def registrar_records(days: int = 30, authorization: str = Header(...)):
    require_admin(authorization)
    return get_registrar_records(days)


@router.get("/audit-log")
def audit_log(limit: int = 50, authorization: str = Header(...)):
    require_admin(authorization)
    return get_audit_log(limit)


@router.get("/office-config")
def office_config(authorization: str = Header(...)):
    require_admin(authorization)
    return get_office_config()


@router.patch("/office-config")
def update_config(data: OfficeConfigUpdate, authorization: str = Header(...)):
    user = require_admin(authorization)
    return update_office_config(data.key, data.value, user.id)


@router.get("/users")
def all_users(authorization: str = Header(...)):
    require_admin(authorization)
    return get_all_users()


@router.patch("/users/{user_id}/role")
def change_role(user_id: str, role: str, authorization: str = Header(...)):
    user = require_admin(authorization)
    return update_user_role(user_id, role, user.id)


@router.patch("/users/{user_id}/status")
def change_status(user_id: str, is_active: bool, authorization: str = Header(...)):
    user = require_admin(authorization)
    return toggle_user_status(user_id, is_active, user.id)


@router.get("/transaction-types")
def transaction_types(authorization: str = Header(...)):
    require_admin(authorization)
    return get_transaction_types()


@router.get("/appointments")
def all_appointments(date: str = None, authorization: str = Header(...)):
    require_admin(authorization)
    return get_all_appointments(date)


@router.patch("/appointments/{appointment_id}/status")
def change_appointment_status(appointment_id: str, data: StatusUpdate, authorization: str = Header(...)):
    user = require_admin(authorization)
    return update_appointment_status(appointment_id, data.status, user.id)


@router.patch("/appointments/{appointment_id}/release-date")
def update_release_date(appointment_id: str, data: ReleaseDateUpdate, authorization: str = Header(...)):
    user = require_admin(authorization)
    return set_release_date(appointment_id, data.release_date, user.id)



# ── M12: AI-Generated Admin Insights ─────────────────────────────────────────

@router.get("/insights")
def ai_insights(authorization: str = Header(...)):
    """Today's appointment stats + AI-generated summary for the Reports tab."""
    require_admin(authorization)
    return get_ai_insights()