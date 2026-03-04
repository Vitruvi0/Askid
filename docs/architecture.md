# ASKID — Architecture Document

## System Overview

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│    Vercel CDN    │         │     Railway      │         │    Railway       │
│   Next.js 15     │────────▶│   FastAPI API    │────────▶│   PostgreSQL 16  │
│   (Frontend)     │  HTTPS  │   (Backend)      │  async  │   + pgvector     │
└──────────────────┘         └────────┬─────────┘         └──────────────────┘
                                      │
                              ┌───────┼───────┐
                              │       │       │
                         ┌────▼──┐ ┌──▼───┐ ┌─▼──────┐
                         │ Redis │ │  S3  │ │ OpenAI │
                         │ Cache │ │MinIO │ │  API   │
                         └───────┘ └──────┘ └────────┘
```

## Backend Architecture

### Layer Structure
```
Endpoints (API Layer)
    ↓ request validation (Pydantic schemas)
Middleware (Auth + Tenant Isolation)
    ↓ authenticated user + agency context
Services (Business Logic)
    ↓ domain operations
Models (Data Layer - SQLAlchemy ORM)
    ↓ async queries
PostgreSQL + pgvector
```

### Request Flow
1. Client sends HTTP request with `Authorization: Bearer <jwt>`
2. CORS middleware validates origin
3. Auth middleware decodes JWT, loads user from DB, checks `is_active`
4. Role-based decorator (`require_admin`, `require_any_user`) validates permissions
5. Tenant middleware applies `agency_id` filter to all queries
6. Endpoint handler calls service layer
7. Service executes business logic, returns result
8. Response serialized via Pydantic schema

**Note:** All API error messages are in Italian (e.g., "Accesso negato", "Utente non trovato"). Log messages are also in Italian.

### Multi-Tenancy Model
```
Agency (Tenant)
  ├── Users[]        — agency_id FK, filtered on every query
  ├── Documents[]    — agency_id FK, S3 keys namespaced per agency
  ├── Conversations[]— agency_id FK
  └── AuditLogs[]   — agency_id FK

Super Admin: bypasses all tenant filters
Agency Admin: sees only their agency's data, can manage users
Agency User: sees only their agency's data, read/write documents
```

### Database Schema (ERD)
```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   Agency    │────<│    User      │────<│  Conversation  │
│             │     │              │     │                │
│ id (UUID)   │     │ id (UUID)    │     │ id (UUID)      │
│ name        │     │ email        │     │ user_id (FK)   │
│ slug        │     │ hashed_pass  │     │ agency_id (FK) │
│ max_users   │     │ role (enum)  │     │ type (enum)    │
│ max_docs    │     │ agency_id FK │     │ document_ids   │
│ is_active   │     │ is_active    │     └───────┬────────┘
└──────┬──────┘     └──────────────┘             │
       │                                    ┌────▼────────┐
       │                                    │   Message   │
  ┌────▼──────────┐                         │             │
  │   Document    │                         │ id (UUID)   │
  │               │                         │ role (enum) │
  │ id (UUID)     │                         │ content     │
  │ agency_id FK  │                         └─────────────┘
  │ uploaded_by   │
  │ filename      │     ┌─────────────────┐
  │ s3_key        │────<│ DocumentChunk   │
  │ status (enum) │     │                 │
  │ page_count    │     │ id (UUID)       │
  └───────────────┘     │ chunk_index     │
                        │ content         │
  ┌───────────────┐     │ page_number     │
  │   AuditLog   │     │ embedding (vec) │
  │               │     │ token_count     │
  │ id (UUID)     │     └─────────────────┘
  │ user_id FK    │
  │ agency_id FK  │
  │ action        │
  │ resource_type │
  │ details (JSON)│
  │ ip_address    │
  └───────────────┘
```

### RAG Pipeline
```
Document Upload Flow:
  PDF file → S3 upload → Background task starts
    → PyMuPDF text extraction (per page)
    → Chunking (800 tokens, 200 overlap)
    → OpenAI embedding (text-embedding-3-small, 1536-dim)
    → Store chunks + embeddings in DocumentChunk table
    → Update document status: processing → ready

