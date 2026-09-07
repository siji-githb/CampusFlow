from datetime import date, datetime, timezone, timedelta

# Philippine Standard Time is UTC+8 (Asia/Manila)
PHT = timezone(timedelta(hours=8))


def get_pht_now() -> datetime:
    """Returns the current datetime in Philippine Standard Time (UTC+8)."""
    return datetime.now(PHT)


def get_pht_date() -> date:
    """Returns the current date in Philippine Standard Time (UTC+8)."""
    return datetime.now(PHT).date()


def get_pht_date_str() -> str:
    """Returns the current date string in Philippine Standard Time (YYYY-MM-DD)."""
    return datetime.now(PHT).date().isoformat()


def get_pht_midnight_utc_iso() -> str:
    """
    Returns the UTC ISO timestamp representing midnight (00:00:00) today in PHT.
    For example, 00:00 PHT on Sept 8 is 16:00 UTC on Sept 7.
    """
    midnight_pht = datetime.now(PHT).replace(hour=0, minute=0, second=0, microsecond=0)
    return midnight_pht.astimezone(timezone.utc).isoformat()


def get_valid_activation_dates() -> set[str]:
    """
    Returns a set of acceptable 'today' date strings (YYYY-MM-DD).
    Includes Philippine Standard Time (UTC+8), local server time, and UTC time
    to prevent any timezone edge cases between clients and cloud servers.
    """
    return {
        get_pht_date_str(),
        str(date.today()),
        datetime.now(timezone.utc).date().isoformat()
    }
