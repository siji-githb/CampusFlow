from fastapi import HTTPException
from config import get_settings
from datetime import date, datetime, timezone
import threading
from services.admin_service import log_audit_action
from services.notification_service import create_system_notification
from deps import get_supabase_admin as get_admin

settings = get_settings()

# Prevents two concurrent activate_queue calls from reading the same daily count
# and generating duplicate queue numbers within a single process.
_queue_number_lock = threading.Lock()


def generate_queue_number(transaction_name: str, count: int) -> str:
    name = transaction_name.lower()
    if "transcript" in name or "tor" in name:
        prefix = "TOR"
    elif "enrollment" in name or "coe" in name:
        prefix = "COE"
    elif "diploma" in name:
        prefix = "DIP"
    elif "general weighted average" in name or "gwa" in name:
        prefix = "GWA"
    elif "completion form" in name and "request" in name:
        prefix = "CFR"
    elif "completion form" in name and "submission" in name:
        prefix = "CFS"
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

    # Queue number assignment strategy:
    #   1. _queue_number_lock guards concurrent requests within a single process.
    #   2. The retry loop handles races between different processes/replicas.
    #   3. For guarantee-level safety, a unique constraint on (queue_number, date(created_at))
    #      should be defined on the queue_tickets table in the database.
    _MAX_QNUM_RETRIES = 5
    ticket = None
    with _queue_number_lock:
        today_str = str(date.today())
        for attempt in range(_MAX_QNUM_RETRIES):
            # Re-read the live daily count on every attempt so a retried insert
            # uses the accurate post-collision count rather than a stale value.
            count_res = admin.table("queue_tickets") \
                .select("id", count="exact") \
                .gte("created_at", today_str) \
                .execute()
            daily_count = count_res.count if count_res.count is not None else len(count_res.data)
            queue_number = generate_queue_number(tt["name"], daily_count + 1)

            try:
                ticket_res = admin.table("queue_tickets").insert({
                    "appointment_id": appointment_id,
                    "student_id": student_id,
                    "queue_number": queue_number,
                    "current_step": 1,
                    "total_steps": len(processing_steps),
                    "status": "waiting"
                }).execute()
                ticket = ticket_res.data[0]
                break  # success — exit retry loop
            except Exception as e:
                err = str(e).lower()
                # Only retry on duplicate-key / unique-constraint violations.
                if attempt < _MAX_QNUM_RETRIES - 1 and ("duplicate" in err or "unique" in err or "23505" in err):
                    continue
                raise HTTPException(
                    status_code=409 if ("duplicate" in err or "unique" in err or "23505" in err) else 500,
                    detail="Could not assign a unique queue number. Please try again." if "duplicate" in err or "unique" in err else str(e)
                )


    # Create transaction steps
    # processing_steps entries may be plain strings (legacy) or
    # {"name": ..., "requires_presence": bool} objects (new format).
    # Legacy strings default to requires_presence=True to preserve current behavior.
    def _normalize_step(raw):
        if isinstance(raw, dict):
            return raw.get("name", ""), raw.get("requires_presence", True)
        return raw, True

    steps_to_insert = []
    step_names_only = []
    from datetime import datetime, timezone
    now_iso = datetime.now(timezone.utc).isoformat()
    
    for i, raw_step in enumerate(processing_steps):
        step_name, requires_presence = _normalize_step(raw_step)
        step_names_only.append(step_name)
        steps_to_insert.append({
            "queue_ticket_id": ticket["id"],
            "step_number": i + 1,
            "step_name": step_name,
            "location": step_name.split(" - ")[0] if " - " in step_name else step_name,
            "status": "in_progress" if i == 0 else "pending",
            "activated_at": now_iso if i == 0 else None,
        })

    steps_res = admin.table("transaction_steps").insert(steps_to_insert).execute()

    # Update appointment status
    admin.table("appointments") \
        .update({"status": "confirmed"}) \
        .eq("id", appointment_id) \
        .execute()

    # Trigger notification
    if processing_steps:
        _, first_requires_presence = _normalize_step(processing_steps[0])
    else:
        first_requires_presence = True
    first_message = (
        f"Your ticket {queue_number} has been generated. Please proceed to: {step_names_only[0]}."
        if first_requires_presence
        else f"Your ticket {queue_number} has been generated. Your request is being processed — we'll notify you when it's ready."
    )
    create_system_notification(
        user_id=student_id,
        title="Queue Activated",
        message=first_message,
        type="info"
    )

    return {"ticket": ticket, "steps": steps_res.data}


