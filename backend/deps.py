"""
Shared FastAPI dependencies: authentication, role checks, and cached Supabase clients.

Centralizing this here means every router imports the SAME auth logic instead of
each file reimplementing (and potentially drifting from) its own copy.
"""
from functools import lru_cache

from typing import Optional

import httpx
from fastapi import Header, HTTPException, Depends
from supabase import create_client, Client, ClientOptions

from config import get_settings

settings = get_settings()


def _build_resilient_httpx_client() -> httpx.Client:
    """
    A shared httpx.Client with:
      - retries=3 on the transport, so a single transient connection failure
        (e.g. "[Errno 11] Resource temporarily unavailable" during a burst of
        concurrent requests) is retried automatically instead of surfacing
        as a 500 to the user.
      - generous connection-pool limits, so a handful of concurrent requests
        sharing this one cached client don't queue up waiting for a slot.
    """
    transport = httpx.HTTPTransport(
        retries=3,
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
    )
    return httpx.Client(transport=transport, timeout=30)


# ── Cached Supabase clients ──────────────────────────────────────────────────
# create_client() opens a new client (and underlying HTTP connection pool) every
# time it's called. Caching it means each process reuses one client per key type
# instead of constructing a fresh one on every request.

@lru_cache()
def get_supabase_anon() -> Client:
    """Client scoped to the anon key — used only to verify user JWTs."""
    options = ClientOptions(httpx_client=_build_resilient_httpx_client())
    return create_client(settings.supabase_url, settings.supabase_anon_key, options)


@lru_cache()
def get_supabase_admin() -> Client:
    """Client scoped to the service key — bypasses RLS, used for trusted server-side reads/writes."""
    options = ClientOptions(httpx_client=_build_resilient_httpx_client())
    return create_client(settings.supabase_url, settings.supabase_service_key, options)


# ── Auth dependencies ────────────────────────────────────────────────────────

def get_current_user(authorization: Optional[str] = Header(None)):
    """Extract and verify the authenticated user from the Bearer token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    # Split on any whitespace (handles extra spaces and case variants like 'bearer').
    # RFC 7235 defines auth-scheme as case-insensitive.
    parts = authorization.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = parts[1].strip()
    try:
        supabase = get_supabase_anon()
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_user_profile(user_id: str) -> dict:
    """Fetch the full profile row (role, priority_class, etc.) for a user id."""
    admin = get_supabase_admin()
    try:
        res = admin.table("users").select("*").eq("id", user_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        return res.data
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="User profile not found")


def get_current_profile(user=Depends(get_current_user)) -> dict:
    """Dependency version of get_user_profile, chained off get_current_user."""
    return get_user_profile(user.id)


def require_roles(*roles: str):
    """
    Returns a FastAPI dependency that verifies the caller's role is one of `roles`.
    Resolves to the Supabase auth user (so `.id` is available in the route, matching
    how the routers previously used the return value of their local get_current_user).
    """
    def checker(user=Depends(get_current_user)):
        admin = get_supabase_admin()
        try:
            profile = admin.table("users").select("role").eq("id", user.id).single().execute()
        except Exception:
            # The role lookup itself failed (e.g. transient DB/network issue) — this is
            # NOT the same thing as "you don't have permission," so don't report it as a 403.
            # Doing so in the past masked real backend errors as misleading permission errors.
            raise HTTPException(status_code=503, detail="Could not verify permissions right now. Please try again.")

        role = profile.data["role"] if profile.data else None
        if role not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {' or '.join(roles)}")
        return user
    return checker


require_admin = require_roles("admin")
require_staff_or_admin = require_roles("staff", "admin")