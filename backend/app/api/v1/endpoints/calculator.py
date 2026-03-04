from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.middleware.auth import require_any_user
from app.models.user import User
from app.models.conversation import Conversation, Message, ConversationType, MessageRole
from app.schemas.calculator import (
    PensionGapInput, PensionGapResult,
    TCMInput, TCMResult,
    LifeCapitalInput, LifeCapitalResult,
)
from app.services.calculator import calculator_service

router = APIRouter(prefix="/calculator", tags=["Insurance Calculator"])

CALC_TITLES = {
    "pension": "Gap Pensionistico",
    "tcm": "Capitale TCM",
    "life": "Capitale Vita",
}


async def _save_calculator_conversation(
    db: AsyncSession, user: User, calc_type: str,
    input_data: dict, result_data: dict, summary: str,
):
    conversation = Conversation(
        user_id=user.id,
        agency_id=user.agency_id,
        conversation_type=ConversationType.CALCULATOR,
        title=f"Calcolo: {CALC_TITLES.get(calc_type, calc_type)}",
    )
    db.add(conversation)
    await db.flush()

    message = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=summary,
        metadata_json={"calc_type": calc_type, "input": input_data, "result": result_data},
    )
    db.add(message)
    await db.flush()


@router.post("/pension-gap", response_model=PensionGapResult)
async def calculate_pension_gap(
    data: PensionGapInput,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    result = calculator_service.calculate_pension_gap(data)
    await _save_calculator_conversation(
        db, current_user, "pension",
        data.model_dump(), result.model_dump(),
        f"Gap pensionistico: capitale raccomandato €{result.total_capital_needed_recommended:,.0f}",
    )
    return result


@router.post("/tcm", response_model=TCMResult)
async def calculate_tcm(
    data: TCMInput,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    result = calculator_service.calculate_tcm(data)
    await _save_calculator_conversation(
        db, current_user, "tcm",
        data.model_dump(), result.model_dump(),
        f"Capitale TCM: raccomandato €{result.total_capital_recommended:,.0f}",
    )
    return result


@router.post("/life-capital", response_model=LifeCapitalResult)
async def calculate_life_capital(
    data: LifeCapitalInput,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    result = calculator_service.calculate_life_capital(data)
    await _save_calculator_conversation(
        db, current_user, "life",
        data.model_dump(), result.model_dump(),
        f"Capitale Vita: raccomandato €{result.total_capital_recommended:,.0f}",
    )
    return result
