from fastapi import APIRouter, Depends, Request
from deps import get_current_user, require_roles
from models.admin_models import PriorityRequestSubmit, PriorityRequestReject
from services.priority_service import (
    submit_priority_request,
    get_pending_requests,
    approve_request,
    reject_request,
    get_student_priority_status,
)
from rate_limit import limiter

router = APIRouter(prefix="/priority", tags=["priority"])

require_staff_or_admin = require_roles(["staff", "admin"])


@router.post("/submit")
@limiter.limit("5/minute")
def submit(request: Request, data: PriorityRequestSubmit, user=Depends(get_current_user)):
    return submit_priority_request(user.id, data.priority_type, data.document_url)


@router.get("/my-status")
def my_status(user=Depends(get_current_user)):
    return get_student_priority_status(user.id)


@router.get("/pending")
def pending(user=Depends(require_staff_or_admin)):
    return get_pending_requests()


@router.post("/{request_id}/approve")
@limiter.limit("30/minute")
def approve(request: Request, request_id: str, user=Depends(require_staff_or_admin)):
    return approve_request(request_id, user.id)


@router.post("/{request_id}/reject")
@limiter.limit("30/minute")
def reject(request: Request, request_id: str, data: PriorityRequestReject, user=Depends(require_staff_or_admin)):
    return reject_request(request_id, user.id, data.reason)