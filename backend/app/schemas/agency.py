import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class AgencyCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    max_users: int = 10
    max_documents: int = 500


class AgencyUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None
    max_users: Optional[int] = None
    max_documents: Optional[int] = None


class AgencyOnboardingRequest(BaseModel):
    # Agency details
    agency_name: str
    agency_email: EmailStr
    agency_phone: Optional[str] = None
    agency_address: Optional[str] = None
    # Admin user details
    admin_full_name: str
    admin_email: EmailStr
    admin_password: str
    # Configuration
    max_users: int = 10
    max_documents: int = 500


class OnboardingResponse(BaseModel):
    agency: "AgencyResponse"
    admin_user_id: uuid.UUID
    admin_email: str


class AgencyResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    email: str
    phone: Optional[str]
    address: Optional[str]
    is_active: bool
    max_users: int
    max_documents: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
