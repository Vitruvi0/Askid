# ASKID — AI-Powered Insurance Agency Assistant

## Project Overview
Multi-tenant SaaS platform for Italian insurance agencies. RAG-powered document Q&A, policy comparison, insurance calculators, report generation. Built with FastAPI + Next.js 15.

## Tech Stack
- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0 async, PostgreSQL 16 + pgvector
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Zustand
- **AI**: OpenAI GPT-4o (chat) + text-embedding-3-small (1536-dim embeddings)
- **Storage**: MinIO/S3-compatible, Redis (cache/rate-limit)
- **Auth**: JWT (30min access / 7day refresh), bcrypt, RBAC (super_admin, agency_admin, agency_user)
- **Deploy**: Docker Compose (dev + prod), Vercel (frontend), Railway (backend)

## Key Directories
```
backend/app/api/v1/endpoints/   # FastAPI route handlers
backend/app/core/               # Config, database, security
backend/app/middleware/          # Auth JWT + tenant isolation
backend/app/models/             # SQLAlchemy ORM models (User, Agency, Document, DocumentChunk, Conversation, Message, AuditLog)
backend/app/schemas/            # Pydantic request/response schemas
backend/app/services/           # Business logic (RAG, comparison, calculator, document_processor, embedding, storage)
frontend/src/app/               # Next.js pages (auth, dashboard, admin)
frontend/src/components/        # React components (Sidebar, DashboardLayout)
frontend/src/lib/api.ts         # API client with token refresh
frontend/src/hooks/useAuth.ts   # Zustand auth store
frontend/src/types/index.ts     # TypeScript interfaces
```

## Commands
```bash
# Dev
docker compose up -d                          # Start all services
cd backend && uvicorn app.main:app --reload   # Backend only
cd frontend && npm run dev                    # Frontend only
cd frontend && npm run build                  # Build frontend
cd frontend && npm run lint                   # Lint frontend

# Database
cd backend && alembic upgrade head            # Run migrations
cd backend && alembic revision --autogenerate -m "msg"  # New migration
```

## Architecture Rules
- All database queries go through SQLAlchemy async (never raw SQL)
- Every endpoint must enforce tenant isolation via `agency_filter()`
- Super admins bypass tenant filter; agency users see only their agency's data
- UUIDs for all primary keys
- All AI responses use temperature=0.1 for factual grounding
- Documents flow: upload → S3 → extract text (PyMuPDF) → chunk (800 tokens, 200 overlap) → embed → store in pgvector
- RAG: embed question → vector similarity top-8 chunks → LLM with context → structured JSON response

## Conventions
- Backend: Python, async/await everywhere, Pydantic for validation, structlog for logging
- Frontend: TypeScript strict, Tailwind CSS only (no CSS modules), Zustand for global state, react-hot-toast for notifications
- API routes prefixed with `/api/v1/`
- Italian throughout: UI labels, page titles, form labels, buttons, toasts, placeholders, table headers, error messages, backend API errors, log messages
- Navigation: Documenti, Confronta, Calcolatore, Report, Impostazioni, Agenzie, Utenti, Log Attività
- HTML `lang="it"`, dates formatted with `it-IT` locale
- Audit logging on every user action (login, upload, delete, query, comparison)

## Context Management
- After hitting 49% context usage: compress immediately
- After completing a plan: compress immediately

---

## Security Guidelines

### ⛔ CRITICAL: NEVER Hardcode Secrets or IDs
NEVER write API keys, tokens, passwords, project IDs, org IDs, or any identifier in code. This includes Vercel project/org IDs, Supabase URLs, Discord IDs, database connection strings, and any other infrastructure identifier. ALL must go in `.env`.

```python
# ❌ WRONG
API_KEY = "AIzaSy..."

# ✅ CORRECT
API_KEY = os.environ.get("GOOGLE_API_KEY")
```

When creating scripts with API keys:
- Use `os.environ.get()` (Python) or `process.env` (Node.js)
- Load from `.env` file using `python-dotenv` or `dotenv`
- Add variable to `.env.example` with placeholder
- Verify `.env` is in `.gitignore`

If you accidentally commit a secret:
- Revoke the key IMMEDIATELY
- Generate new key
- Update `.env`
- Old key is compromised forever (git history)

## Code Standards

### Path Handling
- Use relative paths: `.claude/scripts/`, `.claude/hooks/`
- Never hardcode absolute paths or home directories
- Use `os.path.join()` / `path.join()` for cross-platform compatibility

### Naming Conventions
- Python files: `snake_case.py`
- TypeScript files: `kebab-case.ts`, `PascalCase.tsx` (for components)
- Functions/Variables: `camelCase` (TS), `snake_case` (Python)
- Constants: `UPPER_SNAKE_CASE`

### Error Handling
- Use `try/except` (Python) or `try/catch` (TS) for async operations
- Provide helpful error messages
- Log errors with context
- Implement fallback mechanisms

### Testing
```bash
cd frontend && npm run lint           # Lint frontend
cd backend && pytest                  # Run backend tests
cd backend && pytest --cov            # Coverage report
```

## Important Notes
- **Secrets**: Never commit API keys (use environment variables)
- **Paths**: Use relative paths for all project files
- **API tests**: Required before production deploy
- **Backwards compatibility**: Don't break existing functionality
