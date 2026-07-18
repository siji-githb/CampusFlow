from slowapi import Limiter
from starlette.requests import Request


def get_real_client_ip(request: Request) -> str:
    """
    Render (and most PaaS platforms) sit the app behind a reverse proxy,
    so request.client.host would resolve to the proxy's internal IP for
    every single request unless we read the forwarded header instead.
    X-Forwarded-For can be a comma-separated chain (client, proxy1, proxy2...);
    the first entry is the original client's real IP.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_real_client_ip)