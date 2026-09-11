from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from routers import auth, appointments, queue, admin, ai, school_records, notifications
from rate_limit import limiter
from routers import priority

app = FastAPI(
    title="CampusFlow API",
    description="AI-Based Appointment and Queue Management System for CRMC Registrar",
    version="1.0.0",
)

from fastapi.responses import JSONResponse
from starlette.requests import Request

# Rate limiting — protects auth endpoints from brute force and /ai/chat from
# being hammered (each call costs an AI request).
app.state.limiter = limiter

def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    detail_str = str(exc.detail).lower()
    headers = {}
    if "day" in detail_str:
        msg = "Daily message limit reached. You have used all 10 AI questions for today to ensure fair access for all students. You can still book appointments directly through the Book Appointment page or try again tomorrow."
        headers["Retry-After"] = "86400"
        error_type = "daily_limit"
    elif "minute" in detail_str:
        msg = "You are sending messages too quickly. Please wait a moment before sending your next message."
        headers["Retry-After"] = "60"
        error_type = "minute_limit"
    else:
        msg = f"Rate limit exceeded: {exc.detail}"
        headers["Retry-After"] = "60"
        error_type = "rate_limit"
    return JSONResponse(status_code=429, content={"detail": msg, "error_type": error_type, "limit": str(exc.detail)}, headers=headers)

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — allows React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://campus-flow.vercel.app",
        "https://campus-flow-iota.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(appointments.router)
app.include_router(queue.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(school_records.router)
app.include_router(notifications.router)
app.include_router(priority.router)


@app.get("/")
async def root():
    return {
        "message": "CampusFlow API is running",
        "docs": "/docs",
        "version": "1.0.0"
    }