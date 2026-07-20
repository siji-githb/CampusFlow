import requests
from config import get_settings


def send_email(to_email: str, subject: str, body: str) -> None:
    """
    Send a plain-text email via Brevo's HTTPS API.
    Works reliably on Render.
    Raises RuntimeError on failure so callers can convert to HTTPException.
    """
    settings = get_settings()

    if not settings.brevo_api_key:
        raise RuntimeError("BREVO_API_KEY is not configured in .env")

    # Parse email_from if it's in the format "Name <email@domain.com>"
    import re
    sender_name = "CampusFlow Registrar"
    sender_email = settings.email_from
    match = re.match(r"(.*)\s*<(.+)>", settings.email_from)
    if match:
        sender_name = match.group(1).strip()
        sender_email = match.group(2).strip()

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": settings.brevo_api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={
                "sender": {"name": sender_name, "email": sender_email},
                "to": [{"email": to_email}],
                "subject": subject,
                "textContent": body,
            },
            timeout=10,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Brevo API error ({response.status_code}): {response.text}")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Failed to send email: {str(e)}")