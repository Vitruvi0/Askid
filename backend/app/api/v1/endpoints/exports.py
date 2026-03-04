import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from app.middleware.auth import require_any_user
from app.models.user import User
from app.services.export import export_service

router = APIRouter(prefix="/exports", tags=["Exports"])


class CalculatorExportRequest(BaseModel):
    calc_type: str  # pension, tcm, life
    data: dict


class ComparisonExportRequest(BaseModel):
    data: dict


class ReportExportRequest(BaseModel):
    report_type: str  # technical, client, email
    content: str


@router.post("/calculator/pdf")
async def export_calculator_pdf(
    req: CalculatorExportRequest,
    current_user: User = Depends(require_any_user),
):
    pdf_bytes = export_service.calculator_to_pdf(req.calc_type, req.data)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=calcolatore_{req.calc_type}.pdf"},
    )


@router.post("/calculator/csv")
async def export_calculator_csv(
    req: CalculatorExportRequest,
    current_user: User = Depends(require_any_user),
):
    csv_content = export_service.calculator_to_csv(req.calc_type, req.data)
    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=calcolatore_{req.calc_type}.csv"},
    )


@router.post("/comparison/pdf")
async def export_comparison_pdf(
    req: ComparisonExportRequest,
    current_user: User = Depends(require_any_user),
):
    pdf_bytes = export_service.comparison_to_pdf(req.data)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=confronto_polizze.pdf"},
    )


@router.post("/report/pdf")
async def export_report_pdf(
    req: ReportExportRequest,
    current_user: User = Depends(require_any_user),
):
    pdf_bytes = export_service.report_to_pdf(req.report_type, req.content)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=report_{req.report_type}.pdf"},
    )
