import requests
from config import get_settings


def send_email(to_email: str, subject: str, body: str, html_content: str = None) -> None:
    """
    Send an email via Brevo's HTTPS API (plain text + optional rich HTML).
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

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": body,
    }
    if html_content:
        payload["htmlContent"] = html_content

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": settings.brevo_api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json=payload,
            timeout=10,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Brevo API error ({response.status_code}): {response.text}")
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"Failed to send email: {str(e)}")


def send_verification_email(to_email: str, student_name: str, verification_url: str) -> None:
    """
    Send a high-conversion, beautifully styled verification link email to a new student.
    """
    subject = "Verify Your CampusFlow Account"
    plain_text = (
        f"Hello {student_name},\n\n"
        f"Thank you for creating an account on CampusFlow!\n\n"
        f"Please verify your email address by clicking the link below:\n"
        f"{verification_url}\n\n"
        f"This link will expire in 24 hours. Once verified, you will be redirected straight to your student dashboard.\n\n"
        f"If you did not register for CampusFlow, you can safely ignore this email.\n\n"
        f"Warm regards,\n"
        f"The CampusFlow Registrar Team"
    )

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          <!-- Top Accent Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #7B1A2A 0%, #991B1B 60%, #D97706 100%); height: 6px;"></td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <!-- Header Brand -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 24px; text-align: left;">
                    <span style="font-size: 22px; font-weight: 800; color: #7B1A2A; letter-spacing: -0.5px; font-family: Georgia, serif;">Campus<span style="color: #D97706;">Flow</span></span>
                    <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Registrar & Academic Services</span>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; font-family: Georgia, serif;">Verify Your Email Address</h1>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                Hello <strong>{student_name}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                Welcome to CampusFlow! To ensure security and confirm you own this email address, please click the button below to verify your account. You'll be logged in and taken directly to your dashboard.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="{verification_url}" target="_blank" style="display: inline-block; background-color: #7B1A2A; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(123, 26, 42, 0.35); text-align: center;">
                      Verify Email & Go to Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin: 24px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">Button not working? Copy and paste this link into your browser:</p>
                <a href="{verification_url}" target="_blank" style="color: #7B1A2A; word-break: break-all; text-decoration: underline;">{verification_url}</a>
              </div>

              <!-- Security Notice -->
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 20px 0 0 0;">
                This link expires in <strong>24 hours</strong>. If you did not create a CampusFlow account, you can safely disregard this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
              &copy; 2026 CampusFlow. All rights reserved. <br/>
              Smart queueing and seamless registrar appointments.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    send_email(to_email=to_email, subject=subject, body=plain_text, html_content=html_content)


def send_password_reset_email(to_email: str, user_name: str, reset_url: str) -> None:
    """
    Send a secure, beautifully branded password reset email via Brevo.
    """
    subject = "Reset Your CampusFlow Password"
    plain_text = (
        f"Hello {user_name},\n\n"
        f"We received a request to reset your CampusFlow account password.\n\n"
        f"Click the link below to set a new password:\n"
        f"{reset_url}\n\n"
        f"This link will expire in 1 hour. If you did not make this request, you can safely ignore this email.\n\n"
        f"Warm regards,\n"
        f"The CampusFlow Registrar Team"
    )

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          <!-- Top Accent Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, #7B1A2A 0%, #991B1B 60%, #D97706 100%); height: 6px;"></td>
          </tr>
          
          <!-- Content Body -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <!-- Header Brand -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 24px; text-align: left;">
                    <span style="font-size: 22px; font-weight: 800; color: #7B1A2A; letter-spacing: -0.5px; font-family: Georgia, serif;">Campus<span style="color: #D97706;">Flow</span></span>
                    <span style="display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Registrar & Academic Services</span>
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <h1 style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 12px 0; font-family: Georgia, serif;">Password Reset Request</h1>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px 0;">
                Hello <strong>{user_name}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                We received a request to reset the password for your CampusFlow account. Click the button below to choose a new password:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="{reset_url}" target="_blank" style="display: inline-block; background-color: #7B1A2A; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 34px; border-radius: 12px; box-shadow: 0 4px 14px rgba(123, 26, 42, 0.35); text-align: center;">
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; margin: 24px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                <p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">Button not working? Copy and paste this link into your browser:</p>
                <a href="{reset_url}" target="_blank" style="color: #7B1A2A; word-break: break-all; text-decoration: underline;">{reset_url}</a>
              </div>

              <!-- Security Notice -->
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.5; margin: 20px 0 0 0;">
                This link will expire in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email. Your password will not change.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8;">
              &copy; 2026 CampusFlow. All rights reserved. <br/>
              Smart queueing and seamless registrar appointments.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    send_email(to_email=to_email, subject=subject, body=plain_text, html_content=html_content)