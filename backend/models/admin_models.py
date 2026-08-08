from pydantic import BaseModel
from typing import Optional


class OfficeConfigUpdate(BaseModel):
    key: str
    value: str


class TransactionTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    required_documents: Optional[list] = None
    processing_steps: Optional[list] = None
    requires_semester: Optional[bool] = False
    requires_year_level: Optional[bool] = False
    requires_school_year: Optional[bool] = False
    requires_purpose: Optional[bool] = False


class TransactionTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    required_documents: Optional[list] = None
    processing_steps: Optional[list] = None
    is_active: Optional[bool] = None
    requires_semester: Optional[bool] = None
    requires_year_level: Optional[bool] = None
    requires_school_year: Optional[bool] = None
    requires_purpose: Optional[bool] = None

class PriorityRequestSubmit(BaseModel):
    priority_type: str   # 'pwd' or 'pregnant'
    document_url: str

class PriorityRequestReject(BaseModel):
    reason: str

class PriorityRequestOut(BaseModel):
    id: str
    student_id: str
    priority_type: str
    document_url: str
    ocr_extracted_text: Optional[str] = None
    ocr_confidence_score: Optional[int] = None
    ocr_reasoning: Optional[str] = None
    status: str
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[str] = None
    rejection_reason: Optional[str] = None
    expires_at: Optional[str] = None
    created_at: str