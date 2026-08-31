"""
Philippine Official Holidays Utility for CampusFlow Backend
Handles automatic detection and blocking of Philippine holidays.
"""
from datetime import date, timedelta
from functools import lru_cache


def _get_easter_sunday(year: int) -> date:
    """Calculates Easter Sunday using Computus algorithm (Meeus/Jones/Butcher algorithm)."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)


KNOWN_MOVABLE_HOLIDAYS = {
    # Chinese New Year
    "2024-02-10": {"name": "Chinese Lunar New Year", "type": "Special Non-Working Holiday"},
    "2025-01-29": {"name": "Chinese Lunar New Year", "type": "Special Non-Working Holiday"},
    "2026-02-17": {"name": "Chinese Lunar New Year", "type": "Special Non-Working Holiday"},
    "2027-02-06": {"name": "Chinese Lunar New Year", "type": "Special Non-Working Holiday"},
    "2028-01-26": {"name": "Chinese Lunar New Year", "type": "Special Non-Working Holiday"},
    "2029-02-13": {"name": "Chinese Lunar New Year", "type": "Special Non-Working Holiday"},
    "2030-02-03": {"name": "Chinese Lunar New Year", "type": "Special Non-Working Holiday"},

    # Eid al-Fitr (Feast of Ramadan)
    "2024-04-10": {"name": "Eid al-Fitr (Feast of Ramadan)", "type": "Regular Holiday"},
    "2025-03-31": {"name": "Eid al-Fitr (Feast of Ramadan)", "type": "Regular Holiday"},
    "2026-03-20": {"name": "Eid al-Fitr (Feast of Ramadan)", "type": "Regular Holiday"},
    "2027-03-10": {"name": "Eid al-Fitr (Feast of Ramadan)", "type": "Regular Holiday"},
    "2028-02-27": {"name": "Eid al-Fitr (Feast of Ramadan)", "type": "Regular Holiday"},

    # Eid al-Adha (Feast of Sacrifice)
    "2024-06-17": {"name": "Eid al-Adha (Feast of Sacrifice)", "type": "Regular Holiday"},
    "2025-06-07": {"name": "Eid al-Adha (Feast of Sacrifice)", "type": "Regular Holiday"},
    "2026-05-27": {"name": "Eid al-Adha (Feast of Sacrifice)", "type": "Regular Holiday"},
    "2027-05-17": {"name": "Eid al-Adha (Feast of Sacrifice)", "type": "Regular Holiday"},
    "2028-05-05": {"name": "Eid al-Adha (Feast of Sacrifice)", "type": "Regular Holiday"},
}


@lru_cache(maxsize=32)
def get_philippine_holidays_for_year(year: int) -> dict:
    """Returns all Philippine holidays for the given year as a dict keyed by 'YYYY-MM-DD'."""
    holidays = {}

    # 1. Fixed Regular Holidays
    fixed_regular = [
        (1, 1, "New Year's Day"),
        (4, 9, "Araw ng Kagitingan (Day of Valor)"),
        (5, 1, "Labor Day"),
        (6, 12, "Independence Day"),
        (11, 30, "Bonifacio Day"),
        (12, 25, "Christmas Day"),
        (12, 30, "Rizal Day"),
    ]
    for m, d, name in fixed_regular:
        key = f"{year:04d}-{m:02d}-{d:02d}"
        holidays[key] = {"name": name, "type": "Regular Holiday", "is_holiday": True, "is_blocked": True}

    # 2. Fixed Special Non-Working Holidays
    fixed_special = [
        (2, 25, "EDSA People Power Revolution Anniversary"),
        (8, 21, "Ninoy Aquino Day"),
        (11, 1, "All Saints' Day"),
        (11, 2, "All Souls' Day"),
        (12, 8, "Feast of the Immaculate Conception"),
        (12, 24, "Christmas Eve"),
        (12, 31, "Last Day of the Year"),
    ]
    for m, d, name in fixed_special:
        key = f"{year:04d}-{m:02d}-{d:02d}"
        holidays[key] = {"name": name, "type": "Special Non-Working Holiday", "is_holiday": True, "is_blocked": True}

    # 3. National Heroes Day (Last Monday of August)
    aug_31 = date(year, 8, 31)
    aug_dow = aug_31.weekday()  # Monday is 0, Sunday is 6
    offset = (aug_dow - 0) % 7
    heroes_date = 31 - offset
    heroes_key = f"{year:04d}-08-{heroes_date:02d}"
    holidays[heroes_key] = {"name": "National Heroes Day", "type": "Regular Holiday", "is_holiday": True, "is_blocked": True}

    # 4. Holy Week
    easter = _get_easter_sunday(year)
    maundy = easter - timedelta(days=3)
    good_fri = easter - timedelta(days=2)
    black_sat = easter - timedelta(days=1)

    holidays[str(maundy)] = {"name": "Maundy Thursday", "type": "Regular Holiday", "is_holiday": True, "is_blocked": True}
    holidays[str(good_fri)] = {"name": "Good Friday", "type": "Regular Holiday", "is_holiday": True, "is_blocked": True}
    holidays[str(black_sat)] = {"name": "Black Saturday", "type": "Special Non-Working Holiday", "is_holiday": True, "is_blocked": True}

    # 5. Merge Known Movable Holidays
    for k, v in KNOWN_MOVABLE_HOLIDAYS.items():
        if k.startswith(f"{year:04d}-"):
            holidays[k] = {**v, "is_holiday": True, "is_blocked": True}

    return holidays


def get_philippine_holiday(target_date: date | str) -> dict | None:
    """Returns holiday dictionary or None if not a holiday."""
    date_str = str(target_date)
    try:
        year = int(date_str.split("-")[0])
        year_holidays = get_philippine_holidays_for_year(year)
        return year_holidays.get(date_str)
    except Exception:
        return None


def is_philippine_holiday(target_date: date | str) -> bool:
    """Returns True if date is an official Philippine holiday."""
    return get_philippine_holiday(target_date) is not None