Question Answering Flow:
  User question
    → Embed question (OpenAI)
    → pgvector cosine similarity search (top 8 chunks)
    → Build context from matching chunks
    → GPT-4o prompt (system: insurance expert, no hallucination)
    → Temperature 0.1 for factual accuracy
    → Structured JSON response (answer, sections, quotes, confidence)
```

### Policy Comparison Flow
```
  Two documents selected
    → Extract full content from both
    → GPT-4o comparative analysis prompt
    → Returns: executive summary, comparison table, technical analysis, conclusion
    → Table format: category | doc1 value | doc2 value | notes
```

### Calculator Services
```
  Pension Gap:    current_income × pension_rate → gap → capital needed (PV formula)
  TCM Capital:    income_replacement + debt_coverage + education_fund
  Life Capital:   income_replacement (discounted) + mortgage + emergency_fund

  All include: minimum / recommended (+20%) / prudential (+40%) tiers
  All return: formulas used + assumptions list
```

## Frontend Architecture

### Page Structure
```
app/
├── layout.tsx              ← Root: Inter font, Toaster provider, lang="it"
├── page.tsx                ← Redirect to /dashboard or /auth/login
├── auth/login/             ← Public: email/password form (Italian labels)
├── dashboard/
│   ├── layout.tsx          ← Protected: Sidebar + auth guard
│   ├── documents/          ← Upload PDF, list, Q&A panel
│   ├── compare/            ← Select/upload 2 docs, view comparison
│   ├── calculator/         ← 3-tab calculator (pension, TCM, life)
│   ├── reports/            ← Generate reports
│   └── settings/           ← User profile + password change
└── admin/
    ├── layout.tsx          ← Admin guard (super_admin/agency_admin)
    ├── agencies/           ← CRUD agencies (super_admin only)
    ├── users/              ← CRUD users (agency-scoped)
    └── logs/               ← Audit log viewer
```

**All UI is fully localized in Italian** — page titles, form labels, button text, toast notifications, error messages, placeholders, table headers, and status labels.

### State Management
```
Zustand Store (useAuth):
  - user: User | null
  - loading: boolean
  - login(email, password) → API call → set user
  - logout() → clear tokens → redirect
  - fetchUser() → GET /users/me → set user

API Client (lib/api.ts):
  - Singleton class, base URL from env
  - Auto-attaches JWT from localStorage
  - Auto-refreshes on 401 (one retry)
  - Typed methods for every endpoint
  - Error messages in Italian ("Autenticazione fallita", "Richiesta fallita", "Accesso fallito")
```

### Authentication Flow (Frontend)
```
1. User visits any page
2. Layout checks localStorage for token
3. No token → redirect to /auth/login
4. Has token → fetchUser() → API validates
5. Valid → render page with user context
6. Invalid/expired → auto-refresh attempt
7. Refresh fails → clear tokens → redirect to login
```

## Security Architecture

### Defense Layers
```
Layer 1: CORS (origin whitelist)
Layer 2: Rate Limiting (Redis-backed, per IP)
Layer 3: JWT Validation (signature + expiry)
Layer 4: Role-Based Access Control (decorators)
Layer 5: Tenant Isolation (agency_id filter)
Layer 6: Input Validation (Pydantic schemas)
Layer 7: SQL Injection Prevention (SQLAlchemy ORM)
Layer 8: XSS Prevention (React auto-escaping)
Layer 9: File Security (private S3, no public URLs)
```

### Token Strategy
```
Access Token:  30 min expiry, contains user_id + email + role + agency_id
Refresh Token: 7 day expiry, used to get new access token
Storage:       localStorage (frontend)
Transport:     Authorization: Bearer header (HTTPS only in prod)
```

## Infrastructure

### Development (Docker Compose)
| Service    | Port  | Image              |
|------------|-------|--------------------|
| PostgreSQL | 5432  | postgres:16 + pgvector |
| Redis      | 6379  | redis:7-alpine     |
| MinIO      | 9000/9001 | minio/minio    |
| Backend    | 8000  | python:3.12-slim   |
| Frontend   | 3000  | node:20-alpine     |

### Production
| Service    | Platform | Notes              |
|------------|----------|--------------------|
| Frontend   | Vercel   | SSR, Edge CDN      |
| Backend    | Railway  | Uvicorn, auto-scale |
| PostgreSQL | Railway  | Managed, no pgvector yet |
| Redis      | Railway  | Managed             |
| S3         | Railway/AWS | Document storage  |
