import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.conversation import ConversationType, MessageRole


class MessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: MessageRole
    content: str
    metadata_json: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: uuid.UUID
    conversation_type: ConversationType
    title: Optional[str]
    document_ids: Optional[list] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailResponse(ConversationResponse):
    messages: List[MessageResponse] = []


class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
    total: int
