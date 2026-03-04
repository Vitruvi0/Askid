# ASKID — Development Plan

## Current State (as of 2026-03-04)
The core platform is built and functional with:
- Full backend API (auth, documents, comparison, calculator, reports, admin)
- Full frontend UI (login, dashboard pages, admin pages)
- Complete Italian localization (backend + frontend)
- Docker Compose dev/prod setup
- Deployed: frontend on Vercel, backend on Railway

## Phase 1: Stabilization & Bug Fixes (Current)
- [x] Fix PDF upload race condition and content-type validation
- [x] Handle missing pgvector extension gracefully
- [x] Add Vercel deployment config
- [ ] Fix any remaining CORS issues between Vercel frontend and Railway backend
- [ ] Test full document processing pipeline end-to-end in production
- [ ] Verify token refresh flow works reliably
- [ ] Test all calculator endpoints with real insurance data
- [ ] Verify audit logging captures all actions correctly

## Phase 2: Production Hardening
- [ ] Add comprehensive error handling on all frontend pages
- [ ] Add loading states and skeleton screens
- [ ] Add input validation on all frontend forms (not just backend)
- [ ] Implement proper 404/500 error pages
- [ ] Add request timeout handling in API client
- [ ] Add retry logic for failed document processing
- [ ] Set up health check endpoints
- [ ] Configure proper logging aggregation
- [ ] Add rate limiting enforcement (Redis-backed)

## Phase 3: Feature Completion
- [ ] Complete report generation UI (template selection, download PDF)
- [ ] Add document history/conversation persistence
- [ ] Add bulk document upload
- [ ] Add document search/filtering (by name, date, status)
- [ ] Add comparison history (save and revisit)
- [ ] Add calculator result export (PDF/CSV)
- [ ] Add user profile page with avatar upload
- [ ] Add password reset flow (email-based)
- [ ] Add agency branding/customization

## Phase 4: Polish & UX
- [ ] Responsive design audit (mobile/tablet)
- [ ] Dark mode support
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Add onboarding flow for new agencies
- [ ] Add in-app help/tooltips
- [x] Italian localization — full i18n of all UI labels, backend error messages, navigation, toasts, placeholders
- [ ] i18n framework for multi-language support (Italian primary, English secondary)

## Phase 5: Scale & Advanced Features
- [ ] Multi-model LLM support (switch between OpenAI/Gemini/Anthropic)
- [ ] Webhook integrations (notify on document processing complete)
- [ ] API key management (allow agencies to use their own LLM keys)
- [ ] Usage analytics dashboard (tokens consumed, documents processed)
- [ ] Automated backup system
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Staging environment
- [ ] Load testing

## Deployment Architecture
```
Production:
  Frontend → Vercel (Next.js SSR)
  Backend  → Railway (FastAPI + Uvicorn)
  Database → Railway PostgreSQL (no pgvector currently)
  Storage  → Railway / External S3
  Redis    → Railway Redis

Development:
  All services → Docker Compose (localhost)
  PostgreSQL with pgvector extension
  MinIO for S3-compatible storage
```

## Known Issues
1. Railway PostgreSQL lacks pgvector extension — vector search falls back gracefully but RAG quality may be affected
2. Document processing is async but status polling is basic (3s interval)
3. No email service configured — password reset not functional
4. Report generation UI may be incomplete
