from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from services.school_records_service import upload_student_records, add_student_record, get_student_records, delete_student_record, update_student_record

router = APIRouter(prefix="/admin/student-records", tags=["School Records"])

@router.post("/upload")
async def upload_excel(file: UploadFile = File(...)):
    # Note: proper authorization should be checked here in a real app
    return await upload_student_records(file)

@router.post("/")
async def manual_add(student_id: str = Form(...), first_name: str = Form(...), last_name: str = Form(...), course: str = Form(...)):
    return await add_student_record(student_id, first_name, last_name, course)

@router.get("/")
async def list_records():
    return await get_student_records()

@router.delete("/{student_id}")
async def delete_record(student_id: str):
    return await delete_student_record(student_id)

@router.patch("/{student_id}")
async def update_record(student_id: str, first_name: str = Form(...), last_name: str = Form(...), course: str = Form(...)):
    return await update_student_record(student_id, first_name, last_name, course)
