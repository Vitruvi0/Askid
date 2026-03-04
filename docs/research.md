# ASKID — Research & Technical Decisions

## LLM Provider Strategy

### Current: OpenAI (GPT-4o + text-embedding-3-small)
- **Chat model**: gpt-4o — best accuracy for insurance document analysis
- **Embedding model**: text-embedding-3-small — 1536 dimensions, good cost/quality ratio
- **Temperature**: 0.1 — near-deterministic for factual grounding
- **Alternative tested**: Gemini 2.0 Flash via OpenAI-compatible API
  - Free tier available
  - Different embedding model: text-embedding-004
  - Config in `.env.example` shows both options

### Considerations
- OpenAI API costs scale with usage (tokens processed)
- Gemini offers free tier but may have rate limits
- Architecture supports any OpenAI-compatible API via `OPENAI_BASE_URL`
- Future: allow agencies to bring their own API keys

## RAG Architecture Decisions

### Chunking Strategy
- **Chunk size**: 800 tokens with 200-token overlap
- **Rationale**: Insurance policies have interconnected clauses; overlap prevents losing context at chunk boundaries
- **Text extraction**: PyMuPDF (fitz) — fast, handles complex PDF layouts
- **Fallback**: pdfplumber available for edge cases

### Vector Search
- **Database**: pgvector extension for PostgreSQL
- **Embedding dimensions**: 1536 (text-embedding-3-small default)
- **Top-K retrieval**: 8 chunks per query
- **Similarity metric**: Cosine similarity
- **Known limitation**: Railway PostgreSQL doesn't support pgvector — needs alternative for production vector search

### Alternatives Considered
| Option | Pros | Cons | Status |
|--------|------|------|--------|
| pgvector (current) | No extra infra, SQL-native | Railway doesn't support it | Used in dev |
| Pinecone | Managed, scalable | Extra service, cost | Not implemented |
| Qdrant | Open-source, good perf | Extra container | Not implemented |
| ChromaDB | Simple, Python-native | Not production-scale | Not implemented |
| Supabase | pgvector + managed | Migration effort | Worth exploring |

### Recommendation
For production without pgvector, consider:
1. **Supabase** — managed PostgreSQL with pgvector support, easy migration
2. **Neon** — serverless PostgreSQL with pgvector
3. **Pinecone** — if willing to add external vector DB

## Authentication Design

### JWT vs Session-Based
**Chosen: JWT (stateless)**
- Pros: no server-side session storage, works with multiple backends, simple to implement
- Cons: can't revoke individual tokens, token size in headers
- Mitigation: short access token expiry (30 min), refresh token rotation

### Token Storage
**Chosen: localStorage**
- Simpler than httpOnly cookies for SPA
- Trade-off: vulnerable to XSS (mitigated by React's auto-escaping)
- Alternative: httpOnly cookies would prevent XSS token theft but complicate CORS

## Database Decisions

### PostgreSQL 16
- Mature, reliable, strong JSON support
- pgvector extension for vector similarity search
- Async support via asyncpg driver
- SQLAlchemy 2.0 for ORM (async sessions)

### UUID Primary Keys
- Prevents ID enumeration attacks
- Safe to expose in URLs and APIs
- Slight performance cost vs integer IDs (acceptable for this scale)

### Multi-Tenancy: Shared Database, Row-Level Isolation
- All tenants share same tables with `agency_id` foreign key
- Simpler ops than database-per-tenant
- Enforced via `agency_filter()` middleware on every query
- Super admin bypasses filter

## Frontend Decisions

### Next.js 15 (App Router)
- Server-side rendering for initial page loads
- React 19 with latest features
- Built-in routing, layouts, loading states
- Vercel-optimized deployment

### Zustand over Redux/Context
- Minimal boilerplate for auth store
- No provider wrapping needed
- TypeScript-friendly
- Sufficient for current state needs (user + auth tokens)

### Tailwind CSS over CSS Modules
- Utility-first, fast development
- Consistent design system
- No class name conflicts
- Good IDE support with Tailwind IntelliSense

## Document Processing Pipeline

### Current Flow
```
Upload → S3 → Background Task → PyMuPDF → Chunk → Embed → Store
```

### Bottlenecks
1. **Embedding API calls**: Sequential, ~100ms per chunk
   - Future: batch embedding requests
2. **Large PDFs**: 100+ pages can take 2+ minutes
   - Future: parallel page processing
3. **Status polling**: Client polls every 3s
   - Future: WebSocket or SSE for real-time updates

## Insurance-Specific Research

### Italian Insurance Market
- Policies are typically in Italian
- Key document sections: Condizioni Generali, Condizioni Particolari, Allegati
- Common policy types: RC Auto, Vita, Infortuni, Salute, Casa, Professionale
- Regulatory body: IVASS (Istituto per la Vigilanza sulle Assicurazioni)

### Localization (i18n) — Implemented
- **Approach**: Hardcoded Italian strings (no i18n framework yet)
- Full Italian localization applied across all layers:
  - Frontend: all page titles, labels, buttons, toasts, placeholders, table headers, status badges, navigation
  - Backend: all HTTP error detail messages, log messages, API description
  - HTML `lang="it"`, date formatting `it-IT`
- **Trade-off**: Fast to implement, but adding a second language later will require an i18n framework (e.g., next-intl or react-i18next)
- **Future**: Phase 4 plans to add i18n framework for multi-language support (Italian primary, English secondary)

### Calculator Formulas
- **Pension gap**: Based on Italian public pension system (INPS) replacement rates
- **TCM**: Standard temporary death insurance calculation
- **Life capital**: Standard life insurance needs analysis
- Safety margins: 20% (recommended) and 40% (prudential) — industry standard

### AI Safety for Insurance
- No hallucinated coverage claims
- Always cite source document sections
- Confidence scoring prevents overconfident wrong answers
- System prompts explicitly forbid inventing policy terms
- Temperature 0.1 minimizes creative responses

## Deployment Research

### Vercel (Frontend)
- Free tier sufficient for MVP
- Automatic HTTPS, CDN, preview deployments
- `vercel.json` configured for Next.js App Router

### Railway (Backend)
- Simple deployment from GitHub
- Managed PostgreSQL (but no pgvector)
- Managed Redis
- Auto-scaling available
- Cost: usage-based pricing

### Production Gaps
1. No pgvector on Railway → RAG quality reduced
2. No email service configured → password reset disabled
3. No CDN for S3 documents → direct S3 access only
4. No monitoring/alerting → blind to issues
5. No CI/CD → manual deployments
