import io
import openpyxl
from fastapi import HTTPException, UploadFile
from config import get_settings
from deps import get_supabase_admin

settings = get_settings()

async def upload_student_records(file: UploadFile) -> dict:
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported.")
        
    contents = await file.read()
    try:
        workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = workbook.active
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read Excel file: {str(e)}")

    rows = list(sheet.iter_rows(values_only=True))
    if len(rows) < 2:
        raise HTTPException(status_code=400, detail="Excel file is empty or missing data.")

    # Expecting headers: Student ID, First Name, Last Name, Course
    headers = [str(h).lower().strip() for h in rows[0] if h]
    
    # Simple mapping
    expected_cols = ["student id", "first name", "last name", "course"]
    col_indices = {}
    for col in expected_cols:
        try:
            # try to find exact or partial match
            idx = next(i for i, h in enumerate(headers) if col in h or h in col)
            col_indices[col] = idx
        except StopIteration:
            raise HTTPException(status_code=400, detail=f"Missing required column: {col}")

    admin = get_supabase_admin()
    
    records_to_upsert = []
    for row in rows[1:]:
        if not any(row):  # skip empty rows
            continue
            
        student_id = str(row[col_indices["student id"]]).strip()
        if not student_id or student_id == 'None':
            continue
            
        records_to_upsert.append({
            "student_id": student_id,
            "first_name": str(row[col_indices["first name"]]).strip() if row[col_indices["first name"]] else "",
            "last_name": str(row[col_indices["last name"]]).strip() if row[col_indices["last name"]] else "",
            "course": str(row[col_indices["course"]]).strip() if row[col_indices["course"]] else ""
        })

    if not records_to_upsert:
        raise HTTPException(status_code=400, detail="No valid records found to import.")

    # Supabase limits bulk inserts. Let's do batches of 1000
    batch_size = 1000
    inserted = 0
    try:
        for i in range(0, len(records_to_upsert), batch_size):
            batch = records_to_upsert[i:i+batch_size]
            admin.table("school_students").upsert(batch).execute()
            inserted += len(batch)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error during insert: {str(e)}")

    return {"message": f"Successfully imported {inserted} student records."}


async def add_student_record(student_id: str, first_name: str, last_name: str, course: str) -> dict:
    admin = get_supabase_admin()
    try:
        admin.table("school_students").upsert({
            "student_id": student_id,
            "first_name": first_name,
            "last_name": last_name,
            "course": course
        }).execute()
        return {"message": "Record added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add record: {str(e)}")


async def get_student_records() -> dict:
    admin = get_supabase_admin()
    try:
        res = admin.table("school_students").select("*").order("created_at", desc=True).limit(500).execute()
        return {"records": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch records: {str(e)}")

async def delete_student_record(student_id: str) -> dict:
    admin = get_supabase_admin()
    try:
        admin.table("school_students").delete().eq("student_id", student_id).execute()
        return {"message": "Record deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete record: {str(e)}")

async def update_student_record(student_id: str, first_name: str, last_name: str, course: str) -> dict:
    admin = get_supabase_admin()
    try:
        admin.table("school_students").update({
            "first_name": first_name,
            "last_name": last_name,
            "course": course
        }).eq("student_id", student_id).execute()
        
        # Also try to update their actual user profile if they have one
        try:
            admin.table("users").update({
                "first_name": first_name,
                "last_name": last_name,
                "course": course
            }).eq("student_id", student_id).execute()
        except Exception:
            pass # Ignore if they don't have a user account yet
            
        return {"message": "Record updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update record: {str(e)}")