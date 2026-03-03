import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.middleware.auth import require_any_user
from app.models.user import User, UserRole
from app.models.document import Document, DocumentStatus
from app.schemas.document import ComparisonRequest, ComparisonResponse
from app.services.comparison import comparison_service
from app.services.storage import storage_service
from app.services.document_processor import process_document
from app.services.audit import log_action

router = APIRouter(prefix="/compare", tags=["Policy Comparison"])


async def _verify_doc_access(doc_id: uuid.UUID, user: User, db: AsyncSession) -> Document:
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document {doc_id} not found")
    if user.role != UserRole.SUPER_ADMIN and doc.agency_id != user.agency_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if doc.status != DocumentStatus.READY:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Document {doc.original_filename} is not ready")
    return doc


@router.post("/", response_model=ComparisonResponse)
async def compare_documents(
    data: ComparisonRequest,
    request: Request,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    doc1 = await _verify_doc_access(data.document_id_1, current_user, db)
    doc2 = await _verify_doc_access(data.document_id_2, current_user, db)

    await log_action(
        db,
        action="policy_comparison",
        user_id=current_user.id,
        agency_id=current_user.agency_id,
        resource_type="comparison",
        details={
            "document_1": str(data.document_id_1),
            "document_2": str(data.document_id_2),
        },
        ip_address=request.client.host if request.client else None,
    )

    return await comparison_service.compare_policies(
        data.document_id_1, data.document_id_2, db
    )


@router.post("/upload", response_model=ComparisonResponse)
async def compare_uploaded_documents(
    request: Request,
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload two documents and compare them immediately."""
    documents = []
    for file in [file1, file2]:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only PDF files are accepted")

        contents = await file.read()
        import io
        s3_key = storage_service.upload_file(io.BytesIO(contents), current_user.agency_id, file.filename)

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

        await process_document(document.id, db)
        await db.refresh(document)

        if document.status != DocumentStatus.READY:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Failed to process {file.filename}: {document.error_message}",
            )
        documents.append(document)

    return await comparison_service.compare_policies(documents[0].id, documents[1].id, db)
