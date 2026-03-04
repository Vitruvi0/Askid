from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, agencies, documents, comparison, calculator, reports, admin, conversations, exports

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(agencies.router)
api_router.include_router(documents.router)
api_router.include_router(comparison.router)
api_router.include_router(calculator.router)
api_router.include_router(reports.router)
api_router.include_router(admin.router)
api_router.include_router(conversations.router)
api_router.include_router(exports.router)
