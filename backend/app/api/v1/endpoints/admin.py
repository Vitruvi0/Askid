import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.middleware.auth import require_admin, require_super_admin
from app.middleware.tenant import agency_filter
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.models.document import Document
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Admin"])


class AuditLogResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID]
    agency_id: Optional[uuid.UUID]
    action: str
    resource_type: Optional[str]
    resource_id: Optional[str]
    details: Optional[dict]
    ip_address: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_documents: int
    total_queries: int


@router.get("/logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    skip: int = 0,
    limit: int = 100,
    action: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog)
    query = agency_filter(query, AuditLog, current_user)
    if action:
        query = query.where(AuditLog.action == action)
    query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    user_query = select(func.count()).select_from(User)
    active_query = select(func.count()).select_from(User).where(User.is_active == True)
    doc_query = select(func.count()).select_from(Document)
    query_count = select(func.count()).select_from(AuditLog).where(AuditLog.action == "document_query")

    if current_user.role != UserRole.SUPER_ADMIN:
        user_query = user_query.where(User.agency_id == current_user.agency_id)
        active_query = active_query.where(User.agency_id == current_user.agency_id)
        doc_query = doc_query.where(Document.agency_id == current_user.agency_id)
        query_count = query_count.where(AuditLog.agency_id == current_user.agency_id)

    total_users = (await db.execute(user_query)).scalar()
    active_users = (await db.execute(active_query)).scalar()
    total_docs = (await db.execute(doc_query)).scalar()
    total_queries = (await db.execute(query_count)).scalar()

    return DashboardStats(
        total_users=total_users,
        active_users=active_users,
        total_documents=total_docs,
        total_queries=total_queries,
    )