def get_student_queue(student_id: str):
    """Get active queue ticket for a student."""
    admin = get_admin()
    
    # Auto-cleanup stale tickets from previous days
    try:
        from datetime import date
        today_str = str(date.today())
        admin.table("queue_tickets") \
            .update({"status": "cancelled"}) \
            .eq("student_id", student_id) \
            .eq("status", "waiting") \
            .lt("created_at", today_str) \
            .execute()
    except Exception:
        pass

    try:
        today_str = str(date.today())
        tickets_res = admin.table("queue_tickets") \
            .select("*, appointments(appointment_date, time_slot, status, transaction_types(name))") \
            .eq("student_id", student_id) \
            .in_("status", ["waiting", "in_progress", "completed"]) \
            .or_(f"created_at.gte.{today_str},status.eq.in_progress") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not tickets_res.data:
            return None

        ticket = tickets_res.data[0]
        
        # If the underlying appointment was cancelled or deleted, abandon the ticket
        appt_status = ticket.get("appointments", {}).get("status")
        tx_name = ((ticket.get("appointments") or {}).get("transaction_types") or {}).get("name", "")
        if (ticket.get("appointments") and appt_status == "cancelled") or "(deleted" in tx_name:
            admin.table("queue_tickets").update({"status": "cancelled"}).eq("id", ticket["id"]).execute()
            return None
        steps_res = admin.table("transaction_steps") \
            .select("*") \
            .eq("queue_ticket_id", ticket["id"]) \
            .order("step_number") \
            .execute()

        return {"ticket": ticket, "steps": steps_res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def call_ticket(queue_ticket_id: str, staff_id: str):
    """Staff calls a ticket, assigning it to their current window."""
    admin = get_admin()
    
    # 1. Get staff's assigned window
    from services.admin_service import get_window_assignments
    assignments = get_window_assignments()
    window_num = assignments.get("assignments", {}).get(staff_id)
    window_label = f"Window {window_num}" if window_num else "Counter"

    # 2. Update ticket status to in_progress
    admin.table("queue_tickets").update({"status": "in_progress"}).eq("id", queue_ticket_id).execute()

    # 3. Update current step's location
    steps_res = admin.table("transaction_steps").select("*").eq("queue_ticket_id", queue_ticket_id).order("step_number").execute()
    steps = steps_res.data or []
    current_step = next((s for s in steps if s["status"] == "in_progress"), None)
    if current_step:
        admin.table("transaction_steps").update({"location": window_label}).eq("id", current_step["id"]).execute()

    # 4. Trigger notification
    try:
        ticket_res = admin.table("queue_tickets").select("queue_number, student_id").eq("id", queue_ticket_id).single().execute()
        if ticket_res.data:
            create_system_notification(
                user_id=ticket_res.data["student_id"],
                title="Ticket Called",
                message=f"Your ticket {ticket_res.data['queue_number']} has been called to {window_label}. Please proceed.",
                type="info"
            )
    except Exception:
        pass

    return {"message": "Ticket called successfully", "location": window_label}


def send_to_processing(queue_ticket_id: str, staff_id: str):
    """Staff moves a ticket to back-office processing without completing the step."""
    admin = get_admin()
    
    # 1. Check if ticket exists and is in_progress
    ticket_res = admin.table("queue_tickets").select("id, status").eq("id", queue_ticket_id).execute()
    if not ticket_res.data:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket = ticket_res.data[0]
    if ticket["status"] != "in_progress":
        raise HTTPException(status_code=400, detail=f"Cannot send to processing: Ticket is {ticket['status']}")
    
    # 2. Get current step
    steps_res = admin.table("transaction_steps").select("*").eq("queue_ticket_id", queue_ticket_id).order("step_number").execute()
    steps = steps_res.data or []
    current_step = next((s for s in steps if s["status"] == "in_progress"), None)
    
    if not current_step:
        raise HTTPException(status_code=400, detail="No in-progress step found for this ticket")
        
    if current_step["location"] == "Back Office":
        raise HTTPException(status_code=400, detail="Ticket is already in Back Office processing")

    # 3. Update current step's location to "Back Office"
    admin.table("transaction_steps").update({"location": "Back Office"}).eq("id", current_step["id"]).execute()

    return {"message": "Ticket sent to processing"}


def remind_student(queue_ticket_id: str, staff_id: str):
    """Sends a reminder to the student that their document is ready for release."""
    admin = get_admin()
    
    # Get ticket info
    ticket_res = admin.table("queue_tickets").select("student_id, queue_number").eq("id", queue_ticket_id).execute()
    if not ticket_res.data:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket = ticket_res.data[0]
    
    # 1. Get staff's assigned window
    from services.admin_service import get_window_assignments
    assignments = get_window_assignments()
    window_num = assignments.get("assignments", {}).get(staff_id)
    window_label = f"Window {window_num}" if window_num else "Counter"

    create_system_notification(
        user_id=ticket["student_id"],
        title="Document Ready for Release",
        message=f"Your ticket {ticket['queue_number']} is ready. Please proceed to {window_label} to claim your document.",
        type="info"
    )

    return {"message": "Reminder sent successfully"}


def confirm_step(queue_ticket_id: str, step_number: int, staff_id: str,
                 released_to: str = None, document_verified: bool = False):
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

    # Release-specific gate
    is_release_step = "Release" in step["step_name"]
    if is_release_step and not document_verified:
        raise HTTPException(status_code=400, detail="You must confirm the document is correct before releasing it.")

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
        
    audit_changes = "Step marked completed"
    if is_release_step:
        recipient_note = released_to.strip() if released_to and released_to.strip() else "student (self)"
        audit_changes = f"Document released to: {recipient_note}. Document verified correct: Yes."

    log_audit_action(
        user_id=staff_id,
        action=f"Confirmed Queue Step {step_number}",
        table_name="transaction_steps",
        record_id=step["id"],
        status="Success",
        changes=audit_changes,
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
            
        create_system_notification(
            user_id=ticket["student_id"],
            title="Transaction Completed",
            message=f"Your transaction {ticket['queue_number']} is fully complete. Thank you!",
            type="success"
        )
        return {"message": "Transaction completed", "status": "completed"}
    else:
        # Advance to next step
        admin.table("queue_tickets") \
            .update({"current_step": next_step}) \
            .eq("id", queue_ticket_id) \
            .execute()

        next_step_res = admin.table("transaction_steps") \
            .update({"status": "in_progress", "activated_at": datetime.now(timezone.utc).isoformat()}) \
            .eq("queue_ticket_id", queue_ticket_id) \
            .eq("step_number", next_step) \
            .execute()

        next_step_data = next_step_res.data[0] if next_step_res.data else {}
        next_requires_presence = next_step_data.get("requires_presence", True)
        next_step_name = next_step_data.get("step_name", f"Step {next_step}")

        if next_requires_presence:
            if "Release" in next_step_name or "Issuance" in next_step_name:
                from services.admin_service import get_window_assignments
                assignments = get_window_assignments()
                window_num = assignments.get("assignments", {}).get(staff_id)
                window_label = f"Window {window_num}" if window_num else "Counter"
                
                try:
                    appt_res = admin.table("appointments").select("transaction_types(name)").eq("id", ticket["appointment_id"]).single().execute()
                    tx_name = appt_res.data.get("transaction_types", {}).get("name") if appt_res.data else "document"
                except Exception:
                    tx_name = "document"
                
                message = f"Your {tx_name} for ticket {ticket['queue_number']} is ready for release. Please proceed to {window_label} to claim your document."
            else:
                message = f"Step {step_number} confirmed. Please proceed to: {next_step_name}."
        else:
            message = f"Step {step_number} confirmed. Your request is now being processed — no need to wait in line, we'll notify you when it's ready."

        create_system_notification(
            user_id=ticket["student_id"],
            title="Step Confirmed",
            message=message,
            type="info"
        )
        return {"message": f"Step {step_number} confirmed. Moved to step {next_step}.", "status": "in_progress"}


def get_todays_queue(date_filter: str = None):
    """Get all active queue tickets for today — for staff dashboard."""
    admin = get_admin()
    today = date_filter or str(date.today())
    try:
        # Use an inner join to filter by today's appointment date and fetch steps all at once
        tickets_res = admin.table("queue_tickets") \
            .select("*, appointments!inner(id, appointment_date, time_slot, priority_class, release_date, notes, transaction_types(name, processing_steps, required_documents)), users(first_name, last_name, student_id), transaction_steps(*)") \
            .in_("status", ["waiting", "in_progress", "completed", "no_show", "cancelled"]) \
            .or_(f"created_at.gte.{today},status.eq.in_progress") \
            .order("created_at") \
            .execute()

        result = []
        for ticket in tickets_res.data:
            tx_type = (ticket.get("appointments") or {}).get("transaction_types") or {}
            tx_name = tx_type.get("name", "")
            if "(deleted" in tx_name:
                continue
            
            processing_steps = tx_type.get("processing_steps") or []
            
            steps = ticket.pop("transaction_steps", [])
            # Sort steps locally by step_number
            steps = sorted(steps, key=lambda x: x.get("step_number", 0))
            
            # Stitch requires_presence from processing_steps JSON into transaction_steps
            for i, step in enumerate(steps):
                if i < len(processing_steps):
                    raw_step = processing_steps[i]
                    if isinstance(raw_step, dict):
                        step["requires_presence"] = raw_step.get("requires_presence", True)
                    else:
                        step["requires_presence"] = True
                else:
                    step["requires_presence"] = True

            # Filter out tickets that are in Release step and already have a release date set
            # (These should only show up in DocumentReleasesPage "Uncollected")
            active_step = next((s for s in steps if s["status"] == "in_progress"), None)
            if active_step and "Release" in active_step.get("step_name", ""):
                appt_data = ticket.get("appointments") or {}
                if appt_data.get("release_date"):
                    continue

            result.append({"ticket": ticket, "steps": steps})

        def get_priority_weight(ticket_item):
            status = ticket_item.get("status")
            if status == "in_progress":
                return -2  # In-progress tickets stay at the top
            
            priority = ticket_item.get("appointments", {}).get("priority_class", "regular")
            if priority in ["pwd", "pregnant", "alumni"]:
                return -1 # Priority tickets come next
            return 0 # Regular tickets

        # Python's sort is stable, so chronological order from DB is preserved within same priority
        result.sort(key=lambda x: get_priority_weight(x["ticket"]))

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
            .select("*, transaction_types(id, processing_steps)") \
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
    total_steps = len(appt["transaction_types"].get("processing_steps") or [])

    ticket_ids_res = admin.table("queue_tickets") \
        .select("id, appointments!inner(transaction_type_id)") \
        .eq("appointments.transaction_type_id", tx_type_id) \
        .not_.is_("appointment_id", "null") \
        .execute()

    matching_ticket_ids = [row["id"] for row in (ticket_ids_res.data or [])]

    history_data = []
    if matching_ticket_ids:
        # Fetch steps in batches to stay within PostgREST URL length limits
        batch_size = 100
        for i in range(0, len(matching_ticket_ids), batch_size):
            batch = matching_ticket_ids[i:i + batch_size]
            res = admin.table("transaction_steps") \
                .select("step_number, created_at, confirmed_at") \
                .in_("queue_ticket_id", batch) \
                .not_.is_("confirmed_at", "null") \
                .execute()
            history_data.extend(res.data or [])

    from collections import defaultdict
    from datetime import datetime

    durations_by_step = defaultdict(list)
    for row in history_data:
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

        # 1. Avg Wait Time — computed from real step durations
        recent_steps = admin.table("transaction_steps") \
            .select("created_at, confirmed_at") \
            .not_.is_("confirmed_at", "null") \
            .neq("location", "Back Office") \
            .order("confirmed_at", desc=True) \
            .limit(50) \
            .execute()
            
        total_seconds = 0
        valid_steps = 0
        for row in (recent_steps.data or []):
            try:
                start = datetime.fromisoformat(row["created_at"].replace("Z", "+00:00"))
                end = datetime.fromisoformat(row["confirmed_at"].replace("Z", "+00:00"))
                secs = (end - start).total_seconds()
                if 0 < secs < 7200:  # ignore outliers over 2 hours
                    total_seconds += secs
                    valid_steps += 1
            except Exception:
                pass

        # Default fallback: 8 minutes (480 seconds) when no history exists yet
        avg_total_secs = round(total_seconds / valid_steps) if valid_steps > 0 else 480
        avg_mins = avg_total_secs // 60
        avg_secs = avg_total_secs % 60

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
            "avg_wait_seconds": avg_secs,
            "peak_forecast": peak_hour_str
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def get_uncollected_documents(threshold_days: int = 0):
    """
    Returns tickets currently sitting at a Release step (ready for
    pickup) that have been waiting longer than threshold_days,
    sorted longest-waiting first.
    """
    from datetime import datetime, timezone, timedelta
    admin = get_admin()

    threshold_date = (datetime.now(timezone.utc) - timedelta(days=threshold_days)).isoformat()

    try:
        res = admin.table("transaction_steps") \
            .select("*, queue_tickets(id, queue_number, student_id, "
                    "users(first_name, last_name, student_id), "
                    "appointments(transaction_types(name), priority_class, release_date))") \
            .ilike("step_name", "%Release%") \
            .eq("status", "in_progress") \
            .lt("activated_at", threshold_date) \
            .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    results = []
    now = datetime.now(timezone.utc)
    for row in (res.data or []):
        try:
            activated = datetime.fromisoformat(row["activated_at"].replace("Z", "+00:00"))
            days_waiting = (now - activated).days
        except Exception:
            days_waiting = None

        ticket = row.get("queue_tickets") or {}
        student = ticket.get("users") or {}
        appt = ticket.get("appointments") or {}
        
        # Only show in Document Releases if the release date has been set
        if not appt.get("release_date"):
            continue
            
        raw_tx_name = (appt.get("transaction_types") or {}).get("name", "Unknown")
        if "(deleted" in raw_tx_name:
            continue
        tx_name = raw_tx_name

        results.append({
            "queue_ticket_id": ticket.get("id"),
            "queue_number": ticket.get("queue_number"),
            "student_name": f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
            "student_id": student.get("student_id"),
            "transaction_type": tx_name,
            "days_waiting": days_waiting,
            "activated_at": row.get("activated_at"),
            "step_number": row.get("step_number"),
            "priority_class": appt.get("priority_class"),
            "release_date": appt.get("release_date"),
        })

    results.sort(key=lambda r: r["days_waiting"] or 0, reverse=True)
    return results


def get_collected_documents(limit: int = 50):
    """
    Returns tickets that have been successfully released (completed Release step).
    """
    admin = get_admin()
    try:
        res = admin.table("transaction_steps") \
            .select("*, queue_tickets(id, queue_number, student_id, "
                    "users(first_name, last_name, student_id), "
                    "appointments(transaction_types(name), priority_class, release_date))") \
            .ilike("step_name", "%Release%") \
            .eq("status", "completed") \
            .order("confirmed_at", desc=True) \
            .limit(limit) \
            .execute()
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

    results = []
    for row in (res.data or []):
        ticket = row.get("queue_tickets") or {}
        student = ticket.get("users") or {}
        appt = ticket.get("appointments") or {}
        raw_tx_name = (appt.get("transaction_types") or {}).get("name", "Unknown")
        if "(deleted" in raw_tx_name:
            continue
        tx_name = raw_tx_name

        results.append({
            "queue_ticket_id": ticket.get("id"),
            "queue_number": ticket.get("queue_number"),
            "student_name": f"{student.get('first_name', '')} {student.get('last_name', '')}".strip(),
            "student_id": student.get("student_id"),
            "transaction_type": tx_name,
            "confirmed_at": row.get("confirmed_at"),
            "released_to": row.get("released_to"),
            "priority_class": appt.get("priority_class"),
            "release_date": appt.get("release_date"),
        })

    return results


def get_my_documents_to_claim(student_id: str):
    """
    Returns tickets for a specific student that are currently sitting at a Release step (ready for pickup).
    """
    admin = get_admin()
    try:
        res = admin.table("transaction_steps") \
            .select("*, queue_tickets!inner(id, queue_number, student_id, status, appointments(transaction_types(name), release_date))") \
            .eq("queue_tickets.student_id", student_id) \
            .eq("queue_tickets.status", "in_progress") \
            .ilike("step_name", "%Release%") \
            .eq("status", "in_progress") \
            .execute()
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))

    results = []
    for row in (res.data or []):
        ticket = row.get("queue_tickets") or {}
        raw_tx_name = ((ticket.get("appointments") or {}).get("transaction_types") or {}).get("name", "Unknown")
        if "(deleted" in raw_tx_name:
            continue
        tx_name = raw_tx_name
        release_date = (ticket.get("appointments") or {}).get("release_date")

        results.append({
            "queue_ticket_id": ticket.get("id"),
            "queue_number": ticket.get("queue_number"),
            "transaction_type": tx_name,
            "release_date": release_date,
            "step_name": row.get("step_name"),
            "location": row.get("location"),
        })

    return results


def get_public_live_queue():
    """
    Get all active queue tickets currently being served.
    Returns only non-PII data (queue number, location, type).
    For the student dashboard 'Now Serving' view.
    """
    admin = get_admin()
    today = str(date.today())
    try:
        # Fetch tickets currently in progress for today
        tickets_res = admin.table("queue_tickets") \
            .select("id, queue_number, appointments!inner(transaction_types(name)), transaction_steps(status, location)") \
            .eq("status", "in_progress") \
            .gte("created_at", today) \
            .execute()
            
        results = []
        for ticket in tickets_res.data:
            # Find the active step to get the counter/location
            steps = ticket.get("transaction_steps", [])
            active_step = next((s for s in steps if s.get("status") == "in_progress"), None)
            
            location = active_step.get("location") if active_step else "Processing"
            raw_tx_name = ((ticket.get("appointments") or {}).get("transaction_types") or {}).get("name", "Transaction")
            if "(deleted" in raw_tx_name:
                continue
            tx_name = raw_tx_name
            
            results.append({
                "queue_ticket_id": ticket.get("id"),
                "queue_number": ticket.get("queue_number"),
                "transaction_type": tx_name,
                "location": location
            })
            
        results.sort(key=lambda x: x["queue_number"])
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
