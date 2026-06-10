from fastapi import APIRouter
from models.auth_models import RegisterRequest, LoginRequest
from services.auth_service import register_user, login_user, verify_student

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(data: RegisterRequest):
    return await register_user(data)


@router.post("/login")
async def login(data: LoginRequest):
    return await login_user(data)


@router.get("/verify-student/{student_id}")
async def verify(student_id: str):
    return await verify_student(student_id)


@router.get("/health")
async def health():
    return {"status": "ok", "module": "auth"}