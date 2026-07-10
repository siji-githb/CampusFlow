from fastapi import HTTPException
from config import get_settings
from models.appointment_models import AppointmentCreate
from datetime import date, datetime, timedelta
from services.admin_service import log_audit_action
from services.notification_service import create_system_notification
from deps import get_supabase_admin as get_admin

settings = get_settings()

# Sentinel so the global auto-cancel only fires once per calendar day,
# not on every API request (which would add a write to every GET call).
_last_global_cleanup_date: str = ""


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


# ── UPDATED: Slot generation (lunch breaks & processing time) ──
def generate_time_slots(open_time: str, close_time: str, duration_minutes: int, lunch_start: str = "12:00", lunch_end: str = "13:00"):
    slots = []
    open_dt = datetime.strptime(open_time, "%H:%M")
    close_dt = datetime.strptime(close_time, "%H:%M")
    lunch_start_dt = datetime.strptime(lunch_start, "%H:%M")
    lunch_end_dt = datetime.strptime(lunch_end, "%H:%M")
    
    current = open_dt
    while current < close_dt:
        if not (lunch_start_dt <= current < lunch_end_dt):
            slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=duration_minutes)
    return slots


# ── UPDATED: Fetch availability dynamically using new capacity check logic ──
def get_available_slots(transaction_type_id: str, appointment_date: date):
    admin = get_admin()
    config = get_office_config()

    # Get transaction type
    try:
        tt_res = admin.table("transaction_types").select("*").eq("id", transaction_type_id).single().execute()
        tt = tt_res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Transaction type not found")

    staff_count = int(config.get("staff_count", 2))
    lunch_start = config.get("lunch_break_start", "12:00")
    lunch_end = config.get("lunch_break_end", "13:00")
    open_time = config.get("office_open_time", "08:00")
    close_time = config.get("office_close_time", "17:00")
    
    # Use processing time from transaction type or default
    duration = tt.get("processing_time", int(config.get("slot_duration_minutes", 30)))

    all_slots = generate_time_slots(open_time, close_time, duration, lunch_start, lunch_end)
    daily_cap = len(all_slots) * staff_count

    # Get existing bookings for this date across ALL types (capacity is shared by staff)
    try:
        bookings_res = admin.table("appointments") \
            .select("time_slot") \
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

    total_booked = len(booked_slots)

    result = []
    for slot in all_slots:
        booked_in_slot = slot_counts.get(slot, 0)
        remaining = max(0, staff_count - booked_in_slot)
        result.append({
            "time_slot": slot,
            "available": remaining > 0,
            "remaining": remaining
        })

    return {
        "date": str(appointment_date),
        "transaction_type_id": transaction_type_id,
        "daily_cap": daily_cap,
        "total_booked": total_booked,
        "slots": result
    }


# ── UPDATED: Capacity check based on new slots and staff_count logic ──
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
    if data.appointment_date.weekday() == 6:
        raise HTTPException(status_code=400, detail="Appointments cannot be booked on Sundays")

    # Get transaction type
    try:
        tt_res = admin.table("transaction_types").select("*").eq("id", data.transaction_type_id).single().execute()
        tt = tt_res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Transaction type not found")

    staff_count = int(config.get("staff_count", 2))

    # Check slot capacity across ALL transaction types at that exact time
    try:
        count_res = admin.table("appointments") \
            .select("id") \
            .eq("appointment_date", str(data.appointment_date)) \
            .eq("time_slot", data.time_slot) \
            .neq("status", "cancelled") \
            .execute()
        if len(count_res.data) >= staff_count:
            raise HTTPException(status_code=400, detail="This time slot is full")
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
        
        # Format time to 12-hour AM/PM
        try:
            ts = data.time_slot[:5]
            t_obj = datetime.strptime(ts, "%H:%M")
            formatted_time = t_obj.strftime("%I:%M %p").lstrip("0")
        except Exception:
            formatted_time = data.time_slot
            
        # Trigger notification
        create_system_notification(
            user_id=student_id,
            title="Appointment Confirmed",
            message=f"Your appointment for {tt['name']} on {data.appointment_date} at {formatted_time} is confirmed.",
            type="success"
        )
        
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
    
    # Auto-cancel past appointments for this student
    try:
        today_str = str(date.today())
        admin.table("appointments") \
            .update({"status": "cancelled"}) \
            .in_("status", ["pending", "confirmed"]) \
            .lt("appointment_date", today_str) \
            .eq("student_id", student_id) \
            .execute()
    except Exception:
        pass

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

    # Removed cutoff check so students can cancel at any time

    try:
        admin.table("appointments") \
            .update({"status": "cancelled"}) \
            .eq("id", appointment_id) \
            .execute()
            
        # Automatically mark the confirmation notification as read
        try:
            admin.table("notifications") \
                .update({"is_read": True}) \
                .eq("user_id", student_id) \
                .eq("title", "Appointment Confirmed") \
                .eq("is_read", False) \
                .ilike("message", f"%{appt['appointment_date']}%") \
                .execute()
        except Exception as e:
            pass
            
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


