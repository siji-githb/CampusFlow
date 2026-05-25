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


class TransactionTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    required_documents: Optional[list] = None
    processing_steps: Optional[list] = None
    is_active: Optional[bool] = None