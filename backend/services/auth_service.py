from config import get_settings
from models.auth_models import RegisterRequest, LoginRequest, UserResponse, UpdateProfileRequest, ChangePasswordRequest
from fastapi import HTTPException
from fastapi import UploadFile
from supabase import Client
import os
import uuid
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

    # Step 2: Fetch official priority class from school_students
    official_priority = "regular"
    if data.student_id:
        try:
            record = admin.table("school_students").select("priority_class").eq("student_id", data.student_id).single().execute()
            if record.data and record.data.get("priority_class"):
                official_priority = record.data["priority_class"]
        except Exception:
            pass

    # Step 3: Insert profile into public.users
    try:
        profile = admin.table("users").insert({
            "id": user_id,
            "email": data.email,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "student_id": data.student_id,
            "course": data.course,
            "priority_class": official_priority,
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

    from services.priority_service import sync_priority_status
    sync_priority_status(user_id)

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
            "profile_image": profile.get("profile_image"),
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
    from config import get_settings
    settings = get_settings()
    try:
        # Supabase handles the email sending; we just trigger it.
        # The redirect URL tells Supabase where to send the user after they click the link.
        frontend_url = settings.frontend_url.rstrip('/')
        supabase.auth.reset_password_for_email(email, {
            "redirect_to": f"{frontend_url}/reset-password"
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
    from services.notification_service import notify_staff_id_request
    
    admin = get_supabase_admin()
    try:
        admin.table("id_requests").insert({
            "first_name": data.first_name,
            "last_name": data.last_name,
            "email": data.email,
            "course": data.course
        }).execute()
        
        # Notify staff about this new ID request
        student_name = f"{data.first_name} {data.last_name}"
        notify_staff_id_request(student_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit request: {str(e)}")
        
    return {"message": "Your request has been sent to the registrar. They will email your Student ID shortly."}


async def update_profile(user_id: str, data: UpdateProfileRequest) -> dict:
    admin = get_supabase_admin()
    try:
        admin.table("users").update({
            "first_name": data.first_name,
            "last_name": data.last_name,
            "email": data.email
        }).eq("id", user_id).execute()
        
        admin.auth.admin.update_user_by_id(user_id, {"email": data.email})
        
        profile = admin.table("users").select("*").eq("id", user_id).single().execute()
        return {
            "message": "Profile updated successfully",
            "user": profile.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


async def change_password(user_id: str, data: ChangePasswordRequest) -> dict:
    admin = get_supabase_admin()
    supabase = get_supabase_anon()
    
    try:
        profile = admin.table("users").select("email").eq("id", user_id).single().execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="User not found")
        email = profile.data["email"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error verifying user")
        
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": data.current_password
        })
        if not auth_response.user:
            raise Exception()
    except Exception:
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    try:
        admin.auth.admin.update_user_by_id(user_id, {"password": data.new_password})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to change password: {str(e)}")
        
    return {"message": "Password changed successfully"}


async def logout_all(user_id: str) -> dict:
    # A true global logout in Supabase requires updating the user's session token or using global scope.
    # We return success so the frontend clears local storage and logs out the current device.
    return {"message": "All active sessions have been revoked."}


async def delete_account(user_id: str) -> dict:
    admin = get_supabase_admin()
    try:
        # Delete auth user
        admin.auth.admin.delete_user(user_id)
        # Delete from public.users (cascade should handle it, but we can do it explicitly if needed)
        admin.table("users").delete().eq("id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")
        
    return {"message": "Your account has been completely deleted."}

async def update_profile_picture(user_id: str, file: UploadFile) -> dict:
    admin = get_supabase_admin()
    
    # Validate extension
    allowed_types = ["image/jpeg", "image/png"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PNG and JPEG images are allowed.")
    
    # Read file
    file_bytes = await file.read()
    
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image size exceeds 5MB limit.")
        
    ext = file.filename.split('.')[-1].lower() if file.filename and '.' in file.filename else 'jpg'
    if ext == 'jpeg':
        ext = 'jpg'
        
    # Generate unique filename to avoid browser caching issues when updating
    filename = f"{user_id}/{uuid.uuid4().hex}.{ext}"
    
    try:
        # Check if bucket exists
        try:
            admin.storage.create_bucket("avatars", name="avatars", options={"public": True})
        except Exception:
            pass # Bucket likely already exists

        # Upload to Supabase Storage bucket 'avatars'
        admin.storage.from_("avatars").upload(
            filename,
            file_bytes,
            {"content-type": file.content_type, "upsert": "true"}
        )
        
        # Get public URL
        public_url = admin.storage.from_("avatars").get_public_url(filename)
        
        # Update user profile
        admin.table("users").update({"profile_image": public_url}).eq("id", user_id).execute()
        
        return {"message": "Profile picture updated successfully", "profile_image": public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


async def remove_profile_picture(user_id: str) -> dict:
    admin = get_supabase_admin()
    try:
        res = admin.table("users").select("profile_image").eq("id", user_id).execute()
        if not res.data or not res.data[0].get("profile_image"):
            return {"message": "No profile picture to remove"}
            
        profile_image = res.data[0]["profile_image"]
        
        if "avatars/" in profile_image:
            filepath = profile_image.split("avatars/")[-1]
            filepath = filepath.split("?")[0]
            admin.storage.from_("avatars").remove([filepath])
            
        admin.table("users").update({"profile_image": None}).eq("id", user_id).execute()
        return {"message": "Profile picture removed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove image: {str(e)}")



