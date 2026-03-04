import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.middleware.auth import require_any_user
from app.middleware.tenant import agency_filter
from app.models.user import User, UserRole
from app.models.conversation import Conversation, ConversationType, Message
from app.schemas.conversation import (
    ConversationResponse,
    ConversationDetailResponse,
    ConversationListResponse,
)
from app.services.audit import log_action

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("/", response_model=ConversationListResponse)
async def list_conversations(
    skip: int = 0,
    limit: int = 20,
    conv_type: Optional[ConversationType] = Query(None, alias="type"),
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Conversation)
    query = agency_filter(query, Conversation, current_user)

    if conv_type:
        query = query.where(Conversation.conversation_type == conv_type)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.offset(skip).limit(limit).order_by(Conversation.updated_at.desc())
    result = await db.execute(query)
    conversations = result.scalars().all()

    return ConversationListResponse(conversations=conversations, total=total)


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversazione non trovata")

    if current_user.role != UserRole.SUPER_ADMIN and conversation.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso negato")

    return conversation


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversazione non trovata")

    if current_user.role != UserRole.SUPER_ADMIN and conversation.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso negato")

    await log_action(
        db,
        action="conversation_delete",
        user_id=current_user.id,
        agency_id=current_user.agency_id,
        resource_type="conversation",
        resource_id=str(conversation.id),
        details={"title": conversation.title},
        ip_address=request.client.host if request.client else None,
    )

    await db.delete(conversation)
    await db.flush()
    return {"message": "Conversazione eliminata"}
