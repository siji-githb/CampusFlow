from fastapi import HTTPException
from supabase import create_client
from config import get_settings
from datetime import date, datetime, timezone
from services.admin_service import log_audit_action

settings = get_settings()


def get_admin():
    return create_client(settings.supabase_url, settings.supabase_service_key)


def generate_queue_number(transaction_name: str, count: int) -> str:
    if "transcript" in transaction_name.lower() or "tor" in transaction_name.lower():
        prefix = "TOR"
    elif "enrollment" in transaction_name.lower() or "coe" in transaction_name.lower():
        prefix = "COE"
    elif "diploma" in transaction_name.lower():
        prefix = "DIP"
    else:
        prefix = "TXN"
    return f"{prefix}-{str(count).zfill(3)}"


def activate_queue(appointment_id: str, student_id: str):
    """Called when a student arrives on their appointment day."""
    admin = get_admin()

    # Verify appointment belongs to student and is today
    try:
        appt_res = admin.table("appointments") \
            .select("*, transaction_types(name, processing_steps)") \
            .eq("id", appointment_id) \
            .eq("student_id", student_id) \
            .single() \
            .execute()
        appt = appt_res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt["status"] != "confirmed":
        raise HTTPException(status_code=400, detail="Appointment is not confirmed")

    if appt["appointment_date"] != str(date.today()):
        raise HTTPException(
            status_code=400,
            detail=f"Queue can only be activated on your appointment date ({appt['appointment_date']})"
        )

    # Check if queue ticket already exists
    existing = admin.table("queue_tickets") \
        .select("*") \
        .eq("appointment_id", appointment_id) \
        .execute()
    if existing.data:
        # Return existing ticket with steps
        ticket = existing.data[0]
        steps = admin.table("transaction_steps") \
            .select("*") \
            .eq("queue_ticket_id", ticket["id"]) \
            .order("step_number") \
            .execute()
        return {"ticket": ticket, "steps": steps.data}

    # Generate queue number
    tt = appt["transaction_types"]
    processing_steps = tt["processing_steps"] or []

    count_res = admin.table("queue_tickets") \
        .select("id") \
        .execute()
    queue_number = generate_queue_number(tt["name"], len(count_res.data) + 1)

    # Create queue ticket
    ticket_res = admin.table("queue_tickets").insert({
        "appointment_id": appointment_id,
        "student_id": student_id,
        "queue_number": queue_number,
        "current_step": 1,
        "total_steps": len(processing_steps),
        "status": "in_progress"
    }).execute()
    ticket = ticket_res.data[0]

    # Create transaction steps
    steps_to_insert = []
    for i, step_name in enumerate(processing_steps):
        steps_to_insert.append({
            "queue_ticket_id": ticket["id"],
            "step_number": i + 1,
            "step_name": step_name,
            "location": step_name.split(" - ")[0] if " - " in step_name else step_name,
            "status": "in_progress" if i == 0 else "pending"
        })

    steps_res = admin.table("transaction_steps").insert(steps_to_insert).execute()

    # Update appointment status
    admin.table("appointments") \
        .update({"status": "confirmed"}) \
        .eq("id", appointment_id) \
        .execute()

    return {"ticket": ticket, "steps": steps_res.data}


