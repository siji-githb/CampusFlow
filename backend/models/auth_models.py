from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    student_id: Optional[str] = None
    course: Optional[str] = None
    priority_class: str = "regular"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    access_token: str
    new_password: str


class IdRequestCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    course: str


class IdRequestUpdate(BaseModel):
    status: str


class UpdateProfileRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):

    id: str
    email: str
    first_name: str
    last_name: str
    role: str
    priority_class: str
    student_id: Optional[str] = None
    course: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse