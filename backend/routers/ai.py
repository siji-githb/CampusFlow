from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from services.ai_service import chat, clear_session, get_or_create_session
from supabase import create_client
from config import get_settings

settings = get_settings()
router = APIRouter(prefix="/ai", tags=["AI Assistant"])


class ChatRequest(BaseModel):
    message: str


def get_current_user(authorization: str):
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.replace("Bearer ", "")
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_anon_key)
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user.user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/chat")
def chat_endpoint(data: ChatRequest, authorization: str = Header(...)):
    user = get_current_user(authorization)
    return chat(user.id, data.message)


@router.get("/history")
def get_history(authorization: str = Header(...)):
    user = get_current_user(authorization)
    session = get_or_create_session(user.id)
    return {"messages": session.get("messages", [])}


@router.delete("/chat/clear")
def clear_chat(authorization: str = Header(...)):
    user = get_current_user(authorization)
    return clear_session(user.id)


@router.get("/health")
def health():
    return {"status": "ok", "module": "ai", "model": settings.openai_model}