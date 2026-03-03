from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1.router import api_router
from app.services.storage import storage_service
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ]
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting ASKID API", environment=settings.ENVIRONMENT)

    # Create tables (use Alembic in production)
    async with engine.begin() as conn:
        from sqlalchemy import text
        try:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        except Exception as e:
            logger.warning("pgvector extension not available - RAG features will be limited", error=str(e))
        await conn.run_sync(Base.metadata.create_all)

    # Ensure S3 bucket exists
    try:
        storage_service.ensure_bucket()
    except Exception as e:
        logger.warning("Could not initialize S3 bucket", error=str(e))

    # Create default super admin if not exists
    from app.core.database import async_session
    from sqlalchemy import select
    from app.models.user import User, UserRole
    from app.core.security import hash_password

    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.role == UserRole.SUPER_ADMIN)
        )
        if not result.scalar_one_or_none():
            admin = User(
                email="admin@askid.ai",
                hashed_password=hash_password("admin123!"),
                full_name="ASKID Super Admin",
                role=UserRole.SUPER_ADMIN,
                is_active=True,
            )
            db.add(admin)
            await db.commit()
            logger.info("Default super admin created: admin@askid.ai")

    yield

    # Shutdown
    await engine.dispose()
    logger.info("ASKID API shutdown complete")


app = FastAPI(
    title="ASKID API",
    description="AI-powered insurance agency assistant",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ASKID API"}
