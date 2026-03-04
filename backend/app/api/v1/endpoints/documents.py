import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, BackgroundTasks, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db, async_session
from app.middleware.auth import get_current_user, require_any_user
from app.middleware.tenant import agency_filter
from app.models.user import User
from app.models.document import Document, DocumentChunk, DocumentStatus
from app.models.conversation import Conversation, Message, ConversationType, MessageRole
from app.schemas.document import DocumentResponse, DocumentListResponse, QuestionRequest, QAResponse
from app.services.storage import storage_service
from app.services.document_processor import process_document
from app.services.rag import rag_service
from app.services.audit import log_action

router = APIRouter(prefix="/documents", tags=["Documents"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


async def _process_document_background(document_id: uuid.UUID):
    async with async_session() as db:
        try:
            await process_document(document_id, db)
            await db.commit()
        except Exception:
            await db.rollback()


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = Query(None, description="Cerca per nome file"),
    doc_status: Optional[DocumentStatus] = Query(None, alias="status", description="Filtra per stato"),
    date_from: Optional[datetime] = Query(None, description="Data inizio"),
    date_to: Optional[datetime] = Query(None, description="Data fine"),
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Document)
    query = agency_filter(query, Document, current_user)

    if search:
        query = query.where(Document.original_filename.ilike(f"%{search}%"))
    if doc_status:
        query = query.where(Document.status == doc_status)
    if date_from:
        query = query.where(Document.created_at >= date_from)
    if date_to:
        query = query.where(Document.created_at <= date_to)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.offset(skip).limit(limit).order_by(Document.created_at.desc())
    result = await db.execute(query)
    documents = result.scalars().all()

    return DocumentListResponse(documents=documents, total=total)


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sono accettati solo file PDF")

    ALLOWED_PDF_TYPES = {"application/pdf", "application/x-pdf", "application/octet-stream"}
    if file.content_type and file.content_type not in ALLOWED_PDF_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo di file non valido")

    # Read and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File troppo grande (max 50MB)")

    import io
    file_obj = io.BytesIO(contents)

    # Upload to S3
    s3_key = storage_service.upload_file(file_obj, current_user.agency_id, file.filename)

    # Create document record
    document = Document(
        agency_id=current_user.agency_id,
        uploaded_by=current_user.id,
        filename=f"{uuid.uuid4()}.pdf",
        original_filename=file.filename,
        file_size=len(contents),
        s3_key=s3_key,
        status=DocumentStatus.UPLOADING,
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)

    await log_action(
        db,
        action="document_upload",
        user_id=current_user.id,
        agency_id=current_user.agency_id,
        resource_type="document",
        resource_id=str(document.id),
        details={"filename": file.filename, "size": len(contents)},
        ip_address=request.client.host if request.client else None,
    )

    # Commit before scheduling background task to avoid race condition
    await db.commit()

    # Process in background
    background_tasks.add_task(_process_document_background, document.id)

    return document


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento non trovato")

    from app.models.user import UserRole
    if current_user.role != UserRole.SUPER_ADMIN and document.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso negato")

    return document


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento non trovato")

    from app.models.user import UserRole
    if current_user.role != UserRole.SUPER_ADMIN and document.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso negato")

    # Delete from S3
    storage_service.delete_file(document.s3_key)

    await log_action(
        db,
        action="document_delete",
        user_id=current_user.id,
        agency_id=current_user.agency_id,
        resource_type="document",
        resource_id=str(document.id),
        details={"filename": document.original_filename},
        ip_address=request.client.host if request.client else None,
    )

    # Delete from DB (cascades to chunks)
    await db.delete(document)
    await db.flush()
    return {"message": "Documento eliminato definitivamente"}


@router.post("/ask", response_model=QAResponse)
async def ask_question(
    data: QuestionRequest,
    request: Request,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify document access
    result = await db.execute(select(Document).where(Document.id == data.document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento non trovato")

    from app.models.user import UserRole
    if current_user.role != UserRole.SUPER_ADMIN and document.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso negato")

    if document.status != DocumentStatus.READY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Il documento non è ancora stato elaborato")

    # Get or create conversation
    conversation = None
    if data.conversation_id:
        conv_result = await db.execute(
            select(Conversation).where(Conversation.id == data.conversation_id)
        )
        conversation = conv_result.scalar_one_or_none()
        if not conversation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversazione non trovata")
        if current_user.role != UserRole.SUPER_ADMIN and conversation.agency_id != current_user.agency_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso negato")

    if not conversation:
        conversation = Conversation(
            user_id=current_user.id,
            agency_id=current_user.agency_id,
            conversation_type=ConversationType.DOCUMENT_QA,
            title=data.question[:100],
            document_ids=[str(data.document_id)],
        )
        db.add(conversation)
        await db.flush()

    # Save user message
    user_msg = Message(
        conversation_id=conversation.id,
        role=MessageRole.USER,
        content=data.question,
    )
    db.add(user_msg)

    await log_action(
        db,
        action="document_query",
        user_id=current_user.id,
        agency_id=current_user.agency_id,
        resource_type="document",
        resource_id=str(document.id),
        details={"question": data.question[:200]},
        ip_address=request.client.host if request.client else None,
    )

    qa_result = await rag_service.answer_question(data.question, data.document_id, db)

    # Save assistant message with full response metadata
    assistant_msg = Message(
        conversation_id=conversation.id,
        role=MessageRole.ASSISTANT,
        content=qa_result.answer,
        metadata_json=qa_result.model_dump(mode="json"),
    )
    db.add(assistant_msg)
    await db.flush()

    qa_result.conversation_id = conversation.id
    return qa_result


@router.post("/upload-and-ask", response_model=QAResponse)
async def upload_and_ask(
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    question: str = "",
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document and immediately ask a question about it."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sono accettati solo file PDF")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File troppo grande")

    import io
    file_obj = io.BytesIO(contents)
    s3_key = storage_service.upload_file(file_obj, current_user.agency_id, file.filename)

    document = Document(
        agency_id=current_user.agency_id,
        uploaded_by=current_user.id,
        filename=f"{uuid.uuid4()}.pdf",
        original_filename=file.filename,
        file_size=len(contents),
        s3_key=s3_key,
        status=DocumentStatus.UPLOADING,
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)

    # Process synchronously for immediate Q&A
    await process_document(document.id, db)
    await db.refresh(document)

    if document.status != DocumentStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Elaborazione documento fallita: {document.error_message}",
        )

    if not question:
        return QAResponse(
            answer="Documento caricato ed elaborato con successo. Ora puoi fare domande su di esso.",
            referenced_sections=[],
            quoted_passages=[],
            exclusions_and_limits=[],
            sources=[],
            confidence="high",
        )

    return await rag_service.answer_question(question, document.id, db)
