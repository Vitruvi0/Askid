from fastapi import APIRouter, Depends
from app.middleware.auth import require_any_user
from app.models.user import User
from app.schemas.calculator import (
    PensionGapInput, PensionGapResult,
    TCMInput, TCMResult,
    LifeCapitalInput, LifeCapitalResult,
)
from app.services.calculator import calculator_service

router = APIRouter(prefix="/calculator", tags=["Insurance Calculator"])


@router.post("/pension-gap", response_model=PensionGapResult)
async def calculate_pension_gap(
    data: PensionGapInput,
    current_user: User = Depends(require_any_user),
):
    return calculator_service.calculate_pension_gap(data)


@router.post("/tcm", response_model=TCMResult)
async def calculate_tcm(
    data: TCMInput,
    current_user: User = Depends(require_any_user),
):
    return calculator_service.calculate_tcm(data)


@router.post("/life-capital", response_model=LifeCapitalResult)
async def calculate_life_capital(
    data: LifeCapitalInput,
    current_user: User = Depends(require_any_user),
):
    return calculator_service.calculate_life_capital(data)
