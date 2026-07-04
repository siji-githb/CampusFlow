from fastapi import APIRouter, Depends
from services.queue_service import (
    activate_queue,
    get_student_queue,
    confirm_step,
    get_todays_queue,
    get_time_estimate,
    get_live_queue_stats,
)
from models.queue_models import ConfirmStepRequest
from deps import get_current_user, require_staff_or_admin

router = APIRouter(prefix="/queue", tags=["Queue Management"])


@router.post("/activate/{appointment_id}")
def activate(appointment_id: str, user=Depends(get_current_user)):
    return activate_queue(appointment_id, user.id)


@router.get("/my")
def my_queue(user=Depends(get_current_user)):
    result = get_student_queue(user.id)
    if not result:
        return {"ticket": None, "steps": []}
    return result


@router.post("/confirm-step")
def confirm(data: ConfirmStepRequest, user=Depends(require_staff_or_admin)):
    return confirm_step(data.queue_ticket_id, data.step_number, user.id)


@router.get("/today")
def todays_queue(user=Depends(require_staff_or_admin)):
    return get_todays_queue()


@router.get("/live-stats")
def live_queue_stats(user=Depends(require_staff_or_admin)):
    return get_live_queue_stats()


# ── M9: Queue Time Estimator ───────────────────────────────────────────────────

@router.get("/time-estimate/{appointment_id}")
def queue_time_estimate(appointment_id: str, user=Depends(get_current_user)):
    """
    Returns estimated wait time per step for a given appointment.
    Student-only — validates ownership via student_id.
    """
    return get_time_estimate(appointment_id, user.id)