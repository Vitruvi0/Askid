import uuid
import re
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.middleware.auth import require_super_admin
from app.models.user import User
from app.models.agency import Agency
from app.schemas.agency import AgencyCreate, AgencyUpdate, AgencyResponse

router = APIRouter(prefix="/agencies", tags=["Agencies"])


def slugify(name: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", name.lower())
    return re.sub(r"[-\s]+", "-", slug).strip("-")


@router.get("/", response_model=List[AgencyResponse])
async def list_agencies(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Agency).offset(skip).limit(limit).order_by(Agency.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=AgencyResponse, status_code=status.HTTP_201_CREATED)
async def create_agency(
    data: AgencyCreate,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    slug = slugify(data.name)

    # Check slug uniqueness
    existing = await db.execute(select(Agency).where(Agency.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Agency name already exists")

    agency = Agency(
        name=data.name,
        slug=slug,
        email=data.email,
        phone=data.phone,
        address=data.address,
        max_users=data.max_users,
        max_documents=data.max_documents,
    )
    db.add(agency)
    await db.flush()
    await db.refresh(agency)
    return agency


@router.get("/{agency_id}", response_model=AgencyResponse)
async def get_agency(
    agency_id: uuid.UUID,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Agency).where(Agency.id == agency_id))
    agency = result.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agency not found")
    return agency


@router.put("/{agency_id}", response_model=AgencyResponse)
async def update_agency(
    agency_id: uuid.UUID,
    data: AgencyUpdate,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Agency).where(Agency.id == agency_id))
    agency = result.scalar_one_or_none()
    if not agency:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agency not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agency, field, value)

    await db.flush()
    await db.refresh(agency)
    return agency
