"""
predictive_service.py — M6 (Demand Forecasting) + M7 (No-show Prediction)

Design principle: Python computes every number using transparent statistics.
The AI's only job is to narrate pre-computed values in plain language.

Minimum data thresholds:
- Forecast: need ≥ 2 historical occurrences of the same weekday (28-day window)
- No-show risk: each factor needs ≥ 5 appointments in its bucket
- Trend: need ≥ 3 appointments in EACH of the two 14-day windows
"""
from datetime import date, timedelta
from collections import defaultdict


# ── Threshold constants (transparent, defensible) ─────────────────────────────
MIN_WEEKDAY_OCCURRENCES = 2   # for forecast
MIN_FACTOR_SAMPLES = 5        # for each no-show risk factor
MIN_TREND_WINDOW = 3          # appointments per window for trend
HIGH_RISK_THRESHOLD = 0.40    # 40% blended no-show probability = high risk


def compute_forecast(admin) -> dict:
    """
    M6 – Demand Forecasting: Weekday-weighted moving average over 28 days.
    Predicts tomorrow's appointment count and likely top transaction type.
    Returns insufficient_data=True if fewer than MIN_WEEKDAY_OCCURRENCES
    historical occurrences of tomorrow's weekday exist.
    """
    tomorrow = date.today() + timedelta(days=1)
    weekday_name = tomorrow.strftime("%A")
    start_28 = str(date.today() - timedelta(days=28))
    today_str = str(date.today())
    tomorrow_str = str(tomorrow)

    try:
        res = admin.table("appointments") \
            .select("appointment_date, transaction_types(name)") \
            .gte("appointment_date", start_28) \
            .lt("appointment_date", today_str) \
            .execute()
        data = res.data or []
    except Exception as e:
        return {"insufficient_data": True, "reason": f"DB error: {e}"}

    # Filter to only the same weekday as tomorrow
    same_weekday_days = defaultdict(list)  # date_str -> list of appointments
    for appt in data:
        appt_date = appt["appointment_date"]
        try:
            d = date.fromisoformat(appt_date)
        except Exception:
            continue
        if d.strftime("%A") == weekday_name:
            same_weekday_days[appt_date].append(appt)

    historical_days = list(same_weekday_days.keys())
    occurrences = len(historical_days)

    if occurrences < MIN_WEEKDAY_OCCURRENCES:
        return {
            "insufficient_data": True,
            "reason": f"Only {occurrences} historical {weekday_name}(s) in the past 28 days (need {MIN_WEEKDAY_OCCURRENCES})",
            "sample_count": occurrences,
            "weekday": weekday_name,
            "target_date": tomorrow_str,
        }

    # Weekday-weighted moving average: count per occurrence
    counts_per_day = [len(same_weekday_days[d]) for d in historical_days]
    predicted_count = round(sum(counts_per_day) / len(counts_per_day))

    # Most common transaction type on this weekday
    type_counts = defaultdict(int)
    for d in historical_days:
        for appt in same_weekday_days[d]:
            tt = appt.get("transaction_types") or {}
            name = tt.get("name", "Unknown") if tt else "Unknown"
            type_counts[name] += 1

    top_transaction_type = max(type_counts, key=type_counts.get) if type_counts else None

    return {
        "insufficient_data": False,
        "weekday": weekday_name,
        "target_date": tomorrow_str,
        "predicted_count": predicted_count,
        "top_transaction_type": top_transaction_type,
        "based_on_occurrences": occurrences,
    }


