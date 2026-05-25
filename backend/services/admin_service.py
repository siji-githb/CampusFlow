from fastapi import HTTPException
from supabase import create_client
from config import get_settings
from datetime import date, timedelta

settings = get_settings()


def get_admin():
    return create_client(settings.supabase_url, settings.supabase_service_key)


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
        no_show = len([a for a in today_appts.data if a["status"] == "no_show"])

        # Active queue tickets
        active_queue = admin.table("queue_tickets") \
            .select("id") \
            .in_("status", ["waiting", "in_progress"]) \
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
                "total": total_today,
                "confirmed": confirmed,
                "completed": completed,
                "cancelled": cancelled,
                "no_show": no_show,
            },
            "active_queue": len(active_queue.data),
            "total_students": len(total_students.data),
            "week_total": len(week_appts.data),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_reports(days: int = 7):
    admin = get_admin()
    start_date = date.today() - timedelta(days=days)

    try:
        appts = admin.table("appointments") \
            .select("*, transaction_types(name)") \
            .gte("appointment_date", str(start_date)) \
            .order("appointment_date") \
            .execute()

        # Group by date
        by_date = {}
        by_type = {}
        by_status = {}

        for appt in appts.data:
            d = appt["appointment_date"]
            by_date[d] = by_date.get(d, 0) + 1

            tt_name = appt.get("transaction_types", {}).get("name", "Unknown") if appt.get("transaction_types") else "Unknown"
            by_type[tt_name] = by_type.get(tt_name, 0) + 1

            status = appt["status"]
            by_status[status] = by_status.get(status, 0) + 1

        total = len(appts.data)
        completed = by_status.get("completed", 0)
        cancelled = by_status.get("cancelled", 0)
        no_show = by_status.get("no_show", 0)

        return {
            "period_days": days,
            "total_appointments": total,
            "completed": completed,
            "cancelled": cancelled,
            "no_show": no_show,
            "completion_rate": round((completed / total * 100), 1) if total > 0 else 0,
            "no_show_rate": round((no_show / total * 100), 1) if total > 0 else 0,
            "by_date": [{"date": k, "count": v} for k, v in sorted(by_date.items())],
            "by_type": [{"name": k, "count": v} for k, v in by_type.items()],
            "by_status": [{"status": k, "count": v} for k, v in by_status.items()],
        }
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


def get_office_config():
    admin = get_admin()
    try:
        res = admin.table("office_config").select("*").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def update_office_config(key: str, value: str):
    admin = get_admin()
    try:
        existing = admin.table("office_config").select("id").eq("key", key).execute()
        if existing.data:
            admin.table("office_config").update({"value": value}).eq("key", key).execute()
        else:
            admin.table("office_config").insert({"key": key, "value": value}).execute()
        return {"message": f"Config '{key}' updated to '{value}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_all_users():
    admin = get_admin()
    try:
        res = admin.table("users") \
            .select("id, first_name, last_name, email, role, priority_class, student_id, created_at") \
            .order("created_at", desc=True) \
            .execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def update_user_role(user_id: str, role: str):
    admin = get_admin()
    if role not in ["student", "staff", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    try:
        admin.table("users").update({"role": role}).eq("id", user_id).execute()
        return {"message": f"User role updated to '{role}'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def get_transaction_types():
    admin = get_admin()
    try:
        res = admin.table("transaction_types").select("*").order("created_at").execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))