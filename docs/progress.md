# ASKID — Progress Tracker

## Last Updated: 2026-03-04

## Overall Status: MVP Complete — Stabilization Phase

---

## Backend API

### Authentication
- [x] Login endpoint (email/password → JWT)
- [x] Token refresh endpoint
- [x] JWT middleware with role extraction
- [x] Role-based access decorators (super_admin, admin, any_user)
- [ ] Password reset flow (email-based)
- [ ] Account lockout after failed attempts

### Documents
- [x] PDF upload to S3
- [x] Background document processing (extract → chunk → embed)
- [x] Document listing with pagination
- [x] Document deletion (S3 + DB)
- [x] Document Q&A (RAG pipeline)
- [x] Upload-and-ask (sync mode)
- [x] Status tracking (uploading → processing → ready → error)
- [x] Fix: race condition on upload
- [x] Fix: strict content-type validation
- [x] Fix: status polling
- [ ] Bulk upload support
- [ ] Document search/filter by name, date

### Comparison
- [x] Compare two existing documents
- [x] Upload two documents and compare
- [x] Structured comparison output (summary, table, analysis, conclusion)
- [ ] Save comparison history
- [ ] Export comparison as PDF

### Calculator
- [x] Pension gap calculation
- [x] TCM capital calculation
- [x] Life capital calculation
- [x] Three-tier results (min/recommended/prudential)
- [x] Formulas and assumptions in response
- [ ] Export results as PDF/CSV

### Reports
- [x] Report generation endpoint
- [ ] PDF report template
- [ ] Email-formatted report
- [ ] Report download endpoint

### Users
- [x] Get current user profile
- [x] Change password
- [x] List users (admin, agency-filtered)
- [x] Create user
- [x] Update user
- [x] Deactivate user
- [ ] Avatar upload
- [ ] User invitation flow

### Agencies
- [x] List agencies (super admin)
- [x] Create agency
- [x] Get agency details
- [x] Update agency
- [ ] Agency branding/customization
- [ ] Quota enforcement (max users, max documents)

### Admin
- [x] Dashboard statistics endpoint
- [x] Audit log listing with filters
- [ ] Export audit logs

### Infrastructure
- [x] Async database (SQLAlchemy + asyncpg)
- [x] S3 storage service (MinIO/AWS)
- [x] OpenAI integration (chat + embeddings)
- [x] Structured logging (structlog)
- [x] CORS configuration
- [x] Docker Compose (dev)
- [x] Docker Compose (prod)
- [x] Railway deployment
- [x] Fix: graceful pgvector fallback
- [ ] Health check endpoint
- [ ] Redis rate limiting enforcement
- [ ] Database migrations (Alembic) fully tested
- [ ] CI/CD pipeline

---

## Frontend

### Authentication
- [x] Login page
- [x] Zustand auth store
- [x] Token storage (localStorage)
- [x] Auto-redirect on auth state
- [x] API client with auto token refresh
- [ ] Password reset page
- [ ] "Remember me" option
- [ ] Session timeout warning

### Documents Page
- [x] File upload (PDF)
- [x] Document list with status icons
- [x] Document details panel
- [x] Q&A interface (ask questions, view answers)
- [x] Confidence badges
- [x] Source citations with page numbers
- [x] Auto-polling during processing
- [x] Delete with confirmation
- [ ] Drag-and-drop upload
- [ ] Document search/filter
- [ ] Conversation history per document

### Compare Page
- [x] Mode toggle (existing vs upload)
- [x] Document selection
- [x] Upload two files
- [x] Comparison results display
- [x] Comparison table
- [ ] Save comparison results
- [ ] Print/export comparison

### Calculator Page
- [x] Three-tab layout (Pension, TCM, Life)
- [x] Input forms with labels
- [x] Results display with tiers
- [x] Breakdown cards
- [x] Formulas and assumptions sections
- [ ] Input validation (frontend)
- [ ] Export results

### Reports Page
- [x] Basic page structure
- [ ] Template selection
- [ ] Report preview
- [ ] Download PDF

### Settings Page
- [x] Basic page structure
- [ ] Profile editing
- [ ] Password change form
- [ ] Notification preferences

### Admin Pages
- [x] Agencies CRUD (super admin)
- [x] Users CRUD (agency-scoped)
- [x] Audit log viewer
- [ ] Dashboard with stats/charts
- [ ] User invitation UI

### Layout & Navigation
- [x] Sidebar with role-based menu
- [x] Italian labels
- [x] User info display
- [x] Logout button
- [ ] Mobile responsive sidebar
- [ ] Dark mode
- [ ] Breadcrumbs

### Internationalization (i18n)
- [x] Full Italian localization — frontend UI (all pages, labels, toasts, placeholders)
- [x] Full Italian localization — backend API (error messages, log messages, API description)
- [x] HTML lang attribute set to `it`
- [x] Date formatting with `it-IT` locale
- [x] Sidebar navigation labels in Italian (Documenti, Confronta, Calcolatore, Report, Impostazioni, Agenzie, Utenti, Log Attività)
- [x] Admin section header: "Amministrazione"
- [ ] i18n framework for multi-language support (Italian primary, English secondary)

### Deployment
- [x] Vercel configuration (vercel.json)
- [x] Production build works
- [ ] Environment variable management
- [ ] Error boundary pages (404, 500)

---

## Known Issues
1. Railway PostgreSQL lacks pgvector — vector search degrades gracefully
2. Document processing polling is basic (3s interval, no websocket)
3. No email service — password reset not functional
4. Report generation UI incomplete
5. Some frontend pages may lack proper error states
6. No automated tests yet

---

## Recent Changes
- **2026-03-04** — Full Italian localization (i18n) across backend and frontend: all error messages, UI labels, navigation, toasts, placeholders, page titles, HTML lang, date locale
- `c68c406` — Fix PDF upload: race condition, strict content-type, missing status polling
- `92db543` — Remove pgvector from requirements (Railway Postgres lacks vector extension)
- `a83c48b` — Fix startup crash when pgvector is not available
- `fab0a0a` — Handle missing pgvector extension gracefully on startup
- `b4c1855` — Add vercel.json for frontend deployment
