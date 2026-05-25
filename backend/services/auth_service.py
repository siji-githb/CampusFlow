from supabase import create_client, Client
from config import get_settings
from models.auth_models import RegisterRequest, LoginRequest, UserResponse
from fastapi import HTTPException

settings = get_settings()


def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_supabase_admin() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)


async def register_user(data: RegisterRequest) -> dict:
    supabase = get_supabase()
    admin = get_supabase_admin()

    # Step 1: Create auth user in Supabase Auth
    try:
        auth_response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Auth error: {str(e)}")

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Registration failed")

    user_id = auth_response.user.id

    # Step 2: Insert profile into public.users
    try:
        profile = admin.table("users").insert({
            "id": user_id,
            "email": data.email,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "student_id": data.student_id,
            "priority_class": data.priority_class,
            "role": "student",
        }).execute()
    except Exception as e:
        # Rollback: delete auth user if profile insert fails
        admin.auth.admin.delete_user(user_id)
        raise HTTPException(status_code=400, detail=f"Profile error: {str(e)}")

    return {
        "message": "Registration successful",
        "user_id": user_id,
        "email": data.email,
    }


async def login_user(data: LoginRequest) -> dict:
    supabase = get_supabase()
    admin = get_supabase_admin()

    # Step 1: Sign in with Supabase Auth
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password,
        })
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not auth_response.user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = auth_response.user.id
    access_token = auth_response.session.access_token

    # Step 2: Fetch profile from public.users
    try:
        profile_response = admin.table("users").select("*").eq("id", user_id).single().execute()
        profile = profile_response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="User profile not found")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": profile["email"],
            "first_name": profile["first_name"],
            "last_name": profile["last_name"],
            "role": profile["role"],
            "priority_class": profile["priority_class"],
            "student_id": profile.get("student_id"),
        }
    }