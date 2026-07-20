import logging
from fastapi import HTTPException
from config import get_settings
from datetime import date, timedelta
from deps import get_supabase_admin as get_admin

settings = get_settings()
logger = logging.getLogger(__name__)


def get_dashboard_stats():
    admin = get_admin()
    today = str(date.today())

    try:
        # Today's appointments
        today_appts = admin.table("appointments") \
            .select("id, status") \
            .eq("appointment_date", today) \
            .execute()

        total_today = len(today_appts.data)
        confirmed = len([a for a in today_appts.data if a["status"] == "confirmed"])
        completed = len([a for a in today_appts.data if a["status"] == "completed"])
        cancelled = len([a for a in today_appts.data if a["status"] == "cancelled"])
        no_show   = len([a for a in today_appts.data if a["status"] == "no_show"])

        # Yesterday's appointments
        yesterday = str(date.today() - timedelta(days=1))
        yesterday_appts = admin.table("appointments") \
            .select("id") \
            .eq("appointment_date", yesterday) \
            .execute()
        
        total_yesterday = len(yesterday_appts.data)
        
        if total_yesterday == 0:
            vs_yesterday_pct = 100 if total_today > 0 else 0
        else:
            vs_yesterday_pct = round(((total_today - total_yesterday) / total_yesterday) * 100)

        # Active queue tickets
        active_queue = admin.table("queue_tickets") \
            .select("id") \
            .in_("status", ["waiting", "in_progress"]) \
            .gte("created_at", today) \
            .execute()

        # Total registered students
        total_students = admin.table("users") \
            .select("id") \
            .eq("role", "student") \
            .execute()

        # This week's appointments
        week_start = date.today() - timedelta(days=date.today().weekday())
        week_appts = admin.table("appointments") \
            .select("id") \
            .gte("appointment_date", str(week_start)) \
            .lte("appointment_date", today) \
            .execute()

        return {
            "today": {
                "total":     total_today,
                "confirmed": confirmed,
                "completed": completed,
                "cancelled": cancelled,
                "no_show":   no_show,
            },
            "vs_yesterday_pct": vs_yesterday_pct,
            "active_queue":   len(active_queue.data),
            "total_students": len(total_students.data),
            "week_total":     len(week_appts.data),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_reports(days: int = 7, doc_type: str = None):
    admin = get_admin()
    start_date = date.today() - timedelta(days=days)

    try:
        appts = admin.table("appointments") \
            .select("*, transaction_types(name)") \
            .gte("appointment_date", str(start_date)) \
            .order("appointment_date") \
            .execute()

        by_date = {}
        for i in range(days):
            d_str = str(date.today() - timedelta(days=(days - 1 - i)))
            by_date[d_str] = 0

        by_type   = {}
        by_status = {}

        total_processing_mins = 0
        completed_with_time = 0
        from datetime import datetime

        for appt in appts.data:
            tt_name = appt.get("transaction_types", {}).get("name", "Unknown") \
                if appt.get("transaction_types") else "Unknown"
            
            if doc_type and doc_type.lower() != "all":
                if doc_type.lower() not in tt_name.lower():
                    continue

            d = appt["appointment_date"]
            by_date[d] = by_date.get(d, 0) + 1
            by_type[tt_name] = by_type.get(tt_name, 0) + 1

            status = appt["status"]
            by_status[status] = by_status.get(status, 0) + 1

            if status == "completed" and appt.get("created_at") and appt.get("updated_at"):
                try:
                    c_at = datetime.fromisoformat(appt["created_at"].replace("Z", "+00:00"))
                    u_at = datetime.fromisoformat(appt["updated_at"].replace("Z", "+00:00"))
                    total_processing_mins += max(0, (u_at - c_at).total_seconds() / 60.0)
                    completed_with_time += 1
                except Exception:
                    pass

        total     = sum(by_date.values())
        completed = by_status.get("completed", 0)
        cancelled = by_status.get("cancelled", 0)
        no_show   = by_status.get("no_show", 0)
        avg_processing_mins = round(total_processing_mins / completed_with_time) if completed_with_time > 0 else 0

        return {
            "period_days":         days,
            "total_appointments":  total,
            "completed":           completed,
            "cancelled":           cancelled,
            "no_show":             no_show,
            "avg_processing_mins": avg_processing_mins,
            "completion_rate":     round((completed / total * 100), 1) if total > 0 else 0,
            "no_show_rate":        round((no_show   / total * 100), 1) if total > 0 else 0,
            "by_date":   [{"date": k,   "count": v} for k, v in sorted(by_date.items())],
            "by_type":   [{"name": k,   "count": v} for k, v in by_type.items()],
            "by_status": [{"status": k, "count": v} for k, v in by_status.items()],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_registrar_records(days: int = 30):
    admin = get_admin()
    start_date = date.today() - timedelta(days=days)

    try:
        records = admin.table("appointments") \
            .select("*, transaction_types(name), users(first_name, last_name, student_id)") \
            .gte("appointment_date", str(start_date)) \
            .order("appointment_date", desc=True) \
            .execute()
        return records.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_audit_log(limit: int = 50):
    admin = get_admin()
    try:
        logs = admin.table("audit_log") \
            .select("*, users(first_name, last_name, role)") \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()
        return logs.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def log_audit_action(user_id: str, action: str, table_name: str, record_id: str = None, status: str = "Success", changes: str = None, severity: str = "Info"):
    admin = get_admin()
    try:
        admin.table("audit_log").insert({
            "user_id": user_id,
            "action": action,
            "table_name": table_name,
            "record_id": record_id,
            "status": status,
            "changes": changes,
            "severity": severity
        }).execute()
    except Exception as e:
        logger.error(f"Failed to log audit action: {e}")


def get_office_config():
    admin = get_admin()
    try:
        res = admin.table("office_config").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def update_office_config(key: str, value: str, actor_id: str = None):
    admin = get_admin()
    try:
        existing = admin.table("office_config").select("id").eq("key", key).execute()
        if existing.data:
            admin.table("office_config").update({"value": value}).eq("key", key).execute()
        else:
            admin.table("office_config").insert({"key": key, "value": value}).execute()
            
        if actor_id:
            log_audit_action(
                user_id=actor_id,
                action=f"Updated office config: {key}",
                table_name="office_config",
                record_id=None,
                status="Success",
                changes=f"Set to: {value}",
                severity="Info"
            )
            
        return {"message": f"Config '{key}' updated to '{value}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_all_users():
    admin = get_admin()
    try:
        res = admin.table("users") \
            .select("id, first_name, last_name, email, role, priority_class, student_id, created_at, is_active") \
            .order("created_at", desc=True) \
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def update_user_role(user_id: str, role: str, actor_id: str = None):
    admin = get_admin()
    if role not in ["student", "staff", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    try:
        admin.table("users").update({"role": role}).eq("id", user_id).execute()
        
        if actor_id:
            log_audit_action(
                user_id=actor_id,
                action=f"Updated user role to {role}",
                table_name="users",
                record_id=user_id,
                status="Success",
                changes=f"Assigned role: {role}",
                severity="Warning" if role in ["admin", "staff"] else "Info"
            )
            
        return {"message": f"User role updated to '{role}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def apply_date_override(target_date: str, is_blocked: bool, note: str, actor_id: str):
    admin = get_admin()
    
    # 1. Update office_config
    try:
        config_res = admin.table("office_config").select("value").eq("key", "date_overrides").execute()
        import json
        overrides = {}
        if config_res.data:
            overrides = json.loads(config_res.data[0]["value"])
            
        if not is_blocked and not note:
            # Unblocking and no note -> remove it
            overrides.pop(target_date, None)
        else:
            overrides[target_date] = {"is_blocked": is_blocked, "note": note}
        
        # Save back
        if config_res.data:
            admin.table("office_config").update({"value": json.dumps(overrides)}).eq("key", "date_overrides").execute()
        else:
            admin.table("office_config").insert({"key": "date_overrides", "value": json.dumps(overrides)}).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save override: {str(e)}")

    # 2. Re-schedule existing appointments if blocked
    rescheduled_count = 0
    if is_blocked:
        try:
            appts_res = admin.table("appointments").select("id, transaction_type_id").eq("appointment_date", target_date).in_("status", ["pending", "confirmed"]).execute()
            appts = appts_res.data
            
            if appts:
                from services.appointment_service import get_available_slots
                from datetime import datetime, timedelta
                
                for appt in appts:
                    search_date = datetime.strptime(target_date, "%Y-%m-%d").date() + timedelta(days=1)
                    moved = False
                    for _ in range(30):
                        if search_date.weekday() == 6:
                            search_date += timedelta(days=1)
                            continue
                        
                        avail = get_available_slots(appt["transaction_type_id"], search_date)
                        has_slot = False
                        for s in avail["slots"]:
                            if s["available"]:
                                admin.table("appointments").update({
                                    "appointment_date": str(search_date),
                                    "time_slot": s["time_slot"]
                                }).eq("id", appt["id"]).execute()
                                moved = True
                                rescheduled_count += 1
                                break
                        if moved:
                            break
                        search_date += timedelta(days=1)
        except Exception as e:
            pass
            
    # Audit log
    action = f"{'Blocked' if is_blocked else 'Added notice to'} date {target_date}"
    log_audit_action(user_id=actor_id, action=action, table_name="office_config", changes=note, severity="Warning" if is_blocked else "Info")
    
    return {"message": "Date override applied", "rescheduled_count": rescheduled_count}



def toggle_user_status(target_user_id: str, is_active: bool, actor_id: str = None):
    admin = get_admin()
    try:
        admin.table("users").update({"is_active": is_active}).eq("id", target_user_id).execute()
        
        status_text = "Reactivated" if is_active else "Suspended"
        if actor_id:
            log_audit_action(
                user_id=actor_id,
                action=f"{status_text} user account",
                table_name="users",
                record_id=target_user_id,
                status="Success",
                changes=f"is_active: {not is_active} ➔ {is_active}",
                severity="Critical" if not is_active else "Warning"
            )
            
        return {"message": f"User successfully {status_text.lower()}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_transaction_types():
    admin = get_admin()
    try:
        res = admin.table("transaction_types").select("*").order("created_at").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── M12: AI-Generated Admin Insights ─────────────────────────────────────────

def get_ai_insights():
    """
    Pulls today's appointment stats and asks OpenRouter to generate
    a 2-3 sentence natural language summary for the admin Reports tab.
    Falls back to a plain-text summary if the AI call fails.
    """
    admin  = get_admin()
    today  = str(date.today())

    try:
        appts = admin.table("appointments") \
            .select("status") \
            .eq("appointment_date", today) \
            .execute()

        data      = appts.data or []
        total     = len(data)
        completed = sum(1 for a in data if a["status"] == "completed")
        no_shows  = sum(1 for a in data if a["status"] == "no_show")
        cancelled = sum(1 for a in data if a["status"] == "cancelled")
        pending   = sum(1 for a in data if a["status"] in ("confirmed", "waiting"))
        completion_rate = round(completed / total * 100) if total else 0

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # ── AI summary call ───────────────────────────────────────────────────────
    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
        )
        resp = client.chat.completions.create(
            model=settings.openai_model,
            max_tokens=200,
            temperature=0.7,
            messages=[{
                "role": "user",
                "content": (
                    f"You are an assistant for the Registrar's Office admin at Cebu Roosevelt Memorial Colleges.\n"
                    f"Today's appointment data:\n"
                    f"- Total: {total}\n"
                    f"- Completed: {completed} ({completion_rate}% completion rate)\n"
                    f"- No-shows: {no_shows}\n"
                    f"- Cancelled: {cancelled}\n"
                    f"- Pending: {pending}\n\n"
                    f"Write a 2-3 sentence insight summary for the admin dashboard. "
                    f"Be direct, factual, and actionable. No bullet points. No greetings."
                )
            }]
        )
        insight = resp.choices[0].message.content.strip()

    except Exception:
        # Plain fallback — never crashes the dashboard
        if total == 0:
            insight = "No appointments are scheduled for today."
        else:
            insight = (
                f"Today has {total} appointment{'s' if total != 1 else ''} with a "
                f"{completion_rate}% completion rate. "
                f"{no_shows} no-show{'s' if no_shows != 1 else ''} recorded"
                f"{' — consider sending reminders for future bookings.' if no_shows > 2 else '.'} "
                f"{pending} appointment{'s' if pending != 1 else ''} still pending."
            )

    from services.predictive_service import compute_forecast, compute_no_show_risks, compute_volume_trend
    forecast = compute_forecast(admin)
    no_show_risk = compute_no_show_risks(admin)
    trend = compute_volume_trend(admin)

    return {
        "date":            today,
        "total":           total,
        "completed":       completed,
        "no_shows":        no_shows,
        "cancelled":       cancelled,
        "pending":         pending,
        "completion_rate": completion_rate,
        "insight":         insight,
        "forecast":        forecast,
        "no_show_risk":    no_show_risk,
        "trend":           trend,
    }


# ── Window Assignment ─────────────────────────────────────────────────────────

import json as _json
import threading

_window_lock = threading.Lock()

def _get_assignments(admin) -> dict:
    """Read current window assignments JSON from office_config."""
    res = admin.table("office_config").select("value").eq("key", "staff_window_assignments").execute()
    if res.data:
        return _json.loads(res.data[0]["value"] or "{}")
    return {}


def _save_assignments(admin, assignments: dict):
    """Persist the window assignments JSON back to office_config."""
    value = _json.dumps(assignments)
    existing = admin.table("office_config").select("id").eq("key", "staff_window_assignments").execute()
    if existing.data:
        admin.table("office_config").update({"value": value}).eq("key", "staff_window_assignments").execute()
    else:
        admin.table("office_config").insert({"key": "staff_window_assignments", "value": value}).execute()


def get_window_assignments():
    """Return {user_id: window_number} map and configured num_windows."""
    admin = get_admin()
    try:
        cfg = admin.table("office_config").select("key, value").in_("key", ["num_windows", "staff_window_assignments"]).execute()
        num_windows = 3  # default
        assignments = {}
        for row in (cfg.data or []):
            if row["key"] == "num_windows":
                try:
                    num_windows = int(row["value"])
                except Exception:
                    pass
            elif row["key"] == "staff_window_assignments":
                try:
                    assignments = _json.loads(row["value"] or "{}")
                except Exception:
                    pass
        return {"num_windows": num_windows, "assignments": assignments}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def claim_window(user_id: str, window_num: int):
    """Assign a window to a staff member. Enforces one-per-staff and max-window limit."""
    admin = get_admin()
    try:
        # Get configured limit
        cfg = admin.table("office_config").select("value").eq("key", "num_windows").execute()
        num_windows = 3
        if cfg.data:
            try:
                num_windows = int(cfg.data[0]["value"])
            except Exception:
                pass

        if window_num < 1 or window_num > num_windows:
            raise HTTPException(status_code=400, detail=f"Window {window_num} is not available. Active windows: 1–{num_windows}.")

        with _window_lock:
            assignments = _get_assignments(admin)

            # Check if already taken by someone else
            for uid, wnum in assignments.items():
                if wnum == window_num and uid != user_id:
                    raise HTTPException(status_code=409, detail=f"Window {window_num} is already occupied by another staff member.")

            # Assign (overwrite any previous window this staff had)
            assignments[user_id] = window_num
            _save_assignments(admin, assignments)
            
        return {"message": f"Window {window_num} claimed successfully.", "window": window_num}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def release_window(user_id: str):
    """Remove a staff member's window assignment."""
    admin = get_admin()
    try:
        with _window_lock:
            assignments = _get_assignments(admin)
            if user_id in assignments:
                del assignments[user_id]
                _save_assignments(admin, assignments)
        return {"message": "Window released."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
