from fastapi import APIRouter
from models.auth_models import RegisterRequest, LoginRequest
from services.auth_service import register_user, login_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(data: RegisterRequest):
    return await register_user(data)


@router.post("/login")
async def login(data: LoginRequest):
    return await login_user(data)


@router.get("/health")
async def health():
    return {"status": "ok", "module": "auth"}