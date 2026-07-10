from fastapi import APIRouter, Request, Depends, UploadFile, File
from models.auth_models import RegisterRequest, LoginRequest, RefreshRequest, ForgotPasswordRequest, ResetPasswordRequest, IdRequestCreate, UpdateProfileRequest, ChangePasswordRequest
from services.auth_service import register_user, login_user, verify_student, refresh_session, forgot_password, reset_password, request_student_id, update_profile, change_password, logout_all, delete_account, update_profile_picture, remove_profile_picture
from rate_limit import limiter
from deps import get_current_user

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


@router.put("/profile")
@limiter.limit("10/minute")
async def handle_update_profile(request: Request, data: UpdateProfileRequest, user=Depends(get_current_user)):
    return await update_profile(user.id, data)


@router.post("/change-password")
@limiter.limit("5/minute")
async def handle_change_password(request: Request, data: ChangePasswordRequest, user=Depends(get_current_user)):
    return await change_password(user.id, data)


@router.post("/logout-all")
@limiter.limit("5/minute")
async def handle_logout_all(request: Request, user=Depends(get_current_user)):
    return await logout_all(user.id)


@router.delete("/account")
@limiter.limit("3/minute")
async def handle_delete_account(request: Request, user=Depends(get_current_user)):
    return await delete_account(user.id)


@router.post("/profile-picture")
@limiter.limit("5/minute")
async def handle_update_profile_picture(request: Request, file: UploadFile = File(...), user=Depends(get_current_user)):
    return await update_profile_picture(user.id, file)


@router.delete("/profile-picture")
@limiter.limit("5/minute")
async def handle_remove_profile_picture(request: Request, user=Depends(get_current_user)):
    return await remove_profile_picture(user.id)


@router.get("/health")
async def health():
    return {"status": "ok", "module": "auth"}