from fastapi import APIRouter, Depends
from app.middleware.auth import require_any_user
from app.models.user import User
from app.schemas.report import ReportRequest, ReportResponse
from app.services.report import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    data: ReportRequest,
    current_user: User = Depends(require_any_user),
):
    return await report_service.generate_report(data)
