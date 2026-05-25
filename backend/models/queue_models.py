from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class QueueTicketResponse(BaseModel):
    id: str
    appointment_id: str
    student_id: str
    queue_number: str
    current_step: int
    total_steps: int
    status: str
    created_at: str
    updated_at: str


class StepResponse(BaseModel):
    id: str
    queue_ticket_id: str
    step_number: int
    step_name: str
    location: Optional[str]
    status: str
    confirmed_by: Optional[str]
    confirmed_at: Optional[str]


class ConfirmStepRequest(BaseModel):
    queue_ticket_id: str
    step_number: int