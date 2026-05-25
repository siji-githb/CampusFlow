from fastapi import HTTPException
from config import get_settings
from supabase import create_client
from models.appointment_models import AppointmentCreate
from datetime import date, datetime, timedelta

settings = get_settings()


def get_admin():
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_transaction_types():
    admin = get_admin()
    try:
        res = admin.table("transaction_types").select("*").eq("is_active", True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_office_config():
    admin = get_admin()
    try:
        res = admin.table("office_config").select("*").execute()
        config = {row["key"]: row["value"] for row in res.data}
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def generate_time_slots(open_time: str, close_time: str, duration_minutes: int):
    slots = []
    open_dt = datetime.strptime(open_time, "%H:%M")
    close_dt = datetime.strptime(close_time, "%H:%M")
    current = open_dt
    while current < close_dt:
        slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=duration_minutes)
    return slots


def get_daily_cap(config: dict, transaction_type_name: str) -> int:
    name_lower = transaction_type_name.lower()
    if "transcript" in name_lower or "tor" in name_lower:
        return int(config.get("daily_cap_tor", 20))
    elif "enrollment" in name_lower or "coe" in name_lower:
        return int(config.get("daily_cap_coe", 30))
    elif "diploma" in name_lower:
        return int(config.get("daily_cap_diploma", 10))
    return 20


def get_available_slots(transaction_type_id: str, appointment_date: date):
    admin = get_admin()
    config = get_office_config()

    # Get transaction type
    try:
        tt_res = admin.table("transaction_types").select("*").eq("id", transaction_type_id).single().execute()
        tt = tt_res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Transaction type not found")

    daily_cap = get_daily_cap(config, tt["name"])
    open_time = config.get("office_open_time", "08:00")
    close_time = config.get("office_close_time", "17:00")
    duration = int(config.get("slot_duration_minutes", 30))

    all_slots = generate_time_slots(open_time, close_time, duration)

    # Get existing bookings for this date and type
    try:
        bookings_res = admin.table("appointments") \
            .select("time_slot") \
            .eq("transaction_type_id", transaction_type_id) \
            .eq("appointment_date", str(appointment_date)) \
            .neq("status", "cancelled") \
            .execute()
        booked_slots = [b["time_slot"] for b in bookings_res.data]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Count bookings per slot
    slot_counts = {}
    for slot in booked_slots:
        slot_counts[slot] = slot_counts.get(slot, 0) + 1

    # Total bookings today
    total_booked = len(booked_slots)
    slots_per_slot = max(1, daily_cap // len(all_slots)) if all_slots else 1

    result = []
    for slot in all_slots:
        booked_in_slot = slot_counts.get(slot, 0)
        remaining = max(0, slots_per_slot - booked_in_slot)
        result.append({
            "time_slot": slot,
            "available": remaining > 0 and total_booked < daily_cap,
            "remaining": remaining
        })

    return {
        "date": str(appointment_date),
        "transaction_type_id": transaction_type_id,
        "daily_cap": daily_cap,
        "total_booked": total_booked,
        "slots": result
    }


def create_appointment(student_id: str, priority_class: str, data: AppointmentCreate):
    admin = get_admin()
    config = get_office_config()

    # Check cutoff
    cutoff_days = int(config.get("booking_cutoff_days", 1))
    min_date = date.today() + timedelta(days=cutoff_days)
    if data.appointment_date < min_date:
        raise HTTPException(
            status_code=400,
            detail=f"Appointments must be booked at least {cutoff_days} day(s) in advance"
        )

    # Check if date is a weekday
    if data.appointment_date.weekday() >= 5:
        raise HTTPException(status_code=400, detail="Appointments can only be booked on weekdays")

    # Get transaction type
    try:
        tt_res = admin.table("transaction_types").select("*").eq("id", data.transaction_type_id).single().execute()
        tt = tt_res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Transaction type not found")

    daily_cap = get_daily_cap(config, tt["name"])

    # Check daily cap
    try:
        count_res = admin.table("appointments") \
            .select("id") \
            .eq("transaction_type_id", data.transaction_type_id) \
            .eq("appointment_date", str(data.appointment_date)) \
            .neq("status", "cancelled") \
            .execute()
        if len(count_res.data) >= daily_cap:
            raise HTTPException(status_code=400, detail="Daily appointment cap reached for this transaction type")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Check student doesn't already have appointment same day same type
    try:
        existing = admin.table("appointments") \
            .select("id") \
            .eq("student_id", student_id) \
            .eq("transaction_type_id", data.transaction_type_id) \
            .eq("appointment_date", str(data.appointment_date)) \
            .neq("status", "cancelled") \
            .execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="You already have an appointment for this transaction on this date")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Create appointment
    try:
        appt_res = admin.table("appointments").insert({
            "student_id": student_id,
            "transaction_type_id": data.transaction_type_id,
            "appointment_date": str(data.appointment_date),
            "time_slot": data.time_slot,
            "status": "confirmed",
            "priority_class": priority_class,
            "notes": data.notes
        }).execute()
        appt = appt_res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "message": "Appointment booked successfully",
        "appointment": appt
    }


def get_student_appointments(student_id: str):
    admin = get_admin()
    try:
        res = admin.table("appointments") \
            .select("*, transaction_types(name, processing_steps, required_documents)") \
            .eq("student_id", student_id) \
            .order("appointment_date", desc=True) \
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def cancel_appointment(appointment_id: str, student_id: str):
    admin = get_admin()

    # Verify ownership
    try:
        res = admin.table("appointments") \
            .select("*") \
            .eq("id", appointment_id) \
            .eq("student_id", student_id) \
            .single() \
            .execute()
        appt = res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt["status"] in ["completed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed or already cancelled appointment")

    # Check cutoff
    config = get_office_config()
    cutoff_days = int(config.get("booking_cutoff_days", 1))
    appt_date = date.fromisoformat(appt["appointment_date"])
    if date.today() >= appt_date - timedelta(days=cutoff_days):
        raise HTTPException(status_code=400, detail="Cannot cancel within the cutoff period")

    try:
        admin.table("appointments") \
            .update({"status": "cancelled"}) \
            .eq("id", appointment_id) \
            .execute()
        return {"message": "Appointment cancelled successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))