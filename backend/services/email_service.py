import requests
from config import get_settings


def send_email(to_email: str, subject: str, body: str) -> None:
    """
    Send a plain-text email via Resend's HTTPS API.
    Works reliably on Render (unlike SMTP, which Render blocks).
    Raises RuntimeError on failure so callers can convert to HTTPException.
    """
    settings = get_settings()

    if not settings.resend_api_key:
        raise RuntimeError("RESEND_API_KEY is not configured in .env")

    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.email_from,
                "to": [to_email],
                "subject": subject,
                "text": body,
            },
            timeout=10,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Resend API error ({response.status_code}): {response.text}")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Failed to send email: {str(e)}")