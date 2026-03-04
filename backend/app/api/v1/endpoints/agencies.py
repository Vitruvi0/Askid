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
from app.schemas.agency import AgencyCreate, AgencyUpdate, AgencyResponse, AgencyOnboardingRequest, OnboardingResponse
from app.core.security import hash_password

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
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nome agenzia già esistente")

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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agenzia non trovata")
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
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agenzia non trovata")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agency, field, value)

    await db.flush()
    await db.refresh(agency)
    return agency


@router.post("/onboard", response_model=OnboardingResponse, status_code=status.HTTP_201_CREATED)
async def onboard_agency(
    data: AgencyOnboardingRequest,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """Crea agenzia e utente amministratore in un'unica operazione."""
    slug = slugify(data.agency_name)

    # Check slug uniqueness
    existing = await db.execute(select(Agency).where(Agency.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Nome agenzia già esistente")

    # Check admin email uniqueness
    existing_user = await db.execute(select(User).where(User.email == data.admin_email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email amministratore già in uso")

    # Validate password
    if len(data.admin_password) < 8:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="La password deve contenere almeno 8 caratteri")

    # Create agency
    agency = Agency(
        name=data.agency_name,
        slug=slug,
        email=data.agency_email,
        phone=data.agency_phone,
        address=data.agency_address,
        max_users=data.max_users,
        max_documents=data.max_documents,
    )
    db.add(agency)
    await db.flush()

    # Create admin user
    admin_user = User(
        email=data.admin_email,
        hashed_password=hash_password(data.admin_password),
        full_name=data.admin_full_name,
        role="agency_admin",
        agency_id=agency.id,
    )
    db.add(admin_user)
    await db.flush()
    await db.refresh(agency)

    return OnboardingResponse(
        agency=AgencyResponse.model_validate(agency),
        admin_user_id=admin_user.id,
        admin_email=admin_user.email,
    )
