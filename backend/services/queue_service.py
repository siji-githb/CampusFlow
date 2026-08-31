from fastapi import HTTPException
from config import get_settings
from datetime import date, datetime, timezone
import threading
from services.admin_service import log_audit_action
from services.notification_service import create_system_notification
from services.websocket_manager import manager
from deps import get_supabase_admin as get_admin

settings = get_settings()

# Prevents two concurrent activate_queue calls from reading the same daily count
# and generating duplicate queue numbers within a single process.
_queue_number_lock = threading.Lock()


def get_transaction_prefix(transaction_name: str) -> str:
    name = transaction_name.lower()
    if "transcript" in name or "tor" in name:
        return "TOR"
    elif "enrollment" in name or "coe" in name:
        return "COE"
    elif "diploma" in name:
        return "DIP"
    elif "general weighted average" in name or "gwa" in name:
        return "GWA"
    elif "completion form" in name and "request" in name:
        return "CFR"
    elif "completion form" in name and "submission" in name:
        return "CFS"
    elif "certificate of registration" in name or "cor" in name:
        return "COR"
    return "TXN"


def generate_queue_number(transaction_name: str, count: int) -> str:
    prefix = get_transaction_prefix(transaction_name)
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
        ticket = existing.data[0]
        # If it was previously marked cancelled, reactivate it back to waiting
        if ticket.get("status") == "cancelled":
            admin.table("queue_tickets").update({"status": "waiting"}).eq("id", ticket["id"]).execute()
            ticket["status"] = "waiting"
        steps = admin.table("transaction_steps") \
            .select("*") \
            .eq("queue_ticket_id", ticket["id"]) \
            .order("step_number") \
            .execute()
        return {"ticket": ticket, "steps": steps.data}

    # Generate queue number
    tt = appt["transaction_types"]
    processing_steps = tt["processing_steps"] or []
    prefix = get_transaction_prefix(tt.get("name", ""))

    # Queue number assignment strategy:
    # 1. _queue_number_lock guards concurrent requests within a single process.
    # 2. Inspect existing queue numbers for today (in both local and UTC dates) with this prefix to find the max sequence.
    # 3. Increment sequence dynamically on each attempt.
    _MAX_QNUM_RETRIES = 10
    ticket = None
    with _queue_number_lock:
        utc_today_str = datetime.now(timezone.utc).date().isoformat()
        
        for attempt in range(_MAX_QNUM_RETRIES):
            # Find all tickets created today with matching prefix
            existing_res = admin.table("queue_tickets") \
                .select("queue_number") \
                .gte("created_at", utc_today_str) \
                .ilike("queue_number", f"{prefix}-%") \
                .execute()
            
            max_num = 0
            for row in (existing_res.data or []):
                qnum = row.get("queue_number", "")
                try:
                    num_part = int(qnum.split("-")[1])
                    if num_part > max_num:
                        max_num = num_part
                except (IndexError, ValueError):
                    pass

            candidate_num = max_num + 1 + attempt
            queue_number = f"{prefix}-{str(candidate_num).zfill(3)}"

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
                # Retry on duplicate-key / unique-constraint violations
                if attempt < _MAX_QNUM_RETRIES - 1 and ("duplicate" in err or "unique" in err or "23505" in err):
                    continue
                raise HTTPException(
                    status_code=409 if ("duplicate" in err or "unique" in err or "23505" in err) else 500,
                    detail="Could not assign a unique queue number. Please try again." if ("duplicate" in err or "unique" in err or "23505" in err) else str(e)
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
    now_iso = datetime.now(timezone.utc).isoformat()
    
    for i, raw_step in enumerate(processing_steps):
        step_name, requires_presence = _normalize_step(raw_step)
        step_names_only.append(step_name)
        step_lower = step_name.lower()
        if "preparation" in step_lower or "prepared" in step_lower or "verification" in step_lower or not requires_presence:
            loc = "Back Office"
        elif "release" in step_lower or "claim" in step_lower or "pickup" in step_lower:
            loc = "Window 2"
        elif "receipt" in step_lower or "payment" in step_lower or "submission" in step_lower:
            loc = "Window 1"
        else:
            loc = step_name.split(" - ")[0] if " - " in step_name else "Counter"

        steps_to_insert.append({
            "queue_ticket_id": ticket["id"],
            "step_number": i + 1,
            "step_name": step_name,
            "location": loc,
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
    tx_name = tt.get("name", "document")
    if processing_steps:
        _, first_requires_presence = _normalize_step(processing_steps[0])
    else:
        first_requires_presence = True

    if first_requires_presence:
        first_message = (
            f"Your queue ticket {queue_number} has been generated for {tx_name}. "
            f"Please monitor your queue status and wait for your number to be called."
        )
    else:
        first_message = (
            f"Your queue ticket {queue_number} has been generated for {tx_name}. "
            f"Your request is now being processed in the back office — we'll notify you when it's ready."
        )

    create_system_notification(
        user_id=student_id,
        title="Queue Activated",
        message=first_message,
        type="info",
    )

    manager.broadcast_staff_event("QUEUE_UPDATED")

    return {"ticket": ticket, "steps": steps_res.data}


def get_student_queue(student_id: str):
    """Get active queue ticket for a student."""
    admin = get_admin()
    
    try:
        from datetime import date
        today_str = str(date.today())
        
        # 1. Fetch tickets for this student ordered by creation date
        tickets_res = admin.table("queue_tickets") \
            .select("*, appointments(id, appointment_date, time_slot, status, release_date, transaction_types(name))") \
            .eq("student_id", student_id) \
            .in_("status", ["waiting", "in_progress", "completed"]) \
            .order("created_at", desc=True) \
            .execute()

        if not tickets_res.data:
            return None

        # 2. Filter out deleted or cancelled tickets
        valid_tickets = []
        for t in tickets_res.data:
            appt = t.get("appointments") or {}
            appt_status = appt.get("status")
            tx_name = (appt.get("transaction_types") or {}).get("name", "")
            
            # If the queue ticket itself is cancelled or deleted transaction type, skip
            if t.get("status") == "cancelled" or "(deleted" in tx_name:
                continue

            # If appointment was explicitly cancelled AND the ticket is not active, skip
            if appt_status == "cancelled" and t.get("status") not in ["waiting", "in_progress"]:
                continue
                
            valid_tickets.append(t)

        if not valid_tickets:
            return None

        # 3. Pick the active ticket:
        # Priority 1: Any active queue ticket currently waiting or in_progress (persists across days)
        active_ticket = None
        for t in valid_tickets:
            if t["status"] in ["waiting", "in_progress"]:
                active_ticket = t
                break

        # Priority 2: Check if any ticket has transaction steps that are still in_progress
        if not active_ticket:
            for t in valid_tickets:
                steps_check = admin.table("transaction_steps") \
                    .select("id, status, step_name") \
                    .eq("queue_ticket_id", t["id"]) \
                    .execute()
                steps_list = steps_check.data or []
                has_in_progress_step = any(s.get("status") == "in_progress" for s in steps_list)
                if has_in_progress_step:
                    active_ticket = t
                    if t["status"] != "in_progress":
                        admin.table("queue_tickets").update({"status": "in_progress"}).eq("id", t["id"]).execute()
                        t["status"] = "in_progress"
                    break

        # Priority 3: Latest completed ticket (persists so student is never left with a blank wiped screen)
        if not active_ticket:
            for t in valid_tickets:
                if t["status"] == "completed":
                    active_ticket = t
                    break

        if not active_ticket:
            return None

        # Ensure appointment status is confirmed for active ticket
        if active_ticket and active_ticket.get("status") in ["waiting", "in_progress"]:
            appt = active_ticket.get("appointments") or {}
            if appt.get("status") == "cancelled" and active_ticket.get("appointment_id"):
                admin.table("appointments").update({"status": "confirmed"}).eq("id", active_ticket["appointment_id"]).execute()
                if "appointments" in active_ticket and isinstance(active_ticket["appointments"], dict):
                    active_ticket["appointments"]["status"] = "confirmed"

        ticket = active_ticket
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
        ticket_res = admin.table("queue_tickets").select("queue_number, student_id, appointments(transaction_types(name))").eq("id", queue_ticket_id).single().execute()
        if ticket_res.data:
            q_num = ticket_res.data.get("queue_number", "")
            tx_name = ((ticket_res.data.get("appointments") or {}).get("transaction_types") or {}).get("name", "")
            tx_label = f" for {tx_name}" if tx_name else ""
            create_system_notification(
                user_id=ticket_res.data["student_id"],
                title=f"Now Serving • Ticket {q_num}",
                message=f"Your ticket {q_num}{tx_label} has been called to {window_label}. Please proceed to the window to be served.",
                type="info"
            )
            
            log_audit_action(
                user_id=staff_id,
                action="Called queue ticket",
                table_name="queue_tickets",
                record_id=queue_ticket_id,
                status="Success",
                changes=f"Called ticket {ticket_res.data.get('queue_number')} to {window_label}",
                severity="Info"
            )
    except Exception:
        pass

    manager.broadcast_staff_event("QUEUE_UPDATED")

    return {"message": "Ticket called successfully", "location": window_label}


def send_to_processing(queue_ticket_id: str, staff_id: str):
    """Staff moves a ticket to back-office processing without completing the step."""
    admin = get_admin()
    
    # 1. Check if ticket exists and is in_progress
    ticket_res = admin.table("queue_tickets").select("id, status, queue_number").eq("id", queue_ticket_id).execute()
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

    log_audit_action(
        user_id=staff_id,
        action="Routed ticket to back-office",
        table_name="transaction_steps",
        record_id=current_step["id"],
        status="Success",
        changes=f"Ticket {ticket.get('queue_number', '')} step '{current_step.get('step_name', '')}' shifted to Back Office",
        severity="Info"
    )

    manager.broadcast_staff_event("QUEUE_UPDATED")

    return {"message": "Ticket sent to processing"}


def remind_student(queue_ticket_id: str, staff_id: str):
    """Sends a reminder to the student that their document is ready for release."""
    admin = get_admin()
    
    # Get ticket info
    ticket_res = admin.table("queue_tickets").select("student_id, queue_number, appointments(transaction_types(name))").eq("id", queue_ticket_id).execute()
    if not ticket_res.data:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    ticket = ticket_res.data[0]
    tx_name = ((ticket.get("appointments") or {}).get("transaction_types") or {}).get("name", "document")
    
    create_system_notification(
        user_id=ticket["student_id"],
        title="Document Ready for Release",
        message=f"Reminder: Your {tx_name} (Ticket {ticket['queue_number']}) is ready for pickup. Please proceed to the Registrar's Office to claim your document.",
        type="info"
    )

    log_audit_action(
        user_id=staff_id,
        action="Sent student reminder",
        table_name="queue_tickets",
        record_id=queue_ticket_id,
        status="Success",
        changes=f"Reminder sent for ticket {ticket.get('queue_number')} ({tx_name})",
        severity="Info"
    )

    manager.broadcast_staff_event("RELEASES_UPDATED")
    manager.broadcast_staff_event("QUEUE_UPDATED")

    return {"message": "Reminder sent successfully"}


def confirm_step(queue_ticket_id: str, step_number: int, staff_id: str,
                 released_to: str = None, document_verified: bool = False):
    """Staff confirms a student's step is complete."""
    admin = get_admin()
    from datetime import datetime, timezone

    # Get the ticket
    try:
        ticket_res = admin.table("queue_tickets") \
            .select("id, student_id, appointment_id, queue_number, total_steps, current_step") \
            .eq("id", queue_ticket_id) \
            .execute()
        if not ticket_res.data:
            raise HTTPException(status_code=404, detail="Ticket not found")
        ticket = ticket_res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Mark current step completed
    try:
        step_res = admin.table("transaction_steps") \
            .select("id, step_name, status, step_number") \
            .eq("queue_ticket_id", queue_ticket_id) \
            .eq("step_number", step_number) \
            .execute()
        if not step_res.data:
            raise HTTPException(status_code=404, detail=f"Step {step_number} not found")
        step = step_res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    now_iso = datetime.now(timezone.utc).isoformat()
    update_data = {
        "status": "completed",
        "confirmed_by": staff_id,
        "confirmed_at": now_iso,
    }

    step_name = step.get("step_name", "")
    is_release_step = "release" in step_name.lower() or "releasing" in step_name.lower()

    if is_release_step and released_to:
        if not document_verified:
            raise HTTPException(
                status_code=400,
                detail="Staff must check and verify the physical/digital document before releasing."
            )

    try:
        admin.table("transaction_steps") \
            .update(update_data) \
            .eq("id", step["id"]) \
            .execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    audit_changes = "Step marked completed"
    if is_release_step:
        recipient_note = released_to.strip() if released_to and released_to.strip() else "student (self)"
        audit_changes = f"Document released to: {recipient_note}. Document verified correct: {'Yes' if document_verified else 'N/A'}."

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

    try:
        appt_res = admin.table("appointments").select("transaction_types(name)").eq("id", ticket["appointment_id"]).single().execute()
        tx_name = appt_res.data.get("transaction_types", {}).get("name") if appt_res.data else "document"
    except Exception:
        tx_name = "document"

    current_step_name = step.get("step_name", f"Step {step_number}")

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
            message=f"Your request for {tx_name} (Ticket {ticket['queue_number']}) has been completed and released. Thank you!",
            type="success"
        )
        manager.broadcast_staff_event("QUEUE_UPDATED")
        manager.broadcast_staff_event("RELEASES_UPDATED")
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
        next_step_name = next_step_data.get("step_name", f"Step {next_step}")

        # Determine if the next step is back-office processing (does not require student presence)
        is_back_office_next = (
            "Preparation" in next_step_name
            or "Filing" in next_step_name
            or "Verification" in next_step_name
            or "Records" in next_step_name
            or "Prepared" in next_step_name
            or "Ready" in next_step_name
            or next_step_data.get("location") == "Back Office"
            or next_step_data.get("requires_presence") is False
        )
        is_release_next = "Release" in next_step_name or "Claim" in next_step_name or "Issuance" in next_step_name

        if is_release_next:
            # Check if this appointment has a future scheduled release date
            appt_rel_res = admin.table("appointments").select("release_date").eq("id", ticket["appointment_id"]).single().execute()
            rel_date_val = (appt_rel_res.data or {}).get("release_date")
            today_str = str(date.today())

            if rel_date_val and rel_date_val > today_str:
                try:
                    rel_d_formatted = date.fromisoformat(str(rel_date_val).split("T")[0]).strftime("%B %d, %Y")
                except Exception:
                    rel_d_formatted = str(rel_date_val)
                notif_title = "Document Finalized & Scheduled for Release"
                notif_message = f"Your {tx_name} (Ticket {ticket['queue_number']}) is prepared. Please return to the Registrar's Office on {rel_d_formatted} to claim your document."
            else:
                notif_title = "Document Ready for Release"
                notif_message = f"Your {tx_name} (Ticket {ticket['queue_number']}) is ready for pickup. Please proceed to the Registrar's Office to claim your document."
        elif "prepared" in next_step_name.lower():
            notif_title = "Document Records Verified"
            notif_message = f"Your {tx_name} records (Ticket {ticket['queue_number']}) are verified. Staff is finalizing the official copy in the back office."
        elif is_back_office_next:
            notif_title = f"{current_step_name} Confirmed"
            notif_message = f"{current_step_name} is confirmed. Your document is now being processed in the back office."
        else:
            notif_title = f"{current_step_name} Confirmed"
            notif_message = f"{current_step_name} is confirmed. Please wait for your ticket to be called for {next_step_name}."

        if notif_title and notif_message:
            create_system_notification(
                user_id=ticket["student_id"],
                title=notif_title,
                message=notif_message,
                type="info"
            )
        manager.broadcast_staff_event("QUEUE_UPDATED")
        if is_release_next or is_release_step:
            manager.broadcast_staff_event("RELEASES_UPDATED")
        return {"message": f"Step {step_number} confirmed. Moved to step {next_step}.", "status": "in_progress"}


def get_todays_queue(date_filter: str = None):
    """Get all active queue tickets for today — for staff dashboard."""
    admin = get_admin()
    today = date_filter or str(date.today())
    try:
        # 1. Fetch tickets for today's appointment date
        today_res = admin.table("queue_tickets") \
            .select("*, appointments!inner(id, appointment_date, time_slot, priority_class, release_date, notes, transaction_types(name, description, processing_steps, required_documents)), users(first_name, last_name, student_id, email), transaction_steps(*)") \
            .eq("appointments.appointment_date", today) \
            .in_("status", ["waiting", "in_progress", "completed", "no_show", "cancelled"]) \
            .order("created_at") \
            .execute()

        # 2. Fetch all ongoing active/in-progress tickets (so tickets sitting in processing table are never wiped out)
        active_res = admin.table("queue_tickets") \
            .select("*, appointments!inner(id, appointment_date, time_slot, priority_class, release_date, notes, transaction_types(name, description, processing_steps, required_documents)), users(first_name, last_name, student_id, email), transaction_steps(*)") \
            .in_("status", ["waiting", "in_progress"]) \
            .order("created_at") \
            .execute()

        # Deduplicate tickets by id while preserving order
        seen_ids = set()
        all_raw_tickets = []
        for t in (today_res.data or []) + (active_res.data or []):
            if t.get("id") and t["id"] not in seen_ids:
                seen_ids.add(t["id"])
                all_raw_tickets.append(t)

        result = []
        for ticket in all_raw_tickets:
            tx_type = (ticket.get("appointments") or {}).get("transaction_types") or {}
            tx_name = tx_type.get("name", "")
            if "(deleted" in tx_name:
                continue
            
            processing_steps = tx_type.get("processing_steps") or []
            
            steps = ticket.pop("transaction_steps", [])
            # Sort steps locally by step_number
            steps = sorted(steps, key=lambda x: x.get("step_number", 0))
            
            # Stitch requires_presence and description from processing_steps JSON into transaction_steps
            for i, step in enumerate(steps):
                if i < len(processing_steps):
                    raw_step = processing_steps[i]
                    if isinstance(raw_step, dict):
                        step["requires_presence"] = raw_step.get("requires_presence", True)
                        step["description"] = raw_step.get("description") or ""
                    else:
                        step["requires_presence"] = True
                        step["description"] = ""
                else:
                    step["requires_presence"] = True
                    step["description"] = ""

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
    """Get dynamic live queue stats like avg wait time and peak forecast based on today's queue."""
    try:
        admin = get_admin()
        today = str(date.today())
        from datetime import datetime, timezone

        now_utc = datetime.now(timezone.utc)

        # 1. Check steps completed TODAY
        today_completed_steps = admin.table("transaction_steps") \
            .select("created_at, confirmed_at, activated_at") \
            .gte("confirmed_at", today) \
            .neq("location", "Back Office") \
            .execute()

        total_seconds = 0
        valid_steps = 0
        for row in (today_completed_steps.data or []):
            try:
                start_raw = row.get("activated_at") or row.get("created_at")
                if not start_raw or not row.get("confirmed_at"):
                    continue
                start = datetime.fromisoformat(start_raw.replace("Z", "+00:00"))
                end = datetime.fromisoformat(row["confirmed_at"].replace("Z", "+00:00"))
                secs = (end - start).total_seconds()
                if 0 < secs < 7200:  # ignore outliers over 2 hours
                    total_seconds += secs
                    valid_steps += 1
            except Exception:
                pass

        if valid_steps > 0:
            avg_total_secs = round(total_seconds / valid_steps)
        else:
            # 2. Check active tickets currently in queue today
            today_active_tickets = admin.table("queue_tickets") \
                .select("id, created_at, status") \
                .in_("status", ["waiting", "in_progress", "pending"]) \
                .gte("created_at", today) \
                .execute()

            active_wait = 0
            active_count = 0
            for t in (today_active_tickets.data or []):
                try:
                    c_at = datetime.fromisoformat(t["created_at"].replace("Z", "+00:00"))
                    diff = (now_utc - c_at).total_seconds()
                    if 0 <= diff < 7200:
                        active_wait += diff
                        active_count += 1
                except Exception:
                    pass

            if active_count > 0:
                avg_total_secs = round(active_wait / active_count)
            else:
                # No active queue or backlog today
                avg_total_secs = 0

        avg_mins = avg_total_secs // 60
        avg_secs = avg_total_secs % 60

        # 3. Peak Forecast from today's appointments
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
        logger.warning(f"Error fetching live queue stats: {e}. Returning fallback stats.")
        return {
            "avg_wait_minutes": 5,
            "avg_wait_seconds": 300,
            "peak_forecast": "10:00 AM"
        }


def get_uncollected_documents(threshold_days: int = 0):
    """
    Returns tickets currently sitting at a Release step (ready for
    pickup), sorted longest-waiting first.
    """
    from datetime import datetime, timezone, timedelta, date
    admin = get_admin()

    try:
        query = admin.table("transaction_steps") \
            .select("*, queue_tickets(id, queue_number, student_id, "
                    "users(first_name, last_name, student_id), "
                    "appointments(transaction_types(name), priority_class, release_date))") \
            .or_("step_name.ilike.%Release%,step_name.ilike.%Claim%,step_name.ilike.%Pickup%,step_name.ilike.%Collection%,step_name.ilike.%Issuance%,location.ilike.%Release%") \
            .eq("status", "in_progress")

        if threshold_days > 0:
            threshold_date = (datetime.now(timezone.utc) - timedelta(days=threshold_days)).isoformat()
            query = query.lt("activated_at", threshold_date)

        res = query.execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    results = []
    today_date = datetime.now(timezone.utc).date()
    for row in (res.data or []):
        ticket = row.get("queue_tickets") or {}
        if not ticket:
            continue
            
        student = ticket.get("users") or {}
        appt = ticket.get("appointments") or {}
        release_date_str = appt.get("release_date")
        
        raw_tx_name = (appt.get("transaction_types") or {}).get("name", "Unknown")
        if "(deleted" in raw_tx_name:
            continue
        tx_name = raw_tx_name

        # Calculate waiting time relative to assigned release_date or activated_at
        days_waiting = 0
        if release_date_str:
            try:
                if "T" in str(release_date_str):
                    rel_date = datetime.fromisoformat(str(release_date_str).replace("Z", "+00:00")).date()
                else:
                    rel_date = date.fromisoformat(str(release_date_str))

                days_waiting = (today_date - rel_date).days
            except Exception:
                days_waiting = 0
        elif row.get("activated_at"):
            try:
                act_date = datetime.fromisoformat(str(row.get("activated_at")).replace("Z", "+00:00")).date()
                days_waiting = (today_date - act_date).days
            except Exception:
                days_waiting = 0

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


def get_collected_documents(limit: int = 500):
    """
    Returns tickets that have been successfully released (completed Release step).
    """
    admin = get_admin()
    try:
        res = admin.table("transaction_steps") \
            .select("*, queue_tickets(id, queue_number, student_id, "
                    "users(first_name, last_name, student_id), "
                    "appointments(transaction_types(name), priority_class, release_date))") \
            .or_("step_name.ilike.%Release%,step_name.ilike.%Claim%,step_name.ilike.%Pickup%,step_name.ilike.%Collection%,step_name.ilike.%Issuance%,location.ilike.%Release%") \
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
    Returns tickets for a specific student that are currently sitting at a Release step (ready for pickup today).
    """
    admin = get_admin()
    today_date = date.today()
    try:
        res = admin.table("transaction_steps") \
            .select("*, queue_tickets!inner(id, queue_number, student_id, status, appointments(transaction_types(name), release_date))") \
            .eq("queue_tickets.student_id", student_id) \
            .eq("queue_tickets.status", "in_progress") \
            .or_("step_name.ilike.%Release%,step_name.ilike.%Claim%,step_name.ilike.%Pickup%,step_name.ilike.%Collection%,step_name.ilike.%Issuance%,location.ilike.%Release%") \
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

        # If release date is scheduled for the future, it is NOT ready for pickup yet
        if release_date:
            try:
                if "T" in str(release_date):
                    rel_d = datetime.fromisoformat(str(release_date).replace("Z", "+00:00")).date()
                else:
                    rel_d = date.fromisoformat(str(release_date))
                if rel_d > today_date:
                    continue
            except Exception:
                pass

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
    Get all active queue tickets currently being served at a physical counter window.
    Returns only non-PII data (queue number, location, type).
    For the student dashboard 'Now Serving' view.
    """
    admin = get_admin()
    try:
        # Fetch tickets currently in progress
        tickets_res = admin.table("queue_tickets") \
            .select("id, queue_number, appointments(transaction_types(name, processing_steps)), transaction_steps(step_number, step_name, status, location)") \
            .eq("status", "in_progress") \
            .execute()
            
        results = []
        for ticket in (tickets_res.data or []):
            # Find the active step to get the counter/location
            steps = ticket.get("transaction_steps", [])
            active_step = next((s for s in steps if s.get("status") == "in_progress"), None)
            if not active_step:
                continue
            
            step_name = (active_step.get("step_name") or "").lower()
            location = active_step.get("location") or "Counter"
            
            # If step is preparation of document, document prepared, release, or back office, exclude from live counter list
            if "preparation" in step_name or "document prepared" in step_name or "document ready" in step_name or "release" in step_name or location.lower() == "back office":
                continue

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
