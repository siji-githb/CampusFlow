from fastapi import HTTPException
from config import get_settings
from supabase import create_client
from models.appointment_models import AppointmentCreate
from datetime import date, datetime, timedelta
from services.admin_service import log_audit_action

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
        
        log_audit_action(
            user_id=student_id,
            action="Created new appointment",
            table_name="appointments",
            record_id=appt["id"],
            status="Success",
            changes=f"Date: {data.appointment_date}, Time: {data.time_slot}",
            severity="Info"
        )
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
            
        log_audit_action(
            user_id=student_id,
            action="Cancelled appointment",
            table_name="appointments",
            record_id=appointment_id,
            status="Success",
            changes="Status: confirmed ➔ cancelled",
            severity="Warning"
        )
        return {"message": "Appointment cancelled successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_all_appointments(date_str: str = None):
    admin = get_admin()
    try:
        query = admin.table("appointments") \
            .select("*, transaction_types(name), users(first_name, last_name, student_id)")
            
        if date_str:
            query = query.eq("appointment_date", date_str)
            
        res = query.order("time_slot", desc=False).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_appointment_stats():
    admin = get_admin()
    try:
        today = str(date.today())
        
        # Today's appointments
        res_today = admin.table("appointments").select("id").eq("appointment_date", today).execute()
        today_count = len(res_today.data) if res_today.data else 0
        
        # Completed today
        res_comp = admin.table("appointments").select("id").eq("appointment_date", today).eq("status", "completed").execute()
        comp_count = len(res_comp.data) if res_comp.data else 0
        
        # Total monthly volume
        month_start = str(date.today().replace(day=1))
        res_month = admin.table("appointments").select("id").gte("appointment_date", month_start).execute()
        month_count = len(res_month.data) if res_month.data else 0
        
        return {
            "today_appointments": today_count,
            "completed_today": comp_count,
            "total_monthly": month_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def reschedule_appointment(appointment_id: str, new_date: str, new_time: str, actor_id: str = None):
    admin = get_admin()
    try:
        res = admin.table("appointments").select("id, appointment_date, time_slot").eq("id", appointment_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Appointment not found")
            
        old_date = res.data[0]["appointment_date"]
        old_time = res.data[0]["time_slot"]
            
        admin.table("appointments").update({
            "appointment_date": new_date,
            "time_slot": new_time,
            "status": "pending" 
        }).eq("id", appointment_id).execute()
        
        if actor_id:
            log_audit_action(
                user_id=actor_id,
                action="Rescheduled appointment",
                table_name="appointments",
                record_id=appointment_id,
                status="Success",
                changes=f"From: {old_date} {old_time} ➔ To: {new_date} {new_time}",
                severity="Warning"
            )
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def update_appointment_status(appointment_id: str, status: str, actor_id: str = None):
    admin = get_admin()
    valid_statuses = ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"]
    
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
        
    try:
        res = admin.table("appointments").select("status").eq("id", appointment_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Appointment not found")
            
        old_status = res.data[0]["status"]
        
        admin.table("appointments").update({"status": status}).eq("id", appointment_id).execute()
        
        if actor_id and old_status != status:
            severity = "Info"
            if status in ["cancelled", "no_show"]:
                severity = "Warning"
                
            log_audit_action(
                user_id=actor_id,
                action=f"Updated appointment status",
                table_name="appointments",
                record_id=appointment_id,
                status="Success",
                changes=f"Status: {old_status} ➔ {status}",
                severity=severity
            )
            
        return {"success": True, "status": status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))