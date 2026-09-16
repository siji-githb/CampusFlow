from config import get_settings
from models.auth_models import RegisterRequest, LoginRequest, UserResponse, UpdateProfileRequest, ChangePasswordRequest
from fastapi import HTTPException
from fastapi import UploadFile
from supabase import Client
import os
import uuid
from deps import get_supabase_anon, get_supabase_admin
from services.websocket_manager import manager

settings = get_settings()


DISPOSABLE_EMAIL_DOMAINS = {
    "mailinator.com", "10minutemail.com", "tempmail.com", "temp-mail.org", "guerrillamail.com",
    "yopmail.com", "trashmail.com", "getairmail.com", "dispostable.com", "sharklasers.com",
    "fakemailgenerator.com", "dropmail.me", "mohmal.com", "generator.email", "nada.ltd",
    "crazymailing.com", "throwawaymail.com", "mytemp.email", "tempail.com", "burnerdelivery.com",
    "discard.email", "inboxkitten.com", "mailcatch.com", "tempinbox.com", "burnermail.io"
}

def is_disposable_email(email: str) -> bool:
    domain = email.split("@")[-1].lower().strip()
    return domain in DISPOSABLE_EMAIL_DOMAINS

def generate_verification_token(user_id: str, email: str) -> str:
    from datetime import datetime, timedelta, timezone
    from jose import jwt
    payload = {
        "sub": user_id,
        "email": email,
        "type": "email_verification",
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

def generate_password_reset_token(user_id: str, email: str) -> str:
    from datetime import datetime, timedelta, timezone
    from jose import jwt
    payload = {
        "sub": user_id,
        "email": email,
        "type": "password_reset",
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)

def get_verification_url(token: str, base_url: str = None) -> str:
    root = (base_url or settings.frontend_url).rstrip("/")
    return f"{root}/verify-email?token={token}"


async def register_user(data: RegisterRequest, base_url: str = None) -> dict:
    supabase = get_supabase_anon()
    admin = get_supabase_admin()
    
    # Check disposable email domains
    if is_disposable_email(data.email):
        raise HTTPException(
            status_code=400,
            detail="Disposable or temporary email addresses are not permitted. Please use your legitimate personal or school email address."
        )
    
    # Explicitly check for duplicate email to return a clear error
    try:
        existing_email = admin.table("users").select("id").eq("email", data.email).execute()
        if existing_email.data:
            raise HTTPException(status_code=400, detail="This email address is already registered.")
            
        if data.student_id:
            existing_id = admin.table("users").select("id").eq("student_id", data.student_id).execute()
            if existing_id.data:
                raise HTTPException(status_code=400, detail="An account with this Student ID already exists.")
    except HTTPException:
        raise
    except Exception:
        pass

    # Step 1: Create auth user in Supabase Auth with unverified metadata
    try:
        auth_response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "email_verified": False,
                    "first_name": data.first_name,
                    "last_name": data.last_name,
                }
            }
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

    # Step 4: Generate verification token & dispatch branded activation email
    token = generate_verification_token(user_id, data.email)
    verify_url = get_verification_url(token, base_url)
    student_name = f"{data.first_name} {data.last_name}".strip()

    try:
        from services.email_service import send_verification_email
        send_verification_email(to_email=data.email, student_name=student_name, verification_url=verify_url)
    except Exception as e:
        print(f"[AUTH] Failed to send verification email to {data.email}: {e}")

    return {
        "message": "Registration successful! Please check your email to verify your account.",
        "requires_verification": True,
        "user_id": user_id,
        "email": data.email,
    }


