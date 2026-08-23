from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from services.ai_service import chat, clear_session, get_or_create_session
from config import get_settings
from deps import get_current_user
from rate_limit import limiter

settings = get_settings()
router = APIRouter(prefix="/ai", tags=["AI Assistant"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=1000, description="Student's chat message")


@router.post("/chat")
@limiter.limit("10/day;5/minute")
def chat_endpoint(request: Request, data: ChatRequest, user=Depends(get_current_user)):
    return chat(user.id, data.message)


@router.get("/history")
def get_history(user=Depends(get_current_user)):
    session = get_or_create_session(user.id)
    return {"messages": session.get("messages", [])}


@router.delete("/chat/clear")
def clear_chat(user=Depends(get_current_user)):
    return clear_session(user.id)


@router.get("/health")
def health():
    primary_active = bool(settings.gemini_api_key and settings.gemini_api_key.strip())
    return {
        "status": "ok",
        "module": "ai",
        "primary_provider": "Google Gemini" if primary_active else "None",
        "primary_model": settings.gemini_model if primary_active else None,
        "fallback_provider": "OpenRouter",
        "fallback_model": settings.fallback_model
    }