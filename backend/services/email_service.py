import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import get_settings


def send_email(to_email: str, subject: str, body: str) -> None:
    """
    Send a plain-text email via Gmail SMTP (TLS on port 587).
    Raises RuntimeError on failure so callers can convert to HTTPException.
    """
    settings = get_settings()

    if not settings.smtp_email or not settings.smtp_password:
        raise RuntimeError("SMTP credentials are not configured in .env")

    msg = MIMEMultipart("alternative")
    msg["From"] = f"CampusFlow Registrar <{settings.smtp_email}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_email, settings.smtp_password)
            server.sendmail(settings.smtp_email, to_email, msg.as_string())
    except smtplib.SMTPAuthenticationError:
        raise RuntimeError("Gmail authentication failed. Check SMTP_EMAIL and SMTP_PASSWORD in .env")
    except Exception as e:
        raise RuntimeError(f"Failed to send email: {str(e)}")
