from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import uuid
from typing import Optional
from models.appointment_models import AppointmentCreate
from services.appointment_service import (
    get_transaction_types,
    get_available_slots,
    get_booking_config,
    create_appointment,
    get_student_appointments,
    cancel_appointment,
    get_all_appointments,
    get_appointment_stats,
    reschedule_appointment,
    clear_cancelled_appointments
)
from pydantic import BaseModel
from deps import get_current_user, get_user_profile, get_supabase_admin, require_staff_or_admin
from datetime import date

router = APIRouter(prefix="/appointments", tags=["Appointments"])


class RescheduleRequest(BaseModel):
    new_date: str
    new_time: str
    notes: Optional[str] = None


# ── Upload constraints ───────────────────────────────────────────────────────
MEDIA_BUCKET = "appointment-media"
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB
# Map allowed extensions to their real file-signature (magic bytes) and MIME type,
# so a file can't just be renamed to ".png" to slip past the extension check.
ALLOWED_UPLOAD_TYPES = {
    "png": {"signatures": [b"\x89PNG\r\n\x1a\n"], "content_type": "image/png"},
    "jpg": {"signatures": [b"\xff\xd8\xff"], "content_type": "image/jpeg"},
    "jpeg": {"signatures": [b"\xff\xd8\xff"], "content_type": "image/jpeg"},
}


@router.get("/transaction-types")
def list_transaction_types():
    return get_transaction_types()


@router.get("/booking-config")
def get_booking_config_endpoint():
    """Public endpoint — returns constraints students need before selecting a date."""
    return get_booking_config()


@router.get("/slots")
def available_slots(transaction_type_id: str, appointment_date: date):
    return get_available_slots(transaction_type_id, appointment_date)


@router.post("/book")
def book_appointment(data: AppointmentCreate, user=Depends(get_current_user)):
    from services.priority_service import sync_priority_status
    sync_priority_status(user.id)
    profile = get_user_profile(user.id)
    return create_appointment(user.id, profile["priority_class"], data)


@router.get("/all")
def all_appointments(date: str = None, user=Depends(require_staff_or_admin)):
    return get_all_appointments(date)


@router.get("/stats")
def appointment_stats(user=Depends(require_staff_or_admin)):
    return get_appointment_stats()


@router.patch("/{appointment_id}/reschedule")
def reschedule(appointment_id: str, data: RescheduleRequest, user=Depends(get_current_user)):
    profile = get_user_profile(user.id)
    return reschedule_appointment(appointment_id, data.new_date, data.new_time, user.id, profile["role"], data.notes)


@router.get("/my")
def my_appointments(user=Depends(get_current_user)):
    return get_student_appointments(user.id)


@router.patch("/{appointment_id}/cancel")
def cancel(appointment_id: str, user=Depends(get_current_user)):
    return cancel_appointment(appointment_id, user.id)


@router.delete("/clear-cancelled")
def clear_cancelled(user=Depends(get_current_user)):
    return clear_cancelled_appointments(user.id)


@router.post("/upload-media")
async def upload_media(file: UploadFile = File(...), user=Depends(get_current_user)):
    # 1. Extension must be one we recognize at all
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_UPLOAD_TYPES:
        raise HTTPException(status_code=400, detail="Only PNG or JPG files are allowed.")

    contents = await file.read()

    # 2. Enforce a size limit so a single upload can't exhaust storage/bandwidth
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds the 5MB size limit.")
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # 3. Verify the actual file content matches the claimed extension (magic-byte check),
    #    so a renamed .exe/.html can't pass itself off as a .png
    rule = ALLOWED_UPLOAD_TYPES[ext]
    if not any(contents.startswith(sig) for sig in rule["signatures"]):
        raise HTTPException(status_code=400, detail="File content does not match a valid PNG or JPG image.")

    # 4. Store in Supabase Storage rather than local disk — local disk on Render is
    #    ephemeral and will be wiped on every redeploy/restart.
    filename = f"{uuid.uuid4()}.{ext}"
    admin = get_supabase_admin()
    try:
        admin.storage.from_(MEDIA_BUCKET).upload(
            filename,
            contents,
            {"content-type": rule["content_type"]},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

    public_url = admin.storage.from_(MEDIA_BUCKET).get_public_url(filename)
    return {"url": public_url}