def clear_cancelled_appointments(student_id: str):
    admin = get_admin()
    try:
        res = admin.table("appointments") \
            .delete() \
            .eq("student_id", student_id) \
            .eq("status", "cancelled") \
            .execute()
            
        log_audit_action(
            user_id=student_id,
            action="Cleared cancelled appointments",
            table_name="appointments",
            record_id="Multiple",
            status="Success",
            changes=f"Deleted {len(res.data)} cancelled records",
            severity="Info"
        )
        return {"message": f"Successfully cleared {len(res.data)} cancelled appointments"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_all_appointments(date_str: str = None):
    global _last_global_cleanup_date
    admin = get_admin()

    # Auto-cancel all past appointments globally — runs at most once per calendar day
    try:
        today_str = str(date.today())
        if _last_global_cleanup_date != today_str:
            admin.table("appointments") \
                .update({"status": "cancelled"}) \
                .in_("status", ["pending", "confirmed"]) \
                .lt("appointment_date", today_str) \
                .execute()
            _last_global_cleanup_date = today_str
    except Exception:
        pass

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


def reschedule_appointment(appointment_id: str, new_date: str, new_time: str, actor_id: str = None, role: str = None, notes: str = None):
    admin = get_admin()
    config = get_office_config()
    try:
        res = admin.table("appointments").select("id, appointment_date, time_slot, status, student_id").eq("id", appointment_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Appointment not found")
            
        appt = res.data[0]
        
        if role == "student" and appt.get("student_id") != actor_id:
            raise HTTPException(status_code=403, detail="Not authorized to reschedule this appointment")
            
        old_date = appt["appointment_date"]
        old_time = appt["time_slot"]
        current_status = appt["status"]
        
        staff_count = int(config.get("staff_count", 2))
        count_res = admin.table("appointments") \
            .select("id") \
            .eq("appointment_date", new_date) \
            .eq("time_slot", new_time) \
            .neq("status", "cancelled") \
            .execute()
            
        if len(count_res.data) >= staff_count:
            raise HTTPException(status_code=400, detail="This time slot is full")
            
        update_data = {
            "appointment_date": new_date,
            "time_slot": new_time,
            "status": current_status
        }
        if notes is not None:
            update_data["notes"] = notes
            
        admin.table("appointments").update(update_data).eq("id", appointment_id).execute()
        
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
    except HTTPException:
        raise
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


def set_release_date(appointment_id: str, release_date: str, actor_id: str = None):
    admin = get_admin()
    try:
        res = admin.table("appointments").select("release_date").eq("id", appointment_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Appointment not found")
            
        old_date = res.data[0].get("release_date")
        
        admin.table("appointments").update({"release_date": release_date}).eq("id", appointment_id).execute()
        
        if actor_id and old_date != release_date:
            log_audit_action(
                user_id=actor_id,
                action="Set document release date",
                table_name="appointments",
                record_id=appointment_id,
                status="Success",
                changes=f"Release Date: {old_date or 'None'} ➔ {release_date}",
                severity="Info"
            )
            
        return {"success": True, "release_date": release_date}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))