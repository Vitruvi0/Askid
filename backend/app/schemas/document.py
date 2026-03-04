import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel
from app.models.document import DocumentStatus


class DocumentResponse(BaseModel):
    id: uuid.UUID
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    status: DocumentStatus
    page_count: Optional[int]
    chunk_count: int
    error_message: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class QuestionRequest(BaseModel):
    question: str
    document_id: uuid.UUID
    conversation_id: Optional[uuid.UUID] = None


class QuestionWithUploadRequest(BaseModel):
    question: str


class SourceChunk(BaseModel):
    content: str
    page_number: Optional[int]
    section_title: Optional[str]
    relevance_score: float


class QAResponse(BaseModel):
    answer: str
    referenced_sections: List[str]
    quoted_passages: List[str]
    exclusions_and_limits: List[str]
    sources: List[SourceChunk]
    confidence: str
    conversation_id: Optional[uuid.UUID] = None


class ComparisonRequest(BaseModel):
    document_id_1: uuid.UUID
    document_id_2: uuid.UUID


class ComparisonCategory(BaseModel):
    category: str
    document_1: str
    document_2: str
    notes: str


class ComparisonResponse(BaseModel):
    executive_summary: str
    comparison_table: List[ComparisonCategory]
    technical_analysis: str
    conclusion: str
    incomplete_areas: List[str]
