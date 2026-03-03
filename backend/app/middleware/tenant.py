import uuid
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User, UserRole
from app.models.document import Document


async def verify_document_access(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Document:
    """Verify that the current user has access to the specified document."""
    result = await db.execute(select(Document).where(Document.id == document_id))
    document = result.scalar_one_or_none()

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if current_user.role == UserRole.SUPER_ADMIN:
        return document

    if document.agency_id != current_user.agency_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this document",
        )

    return document


def agency_filter(query, model, current_user: User):
    """Apply agency-based tenant filtering to a query."""
    if current_user.role == UserRole.SUPER_ADMIN:
        return query
    return query.where(model.agency_id == current_user.agency_id)