def get_student_queue(student_id: str):
    """Get active queue ticket for a student."""
    admin = get_admin()
    
    # Auto-cleanup stale tickets from previous days
    try:
        from datetime import date
        today_str = str(date.today())
        admin.table("queue_tickets") \
            .update({"status": "abandoned"}) \
            .eq("student_id", student_id) \
            .in_("status", ["waiting", "in_progress"]) \
            .lt("created_at", today_str) \
            .execute()
    except Exception:
        pass

    try:
        tickets_res = admin.table("queue_tickets") \
            .select("*, appointments(appointment_date, time_slot, status, transaction_types(name))") \
            .eq("student_id", student_id) \
            .in_("status", ["waiting", "in_progress"]) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not tickets_res.data:
            return None

        ticket = tickets_res.data[0]
        
        # If the underlying appointment was cancelled, abandon the ticket
        if ticket.get("appointments") and ticket["appointments"].get("status") == "cancelled":
            admin.table("queue_tickets").update({"status": "abandoned"}).eq("id", ticket["id"]).execute()
            return None
        steps_res = admin.table("transaction_steps") \
            .select("*") \
            .eq("queue_ticket_id", ticket["id"]) \
            .order("step_number") \
            .execute()

        return {"ticket": ticket, "steps": steps_res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def confirm_step(queue_ticket_id: str, step_number: int, staff_id: str):
    """Staff confirms a student's step is complete."""
    admin = get_admin()
    from datetime import datetime, timezone

    # Get the ticket
    try:
        ticket_res = admin.table("queue_tickets") \
            .select("*") \
            .eq("id", queue_ticket_id) \
            .single() \
            .execute()
        ticket = ticket_res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Queue ticket not found")

    # Get the step
    try:
        step_res = admin.table("transaction_steps") \
            .select("*") \
            .eq("queue_ticket_id", queue_ticket_id) \
            .eq("step_number", step_number) \
            .single() \
            .execute()
        step = step_res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Step not found")

    if step["status"] == "completed":
        raise HTTPException(status_code=400, detail="Step already completed")

    now = datetime.now(timezone.utc).isoformat()

    # Mark current step as completed
    admin.table("transaction_steps") \
        .update({
            "status": "completed",
            "confirmed_by": staff_id,
            "confirmed_at": now
        }) \
        .eq("id", step["id"]) \
        .execute()
        
    log_audit_action(
        user_id=staff_id,
        action=f"Confirmed Queue Step {step_number}",
        table_name="transaction_steps",
        record_id=step["id"],
        status="Success",
        changes=f"Step marked completed",
        severity="Info"
    )

    total_steps = ticket["total_steps"]
    next_step = step_number + 1

    if next_step > total_steps:
        # All steps done — complete the ticket and appointment
        admin.table("queue_tickets") \
            .update({"status": "completed", "current_step": total_steps}) \
            .eq("id", queue_ticket_id) \
            .execute()
        admin.table("appointments") \
            .update({"status": "completed"}) \
            .eq("id", ticket["appointment_id"]) \
            .execute()
        return {"message": "Transaction completed", "status": "completed"}
    else:
        # Advance to next step
        admin.table("queue_tickets") \
            .update({"current_step": next_step}) \
            .eq("id", queue_ticket_id) \
            .execute()
        admin.table("transaction_steps") \
            .update({"status": "in_progress"}) \
            .eq("queue_ticket_id", queue_ticket_id) \
            .eq("step_number", next_step) \
            .execute()
        return {"message": f"Step {step_number} confirmed. Moved to step {next_step}.", "status": "in_progress"}


def get_todays_queue(date_filter: str = None):
    """Get all active queue tickets for today — for staff dashboard."""
    admin = get_admin()
    today = date_filter or str(date.today())
    try:
        tickets_res = admin.table("queue_tickets") \
            .select("*, appointments(appointment_date, time_slot, transaction_types(name)), users(first_name, last_name, student_id)") \
            .order("created_at") \
            .execute()

        # Filter by today's appointments
        filtered = [
            t for t in tickets_res.data
            if t.get("appointments") and t["appointments"].get("appointment_date") == today
        ]

        result = []
        for ticket in filtered:
            steps_res = admin.table("transaction_steps") \
                .select("*") \
                .eq("queue_ticket_id", ticket["id"]) \
                .order("step_number") \
                .execute()
            result.append({"ticket": ticket, "steps": steps_res.data})

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── M9: Queue Time Estimator ───────────────────────────────────────────────────

def get_time_estimate(appointment_id: str, student_id: str):
    """
    Returns estimated wait time per step for a given appointment,
    calculated from historical transaction_steps confirmed_at timestamps.
    Falls back to 10 min per step if no history exists yet.
    """
    admin = get_admin()

    # Get appointment + transaction type info
    try:
        appt_res = admin.table("appointments") \
            .select("*, transaction_types(id, total_steps)") \
            .eq("id", appointment_id) \
            .eq("student_id", student_id) \
            .single() \
            .execute()
        appt = appt_res.data
    except Exception:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if not appt:
        return {"estimates": []}

    tx_type_id = appt["transaction_type_id"]
    total_steps = appt["transaction_types"]["total_steps"]

    # Pull historical confirmed steps for this transaction type
    history = admin.table("transaction_steps") \
        .select("step_number, created_at, confirmed_at") \
        .eq("transaction_type_id", tx_type_id) \
        .not_.is_("confirmed_at", "null") \
        .execute()

    from collections import defaultdict
    from datetime import datetime

    durations_by_step = defaultdict(list)
    for row in (history.data or []):
        try:
            start = datetime.fromisoformat(row["created_at"])
            end   = datetime.fromisoformat(row["confirmed_at"])
            mins  = (end - start).total_seconds() / 60
            if 0 < mins < 120:  # ignore outliers over 2 hours
                durations_by_step[row["step_number"]].append(mins)
        except Exception:
            pass

    estimates = []
    for step_num in range(1, total_steps + 1):
        d = durations_by_step.get(step_num, [])
        avg = round(sum(d) / len(d)) if d else 10  # 10 min fallback
        estimates.append({
            "step": step_num,
            "estimated_minutes": avg,
            "label": f"~{avg} min",
        })

    return {"estimates": estimates}


def get_live_queue_stats():
    """Get dynamic live queue stats like avg wait time and peak forecast."""
    try:
        admin = get_admin()
        today = str(date.today())
        from datetime import datetime

        # 1. Avg Wait Time
        recent_steps = admin.table("transaction_steps") \
            .select("created_at, confirmed_at") \
            .not_.is_("confirmed_at", "null") \
            .order("confirmed_at", desc=True) \
            .limit(50) \
            .execute()
            
        total_mins = 0
        valid_steps = 0
        for row in (recent_steps.data or []):
            try:
                start = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(row["confirmed_at"].replace("Z", "+00:00"))
                mins = (end - start).total_seconds() / 60
                if 0 < mins < 120:
                    total_mins += mins
                    valid_steps += 1
            except Exception:
                pass
                
        avg_mins = round(total_mins / valid_steps) if valid_steps > 0 else 8

        # 2. Peak Forecast
        today_appts = admin.table("appointments") \
            .select("time_slot") \
            .eq("appointment_date", today) \
            .execute()
            
        hour_counts = {}
        for appt in (today_appts.data or []):
            time_slot = appt.get("time_slot")
            if time_slot:
                hour = time_slot.split(":")[0]
                hour_counts[hour] = hour_counts.get(hour, 0) + 1
                
        peak_hour_str = "No Data"
        if hour_counts:
            best_hour = max(hour_counts, key=hour_counts.get)
            hr_int = int(best_hour)
            ampm = "AM" if hr_int < 12 else "PM"
            display_hr = hr_int if hr_int <= 12 else hr_int - 12
            if display_hr == 0: display_hr = 12
            peak_hour_str = f"{display_hr}:00 {ampm}"
            
        return {
            "avg_wait_minutes": avg_mins,
            "avg_wait_seconds": 0,
            "peak_forecast": peak_hour_str
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))