from fastapi import APIRouter, Request
from models.auth_models import RegisterRequest, LoginRequest
from services.auth_service import register_user, login_user, verify_student
from rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
@limiter.limit("5/minute")
async def register(request: Request, data: RegisterRequest):
    return await register_user(data)


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, data: LoginRequest):
    return await login_user(data)


@router.get("/verify-student/{student_id}")
async def verify(student_id: str):
    return await verify_student(student_id)


@router.get("/health")
async def health():
    return {"status": "ok", "module": "auth"}