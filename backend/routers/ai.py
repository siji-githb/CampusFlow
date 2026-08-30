from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from services.ai_service import chat, clear_session, get_or_create_session, get_ai_providers
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
    providers = get_ai_providers()
    primary = providers[0]["model"] if providers else None
    fallbacks = [p["model"] for p in providers[1:]] if len(providers) > 1 else []
    return {
        "status": "ok",
        "module": "ai",
        "primary_provider": "Google Gemini",
        "primary_model": primary,
        "fallback_models": fallbacks,
        "openrouter_enabled": False
    }