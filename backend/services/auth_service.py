from config import get_settings
from models.auth_models import RegisterRequest, LoginRequest, UserResponse
from fastapi import HTTPException
from deps import get_supabase_anon, get_supabase_admin

settings = get_settings()


async def register_user(data: RegisterRequest) -> dict:
    supabase = get_supabase_anon()
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
            "course": data.course,
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
    supabase = get_supabase_anon()
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
    refresh_token = auth_response.session.refresh_token

    # Step 2: Fetch profile from public.users
    try:
        profile_response = admin.table("users").select("*").eq("id", user_id).single().execute()
        profile = profile_response.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="User profile not found")

    # Step 3: Check account is not suspended
    if not profile.get("is_active", True):
        raise HTTPException(status_code=403, detail="Your account has been suspended. Please contact the Registrar's Office.")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": profile["email"],
            "first_name": profile["first_name"],
            "last_name": profile["last_name"],
            "role": profile["role"],
            "priority_class": profile["priority_class"],
            "student_id": profile.get("student_id"),
            "course": profile.get("course"),
        }

    }

async def refresh_session(refresh_token: str) -> dict:
    """
    Exchange a still-valid refresh_token for a fresh access_token, without
    requiring the user to log in again. This is what lets long admin/staff
    dashboard sessions (which poll continuously) survive past the access
    token's ~1 hour expiry instead of hitting a dead-end 401.
    """
    supabase = get_supabase_anon()

    try:
        auth_response = supabase.auth.refresh_session(refresh_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    if not auth_response or not auth_response.session:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")

    return {
        "access_token": auth_response.session.access_token,
        "refresh_token": auth_response.session.refresh_token,
        "token_type": "bearer",
    }


async def verify_student(student_id: str) -> dict:
    admin = get_supabase_admin()

    # Both failure paths below (already registered vs. not in school records) return the
    # exact same status code and message on purpose. Distinguishing them lets someone
    # enumerate which student IDs are valid/registered just by probing this endpoint.
    generic_error = HTTPException(
        status_code=400,
        detail="This Student ID cannot be used for registration.",
    )

    # 1. Check if the student_id is already in the 'users' table
    try:
        existing = admin.table("users").select("id").eq("student_id", student_id).execute()
        if existing.data:
            raise generic_error
    except HTTPException:
        raise
    except Exception:
        raise generic_error

    # 2. Check if the student_id exists in 'school_students' table
    try:
        record = admin.table("school_students").select("*").eq("student_id", student_id).single().execute()
        if not record.data:
            raise generic_error
        return record.data
    except HTTPException:
        raise
    except Exception:
        raise generic_error


async def forgot_password(email: str) -> dict:
    """
    Triggers Supabase's built-in password reset flow.
    Supabase sends an email with a magic link that includes a recovery token.
    The redirect_to URL points the user back to the frontend's reset-password page.
    """
    supabase = get_supabase_anon()
    try:
        # Supabase handles the email sending; we just trigger it.
        # The redirect URL tells Supabase where to send the user after they click the link.
        supabase.auth.reset_password_for_email(email, {
            "redirect_to": "http://localhost:5173/reset-password"
        })
    except Exception:
        # Intentionally swallow errors: we don't want to reveal whether
        # an email exists in the system (prevents account enumeration).
        pass

    # Always return success to prevent email enumeration
    return {
        "message": "If an account with that email exists, a password reset link has been sent."
    }


async def reset_password(access_token: str, new_password: str) -> dict:
    """
    Uses the recovery access token from the Supabase magic link to identify the user,
    then updates their password via the admin SDK.
    """
    supabase = get_supabase_anon()

    # Step 1: Verify the recovery token is valid and identify the user
    try:
        user_response = supabase.auth.get_user(access_token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired reset link. Please request a new one.")
        user_id = user_response.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired reset link. Please request a new one.")

    # Step 2: Update password via admin SDK (bypasses needing a session)
    admin = get_supabase_admin()
    try:
        admin.auth.admin.update_user_by_id(user_id, {"password": new_password})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update password: {str(e)}")

    return {"message": "Password updated successfully. You can now log in with your new password."}


async def request_student_id(data) -> dict:
    """
    Submits a request for a forgotten Student ID.
    Inserts into the dedicated id_requests table and alerts staff.
    """
    from services.notification_service import notify_staff_urgent_message
    
    admin = get_supabase_admin()
    try:
        admin.table("id_requests").insert({
            "first_name": data.first_name,
            "last_name": data.last_name,
            "email": data.email,
            "course": data.course
        }).execute()
        
        # Notify staff about this urgent request
        student_name = f"{data.first_name} {data.last_name}"
        notify_staff_urgent_message(student_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit request: {str(e)}")
        
    return {"message": "Your request has been sent to the registrar. They will email your Student ID shortly."}