def compute_no_show_risks(admin) -> dict:
    """
    M7 – No-show Prediction: Scores each confirmed appointment in the next 3 days
    using three independent historical no-show rates. Each factor requires
    MIN_FACTOR_SAMPLES before being trusted. Blends available factors.
    Returns flagged appointments (score ≥ HIGH_RISK_THRESHOLD), sorted by score desc,
    capped at 10, plus a total flagged_count.
    """
    today = date.today()
    today_str = str(today)
    in_3_days = str(today + timedelta(days=3))
    # Historical window: 90 days back
    history_start = str(today - timedelta(days=90))

    # ── Fetch historical data for computing rates ──────────────────────────────
    try:
        hist_res = admin.table("appointments") \
            .select("status, appointment_date, priority_class, created_at") \
            .gte("appointment_date", history_start) \
            .lt("appointment_date", today_str) \
            .execute()
        hist_data = hist_res.data or []
    except Exception as e:
        return {"insufficient_data": True, "reason": f"DB error: {e}", "appointments": [], "flagged_count": 0}

    # ── Build factor rate tables ───────────────────────────────────────────────

    # Factor 1: Weekday no-show rate
    weekday_buckets = defaultdict(lambda: {"total": 0, "no_show": 0})
    for appt in hist_data:
        try:
            d = date.fromisoformat(appt["appointment_date"])
            wd = d.strftime("%A")
        except Exception:
            continue
        weekday_buckets[wd]["total"] += 1
        if appt["status"] == "no_show":
            weekday_buckets[wd]["no_show"] += 1

    weekday_rates = {}
    for wd, counts in weekday_buckets.items():
        if counts["total"] >= MIN_FACTOR_SAMPLES:
            weekday_rates[wd] = counts["no_show"] / counts["total"]

    # Factor 2: Priority class no-show rate
    priority_buckets = defaultdict(lambda: {"total": 0, "no_show": 0})
    for appt in hist_data:
        pc = appt.get("priority_class") or "regular"
        priority_buckets[pc]["total"] += 1
        if appt["status"] == "no_show":
            priority_buckets[pc]["no_show"] += 1

    priority_rates = {}
    for pc, counts in priority_buckets.items():
        if counts["total"] >= MIN_FACTOR_SAMPLES:
            priority_rates[pc] = counts["no_show"] / counts["total"]

    # Factor 3: Lead-time bucket no-show rate
    # Bucket: immediate (0-1d), short (2-3d), normal (4-7d), long (8+ d)
    def lead_time_bucket(appointment_date_str: str, created_at_str: str) -> str | None:
        try:
            appt_d = date.fromisoformat(appointment_date_str)
            created_d = date.fromisoformat(created_at_str[:10])
            lead = (appt_d - created_d).days
            if lead <= 1:
                return "immediate"
            elif lead <= 3:
                return "short"
            elif lead <= 7:
                return "normal"
            else:
                return "long"
        except Exception:
            return None

    lead_buckets = defaultdict(lambda: {"total": 0, "no_show": 0})
    for appt in hist_data:
        bucket = lead_time_bucket(
            appt.get("appointment_date", ""),
            appt.get("created_at", "")
        )
        if bucket is None:
            continue
        lead_buckets[bucket]["total"] += 1
        if appt["status"] == "no_show":
            lead_buckets[bucket]["no_show"] += 1

    lead_rates = {}
    for bucket, counts in lead_buckets.items():
        if counts["total"] >= MIN_FACTOR_SAMPLES:
            lead_rates[bucket] = counts["no_show"] / counts["total"]

    # ── Fetch upcoming confirmed appointments ──────────────────────────────────
    try:
        upcoming_res = admin.table("appointments") \
            .select("id, appointment_date, time_slot, status, priority_class, created_at, student_id, transaction_types(name)") \
            .eq("status", "confirmed") \
            .gte("appointment_date", today_str) \
            .lte("appointment_date", in_3_days) \
            .order("appointment_date") \
            .execute()
        upcoming = upcoming_res.data or []
    except Exception as e:
        return {"insufficient_data": True, "reason": f"DB error: {e}", "appointments": [], "flagged_count": 0}

    # ── Fetch student names ────────────────────────────────────────────────────
    student_ids = list({a["student_id"] for a in upcoming if a.get("student_id")})
    student_names = {}
    if student_ids:
        try:
            users_res = admin.table("users") \
                .select("id, first_name, last_name") \
                .in_("id", student_ids) \
                .execute()
            for u in (users_res.data or []):
                student_names[u["id"]] = f"{u.get('first_name','')} {u.get('last_name','')}".strip()
        except Exception:
            pass  # names are cosmetic; don't crash scoring

    # ── Score each appointment ─────────────────────────────────────────────────
    flagged = []
    for appt in upcoming:
        factors = []

        # Factor 1: weekday
        try:
            wd = date.fromisoformat(appt["appointment_date"]).strftime("%A")
        except Exception:
            wd = None
        if wd and wd in weekday_rates:
            factors.append(weekday_rates[wd])

        # Factor 2: priority class
        pc = appt.get("priority_class") or "regular"
        if pc in priority_rates:
            factors.append(priority_rates[pc])

        # Factor 3: lead-time
        lt_bucket = lead_time_bucket(
            appt.get("appointment_date", ""),
            appt.get("created_at", "")
        )
        if lt_bucket and lt_bucket in lead_rates:
            factors.append(lead_rates[lt_bucket])

        # Skip if no factor has enough data
        if not factors:
            continue

        blended_score = sum(factors) / len(factors)

        if blended_score >= HIGH_RISK_THRESHOLD:
            tt = appt.get("transaction_types") or {}
            flagged.append({
                "appointment_id": appt["id"],
                "student_name": student_names.get(appt.get("student_id", ""), "Unknown"),
                "transaction_type": tt.get("name", "Unknown") if tt else "Unknown",
                "appointment_date": appt["appointment_date"],
                "time_slot": appt.get("time_slot", ""),
                "priority_class": pc,
                "risk_score": round(blended_score * 100),  # as integer percent
                "factors_used": len(factors),
            })

    # Sort by risk score descending, cap at 10
    flagged.sort(key=lambda x: x["risk_score"], reverse=True)
    flagged = flagged[:10]

    return {
        "insufficient_data": False,
        "flagged_count": len(flagged),
        "appointments": flagged,
        "weekday_rates_computed": len(weekday_rates),
        "priority_rates_computed": len(priority_rates),
        "lead_rates_computed": len(lead_rates),
    }


