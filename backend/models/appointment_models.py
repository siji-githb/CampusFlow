from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class AppointmentCreate(BaseModel):
    transaction_type_id: str
    appointment_date: date
    time_slot: str
    notes: Optional[str] = None


class AppointmentResponse(BaseModel):
    id: str
    student_id: str
    transaction_type_id: str
    transaction_type_name: Optional[str] = None
    appointment_date: str
    time_slot: str
    status: str
    priority_class: str
    notes: Optional[str] = None
    release_date: Optional[str] = None
    created_at: str


class ReleaseDateUpdate(BaseModel):
    release_date: str
class TransactionTypeResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    required_documents: Optional[List[str]] = None
    processing_steps: Optional[List[str]] = None
    is_active: bool


class AvailableSlot(BaseModel):
    time_slot: str
    available: bool
    remaining: int


class SlotsResponse(BaseModel):
    date: str
    transaction_type_id: str
    daily_cap: int
    slots: List[AvailableSlot]