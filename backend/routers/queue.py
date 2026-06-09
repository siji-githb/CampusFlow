from fastapi import APIRouter, Header, HTTPException
from services.queue_service import (
    activate_queue,
    get_student_queue,
    confirm_step,
    get_todays_queue,
    get_time_estimate,
    get_live_queue_stats,
)
from models.queue_models import ConfirmStepRequest
from supabase import create_client
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/queue", tags=["Queue Management"])


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


@router.post("/activate/{appointment_id}")
def activate(appointment_id: str, authorization: str = Header(...)):
    user = get_current_user(authorization)
    return activate_queue(appointment_id, user.id)


@router.get("/my")
def my_queue(authorization: str = Header(...)):
    user = get_current_user(authorization)
    result = get_student_queue(user.id)
    if not result:
        return {"ticket": None, "steps": []}
    return result


@router.post("/confirm-step")
def confirm(data: ConfirmStepRequest, authorization: str = Header(...)):
    user = get_current_user(authorization)
    profile = get_user_profile(user.id)
    if profile["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Only staff can confirm steps")
    return confirm_step(data.queue_ticket_id, data.step_number, user.id)


@router.get("/today")
def todays_queue(authorization: str = Header(...)):
    user = get_current_user(authorization)
    profile = get_user_profile(user.id)
    if profile["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Only staff can view today's queue")
    return get_todays_queue()


@router.get("/live-stats")
def live_queue_stats(authorization: str = Header(...)):
    user = get_current_user(authorization)
    profile = get_user_profile(user.id)
    if profile["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Only staff can view queue stats")
    return get_live_queue_stats()


# ── M9: Queue Time Estimator ───────────────────────────────────────────────────

@router.get("/time-estimate/{appointment_id}")
def queue_time_estimate(appointment_id: str, authorization: str = Header(...)):
    """
    Returns estimated wait time per step for a given appointment.
    Student-only — validates ownership via student_id.
    """
    user = get_current_user(authorization)
    return get_time_estimate(appointment_id, user.id)