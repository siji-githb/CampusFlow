from fastapi import APIRouter, Request
from models.auth_models import RegisterRequest, LoginRequest, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest, IdRequestCreate
from services.auth_service import register_user, login_user, verify_student, refresh_session, forgot_password, reset_password, request_student_id
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


@router.post("/refresh")
@limiter.limit("20/minute")
async def refresh(request: Request, data: RefreshRequest):
    return await refresh_session(data.refresh_token)


@router.get("/verify-student/{student_id}")
async def verify(student_id: str):
    return await verify_student(student_id)


@router.post("/forgot-password")
@limiter.limit("3/minute")
async def handle_forgot_password(request: Request, data: ForgotPasswordRequest):
    return await forgot_password(data.email)


@router.post("/reset-password")
@limiter.limit("5/minute")
async def handle_reset_password(request: Request, data: ResetPasswordRequest):
    return await reset_password(data.access_token, data.new_password)


@router.post("/request-student-id")
@limiter.limit("3/minute")
async def handle_request_student_id(request: Request, data: IdRequestCreate):
    return await request_student_id(data)


@router.get("/health")
async def health():
    return {"status": "ok", "module": "auth"}