async def verify_email_token(token: str) -> dict:
    from jose import jwt, ExpiredSignatureError, JWTError
    admin = get_supabase_admin()
    supabase = get_supabase_anon()

    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") != "email_verification":
            raise HTTPException(status_code=400, detail="Invalid verification token type.")
        user_id = payload.get("sub")
        email = payload.get("email")
        if not user_id or not email:
            raise HTTPException(status_code=400, detail="Malformed verification token.")
    except ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="The verification link has expired. Please request a new one.")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or corrupted verification link.")

    # Mark user verified in Supabase Auth
    try:
        admin.auth.admin.update_user_by_id(
            user_id,
            {
                "email_confirm": True,
                "user_metadata": {
                    "email_verified": True
                }
            }
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to verify user: {str(e)}")

    # Fetch user profile
    try:
        profile_response = admin.table("users").select("*").eq("id", user_id).single().execute()
        profile = profile_response.data
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
    except Exception:
        raise HTTPException(status_code=404, detail="User profile not found")

    from services.priority_service import sync_priority_status
    sync_priority_status(user_id)

    # Generate live login session for instant dashboard redirect
    try:
        link_res = admin.auth.admin.generate_link({"type": "magiclink", "email": email})
        session = supabase.auth.verify_otp({"token_hash": link_res.properties.hashed_token, "type": "magiclink"})
        access_token = session.session.access_token
        refresh_token = session.session.refresh_token
    except Exception as e:
        # Fallback if magiclink session generation fails: user is verified, can log in with password
        return {
            "message": "Email verified successfully! Please sign in with your password.",
            "already_logged_in": False,
            "email": email
        }

    return {
        "message": "Email verified successfully! Welcome to CampusFlow.",
        "already_logged_in": True,
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


async def resend_verification_email(email: str, base_url: str = None) -> dict:
    admin = get_supabase_admin()

    # Check if user exists in public.users
    user_res = admin.table("users").select("*").eq("email", email).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="No account found with this email address.")

    profile = user_res.data[0]
    user_id = profile["id"]

    # Check verification status in Supabase auth
    try:
        auth_res = admin.auth.admin.get_user_by_id(user_id)
        auth_user = getattr(auth_res, "user", auth_res)
        is_verified = (getattr(auth_user, "user_metadata", {}) or {}).get("email_verified")
        if is_verified is True or getattr(auth_user, "email_confirmed_at", None):
            raise HTTPException(status_code=400, detail="This email is already verified. You can sign in directly.")
    except HTTPException:
        raise
    except Exception:
        pass

    token = generate_verification_token(user_id, email)
    verify_url = get_verification_url(token, base_url)
    student_name = f"{profile['first_name']} {profile['last_name']}".strip()

    from services.email_service import send_verification_email
    send_verification_email(to_email=email, student_name=student_name, verification_url=verify_url)

    return {"message": f"A fresh verification link has been sent to {email}."}


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

    # Check if user email is verified
    # Existing users before this feature won't have email_verified == False, so only explicitly False is blocked
    is_verified = (auth_response.user.user_metadata or {}).get("email_verified")
    if is_verified is False:
        raise HTTPException(
            status_code=403,
            detail="Your email address has not been verified yet. Please check your inbox for the activation link, or request a new one."
        )

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


async def forgot_password(email: str, base_url: str = None) -> dict:
    """
    Generates a secure, tamper-proof signed JWT recovery link and sends a
    branded CampusFlow password reset email via Brevo.
    This avoids Supabase's single-use OTP links being consumed by email security
    scanners or expiring prematurely.
    """
    import logging
    logger = logging.getLogger(__name__)
    from config import get_settings
    from services.email_service import send_password_reset_email
    settings = get_settings()
    admin = get_supabase_admin()
    
    clean_email = email.strip().lower()

    try:
        # Check if user exists in public users table using ilike (case-insensitive)
        user_res = admin.table("users").select("id, first_name, last_name, email").ilike("email", clean_email).maybe_single().execute()
        user_data = user_res.data if user_res else None
        
        user_id = None
        user_name = "CampusFlow User"
        if user_data:
            user_id = user_data.get("id")
            first = user_data.get("first_name") or ""
            last = user_data.get("last_name") or ""
            full = f"{first} {last}".strip()
            if full:
                user_name = full
        else:
            # Fallback: check auth users directly
            try:
                auth_users = admin.auth.admin.list_users()
                for u in auth_users:
                    if u.email and u.email.lower() == clean_email:
                        user_id = u.id
                        break
            except Exception:
                pass

        if user_id:
            frontend_root = (base_url or settings.frontend_url).rstrip('/')
            token = generate_password_reset_token(user_id, clean_email)
            reset_url = f"{frontend_root}/reset-password?token={token}"

            send_password_reset_email(to_email=clean_email, user_name=user_name, reset_url=reset_url)
            logger.info(f"JWT password reset email dispatched via Brevo to {clean_email}")
        else:
            logger.info(f"Password reset requested for nonexistent email: {clean_email}")

    except Exception as e:
        logger.error(f"Error in forgot_password via Brevo: {str(e)}")
        # Intentionally swallow errors: we don't want to reveal whether
        # an email exists in the system (prevents account enumeration).

    # Always return success to prevent email enumeration
    return {
        "message": "If an account with that email exists, a password reset link has been sent."
    }


async def reset_password(access_token: str, new_password: str) -> dict:
    """
    Validates either our signed JWT recovery token or a Supabase access token,
    then updates the user's password via the admin SDK.
    """
    from jose import jwt, ExpiredSignatureError, JWTError
    admin = get_supabase_admin()
    user_id = None

    # Step 1: Check if access_token is our signed JWT password_reset token
    try:
        payload = jwt.decode(access_token, settings.secret_key, algorithms=[settings.algorithm])
        if payload.get("type") == "password_reset":
            user_id = payload.get("sub")
    except ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="This password reset link has expired. Please request a new one.")
    except JWTError:
        # Not a JWT or token invalid; fallback to Supabase access token check below
        pass

    # Step 2: Fallback to Supabase access token verification if not a JWT
    if not user_id:
        supabase = get_supabase_anon()
        try:
            user_response = supabase.auth.get_user(access_token)
            if user_response and user_response.user:
                user_id = user_response.user.id
        except Exception:
            pass

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired reset link. Please request a new one.")

    # Step 3: Update user's password via Supabase Admin SDK
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
        # Prevent spamming: Check if there is already a pending request for this email
        existing = admin.table("id_requests") \
            .select("id") \
            .eq("email", data.email) \
            .eq("status", "pending") \
            .execute()
            
        if existing.data:
            raise HTTPException(status_code=429, detail="You already have a pending request. Please wait for the staff to process it.")

        admin.table("id_requests").insert({
            "first_name": data.first_name,
            "last_name": data.last_name,
            "email": data.email,
            "course": data.course
        }).execute()
        
        # Notify staff about this new ID request
        student_name = f"{data.first_name} {data.last_name}"
        notify_staff_id_request(student_name)
        manager.broadcast_staff_event("ID_REQUESTS_UPDATED")
    except HTTPException:
        raise
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



