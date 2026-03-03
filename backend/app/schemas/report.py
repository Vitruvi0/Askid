import uuid
from typing import Optional, Literal
from pydantic import BaseModel


class ReportRequest(BaseModel):
    source_type: Literal["qa", "comparison", "calculator"]
    source_data: dict
    client_name: Optional[str] = None
    agency_name: Optional[str] = None


class ReportResponse(BaseModel):
    technical_report: str
    client_report: str
    email_text: str
