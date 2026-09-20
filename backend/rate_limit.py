import json
import base64
import logging

from slowapi import Limiter
from starlette.requests import Request

logger = logging.getLogger(__name__)


def get_real_client_ip(request: Request) -> str:
    """
    Reads forwarded header to get real client IP.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _extract_sub_from_jwt(token: str):
    """
    Extract the 'sub' claim from a JWT by base64-decoding the payload segment.

    This does NOT verify the signature — that is intentional. The rate limiter
    only needs a stable per-user key; actual authentication and signature
    verification is handled by get_current_user (deps.py) via Supabase.

    The previous implementation used jose.jwt.decode with settings.secret_key,
    which is NOT the Supabase JWT secret — so decoding always failed and every
    request fell back to IP-based rate limiting, causing all users behind the
    same network to share one daily quota.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        # Add padding if needed
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding
        payload = json.loads(base64.urlsafe_b64decode(payload_b64))
        return payload.get("sub")
    except Exception:
        return None


def get_user_id_or_ip(request: Request) -> str:
    """
    Extracts the authenticated user ID from the Bearer token so rate limits
    apply per user account (crucial on campus Wi-Fi where many students share an IP).
    Falls back to real client IP for unauthenticated requests.
    """
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(None, 1)[1].strip()
        user_id = _extract_sub_from_jwt(token)
        if user_id:
            return f"user:{user_id}"
        logger.warning("Rate-limit key: could not extract user ID from JWT, falling back to IP")
    return f"ip:{get_real_client_ip(request)}"


limiter = Limiter(key_func=get_user_id_or_ip)