from slowapi import Limiter
from starlette.requests import Request
from jose import jwt
from config import get_settings


def get_real_client_ip(request: Request) -> str:
    """
    Reads forwarded header to get real client IP.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_user_id_or_ip(request: Request) -> str:
    """
    Extracts the authenticated user ID from the Bearer token so rate limits
    apply per user account (crucial on campus Wi-Fi where many students share an IP).
    Falls back to real client IP for unauthenticated requests.
    """
    auth_header = request.headers.get("authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        try:
            settings = get_settings()
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
    return f"ip:{get_real_client_ip(request)}"


limiter = Limiter(key_func=get_user_id_or_ip)