from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from services.school_records_service import upload_student_records, add_student_record, get_student_records, delete_student_record, update_student_record, bulk_delete_student_records
from deps import require_staff_or_admin

router = APIRouter(prefix="/admin/student-records", tags=["School Records"])

class BulkDeleteRequest(BaseModel):
    student_ids: list[str]

@router.post("/bulk-delete")
async def bulk_delete_records(request: BulkDeleteRequest, user=Depends(require_staff_or_admin)):
    return await bulk_delete_student_records(request.student_ids)

@router.post("/upload")
async def upload_excel(file: UploadFile = File(...), default_priority: str = Form("regular"), user=Depends(require_staff_or_admin)):
    return await upload_student_records(file, default_priority)

@router.post("/")
async def manual_add(student_id: str = Form(...), first_name: str = Form(...), last_name: str = Form(...), course: str = Form(...), priority_class: str = Form("regular"), user=Depends(require_staff_or_admin)):
    return await add_student_record(student_id, first_name, last_name, course, priority_class)

@router.get("/")
async def list_records(user=Depends(require_staff_or_admin)):
    return await get_student_records()

@router.delete("/{student_id}")
async def delete_record(student_id: str, user=Depends(require_staff_or_admin)):
    return await delete_student_record(student_id)

@router.patch("/{student_id}")
async def update_record(student_id: str, first_name: str = Form(...), last_name: str = Form(...), course: str = Form(...), priority_class: str = Form("regular"), user=Depends(require_staff_or_admin)):
    return await update_student_record(student_id, first_name, last_name, course, priority_class)