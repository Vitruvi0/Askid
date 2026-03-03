import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db, async_session
from app.middleware.auth import get_current_user, require_any_user
from app.middleware.tenant import agency_filter
from app.models.user import User
from app.models.document import Document, DocumentChunk, DocumentStatus
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
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Document)
    query = agency_filter(query, Document, current_user)

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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are accepted")

    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type")

    # Read and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large (max 50MB)")

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    from app.models.user import UserRole
    if current_user.role != UserRole.SUPER_ADMIN and document.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    from app.models.user import UserRole
    if current_user.role != UserRole.SUPER_ADMIN and document.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

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
    return {"message": "Document permanently deleted"}


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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    from app.models.user import UserRole
    if current_user.role != UserRole.SUPER_ADMIN and document.agency_id != current_user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if document.status != DocumentStatus.READY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document is not yet processed")

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

    return await rag_service.answer_question(data.question, data.document_id, db)


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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are accepted")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

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
            detail=f"Document processing failed: {document.error_message}",
        )

    if not question:
        return QAResponse(
            answer="Document uploaded and processed successfully. You can now ask questions about it.",
            referenced_sections=[],
            quoted_passages=[],
            exclusions_and_limits=[],
            sources=[],
            confidence="high",
        )

    return await rag_service.answer_question(question, document.id, db)
