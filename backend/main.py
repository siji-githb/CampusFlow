from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from routers import auth, appointments, queue, admin, ai, messages

app = FastAPI(
    title="CampusFlow API",
    description="AI-Based Appointment and Queue Management System for CRMC Registrar",
    version="1.0.0",
)

# CORS — allows React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","https://campus-flow.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files
os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")

# Routers
app.include_router(auth.router)
app.include_router(appointments.router)
app.include_router(queue.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(messages.router)


@app.get("/")
async def root():
    return {
        "message": "CampusFlow API is running",
        "docs": "/docs",
        "version": "1.0.0"
    }