def compute_volume_trend(admin) -> dict:
    """
    M6 – Trend Analysis: Compares last 14 days vs the 14 days before that.
    Requires MIN_TREND_WINDOW appointments in EACH window.
    If trending up, identifies the transaction type that grew the most.
    """
    today = date.today()
    today_str = str(today)
    w1_start = str(today - timedelta(days=14))          # recent 14d
    w2_start = str(today - timedelta(days=28))          # older 14d

    try:
        # Window 1: last 14 days
        w1_res = admin.table("appointments") \
            .select("status, appointment_date, transaction_types(name)") \
            .gte("appointment_date", w1_start) \
            .lt("appointment_date", today_str) \
            .execute()
        w1_data = w1_res.data or []

        # Window 2: 14-28 days ago
        w2_res = admin.table("appointments") \
            .select("status, appointment_date, transaction_types(name)") \
            .gte("appointment_date", w2_start) \
            .lt("appointment_date", w1_start) \
            .execute()
        w2_data = w2_res.data or []
    except Exception as e:
        return {"insufficient_data": True, "reason": f"DB error: {e}"}

    w1_count = len(w1_data)
    w2_count = len(w2_data)

    if w1_count < MIN_TREND_WINDOW or w2_count < MIN_TREND_WINDOW:
        return {
            "insufficient_data": True,
            "reason": (
                f"Need ≥{MIN_TREND_WINDOW} appointments per window. "
                f"Recent 14d: {w1_count}, Previous 14d: {w2_count}."
            ),
            "recent_count": w1_count,
            "prior_count": w2_count,
        }

    # Compute percent change
    percent_change = round(((w1_count - w2_count) / w2_count) * 100, 1)

    if percent_change > 5:
        direction = "up"
    elif percent_change < -5:
        direction = "down"
    else:
        direction = "stable"

    # If trending up, find the transaction type with greatest growth
    driving_type = None
    if direction == "up":
        w1_by_type = defaultdict(int)
        for appt in w1_data:
            tt = appt.get("transaction_types") or {}
            name = tt.get("name", "Unknown") if tt else "Unknown"
            w1_by_type[name] += 1

        w2_by_type = defaultdict(int)
        for appt in w2_data:
            tt = appt.get("transaction_types") or {}
            name = tt.get("name", "Unknown") if tt else "Unknown"
            w2_by_type[name] += 1

        all_types = set(w1_by_type.keys()) | set(w2_by_type.keys())
        best_type = None
        best_delta = 0
        for t in all_types:
            delta = w1_by_type.get(t, 0) - w2_by_type.get(t, 0)
            if delta > best_delta:
                best_delta = delta
                best_type = t

        if best_type and best_delta > 0:
            driving_type = best_type

    return {
        "insufficient_data": False,
        "recent_count": w1_count,
        "prior_count": w2_count,
        "percent_change": percent_change,
        "direction": direction,
        "driving_type": driving_type,
    }
