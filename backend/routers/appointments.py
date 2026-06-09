from fastapi import APIRouter, Header, HTTPException
from models.appointment_models import AppointmentCreate
from services.appointment_service import (
    get_transaction_types,
    get_available_slots,
    create_appointment,
    get_student_appointments,
    cancel_appointment,
    get_all_appointments,
    get_appointment_stats,
    reschedule_appointment
)
from pydantic import BaseModel

class RescheduleRequest(BaseModel):
    new_date: str
    new_time: str
from supabase import create_client
from config import get_settings
from datetime import date

settings = get_settings()
router = APIRouter(prefix="/appointments", tags=["Appointments"])


def get_current_user(authorization: str = Header(...)):
    """Extract and verify the student from the JWT token."""
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


@router.get("/transaction-types")
def list_transaction_types():
    return get_transaction_types()


@router.get("/slots")
def available_slots(transaction_type_id: str, appointment_date: date):
    return get_available_slots(transaction_type_id, appointment_date)


@router.post("/book")
def book_appointment(data: AppointmentCreate, authorization: str = Header(...)):
    user = get_current_user(authorization)
    profile = get_user_profile(user.id)
    return create_appointment(user.id, profile["priority_class"], data)


@router.get("/all")
def all_appointments(date: str = None, authorization: str = Header(...)):
    user = get_current_user(authorization)
    profile = get_user_profile(user.id)
    if profile["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Staff only")
    return get_all_appointments(date)


@router.get("/stats")
def appointment_stats(authorization: str = Header(...)):
    user = get_current_user(authorization)
    profile = get_user_profile(user.id)
    if profile["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Staff only")
    return get_appointment_stats()


@router.patch("/{appointment_id}/reschedule")
def reschedule(appointment_id: str, data: RescheduleRequest, authorization: str = Header(...)):
    user = get_current_user(authorization)
    profile = get_user_profile(user.id)
    if profile["role"] not in ["staff", "admin"]:
        raise HTTPException(status_code=403, detail="Staff only")
    return reschedule_appointment(appointment_id, data.new_date, data.new_time, user.id)


@router.get("/my")
def my_appointments(authorization: str = Header(...)):
    user = get_current_user(authorization)
    return get_student_appointments(user.id)


@router.patch("/{appointment_id}/cancel")
def cancel(appointment_id: str, authorization: str = Header(...)):
    user = get_current_user(authorization)
    return cancel_appointment(appointment_id, user.id)