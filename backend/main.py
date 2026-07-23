from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from routers import auth, appointments, queue, admin, ai, messages, school_records, notifications
from rate_limit import limiter
from routers import priority

app = FastAPI(
    title="CampusFlow API",
    description="AI-Based Appointment and Queue Management System for CRMC Registrar",
    version="1.0.0",
)

# Rate limiting — protects auth endpoints from brute force and /ai/chat from
# being hammered (each call costs an OpenAI request).
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
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
app.include_router(messages.router)
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