# ASKID — Product Requirements Document

## Product Vision
ASKID is an AI-powered assistant for Italian insurance agencies that transforms how agents analyze policies, compare coverage, and advise clients. By leveraging RAG technology, ASKID lets agents upload any insurance policy PDF and instantly get accurate, grounded answers — eliminating hours of manual document review.

## Target Users

### Primary: Insurance Agents (Agency Users)
- Daily workflow: review client policies, compare options, prepare recommendations
- Pain point: manually reading 50+ page policy documents is slow and error-prone
- Need: instant, accurate answers about coverage, exclusions, limits

### Secondary: Agency Managers (Agency Admins)
- Manage team of agents within their agency
- Need visibility into document usage and team activity
- Want to ensure compliance and audit trail

### Tertiary: Platform Operator (Super Admin)
- Manages the multi-tenant platform
- Onboards new agencies, monitors usage
- Needs cross-agency visibility and control

## Core Features

### 1. Document Q&A (RAG)
**Priority: P0 — Core value proposition**

Users upload insurance policy PDFs and ask natural language questions. The system:
- Extracts text from PDF pages
- Chunks and embeds content for semantic search
- Retrieves relevant passages via vector similarity
- Generates grounded answers with source citations

**Key requirements:**
- Answers must cite specific sections and page numbers
- Confidence scoring (high/medium/low) on every response
- No hallucination — if the answer isn't in the document, say so
- Support for Italian-language documents and questions
- Processing status visible to user (uploading → processing → ready)

### 2. Policy Comparison
**Priority: P0 — Key differentiator**

Side-by-side comparison of two insurance policies across all dimensions:
- Executive summary of key differences
- Structured comparison table (category, policy A, policy B, notes)
- Technical analysis of coverage gaps
- Conclusion with recommendation

**Key requirements:**
- Compare existing uploaded documents or upload two new ones
- Highlight advantages/disadvantages of each policy
- Flag incomplete areas or missing information

### 3. Insurance Calculators
**Priority: P1 — High value for client advisory**

Three specialized calculators:

**Pension Gap Calculator:**
- Inputs: current age, retirement age, current income, desired income, inflation rate
- Outputs: pension gap, capital needed (3 tiers), monthly savings required

**TCM Capital Calculator:**
- Inputs: annual income, years to cover, dependents, outstanding debts, education costs
- Outputs: total capital needed (income replacement + debt + education)

**Life Capital Calculator:**
- Inputs: age, annual income, mortgage balance, emergency fund months
- Outputs: recommended life insurance capital (income + mortgage + emergency)

**Key requirements:**
- All calculations show formulas used and assumptions
- Three tiers: minimum, recommended (+20%), prudential (+40%)
- Results exportable (future: PDF/CSV)

### 4. Report Generation
**Priority: P1 — Completes the advisory workflow**

Generate professional reports from analysis results:
- **Technical Report**: detailed analysis for internal use
- **Client Report**: simplified, presentable summary for clients
- **Email Report**: formatted for direct email sending

### 5. Multi-Tenant Agency Management
**Priority: P0 — Required for SaaS model**

- Each agency is a completely isolated tenant
- Agency admins manage their own users
- Configurable quotas (max users, max documents)
- Super admin manages all agencies

### 6. Audit Logging
**Priority: P0 — Required for compliance**

Every user action is logged:
- Document uploads, deletions, queries
- Login/logout events
- User management actions
- Comparison and calculator usage

Logs include: timestamp, user, agency, action, resource, IP address.
GDPR-compliant with support for data deletion.

## User Roles & Permissions

| Capability | Super Admin | Agency Admin | Agency User |
|------------|:-----------:|:------------:|:-----------:|
| Manage agencies | Yes | No | No |
| Manage users | All agencies | Own agency | No |
| View audit logs | All | Own agency | No |
| Upload documents | Yes | Yes | Yes |
| Query documents | Yes | Yes | Yes |
| Compare policies | Yes | Yes | Yes |
| Use calculators | Yes | Yes | Yes |
| Generate reports | Yes | Yes | Yes |
| Delete documents | Yes | Own agency | Own docs |

## Non-Functional Requirements

### Performance
- Document upload + processing: < 60 seconds for a 50-page PDF
- Q&A response time: < 10 seconds
- Policy comparison: < 30 seconds
- Calculator: < 2 seconds
- Page load time: < 3 seconds

### Security
- HTTPS everywhere in production
- JWT authentication with short-lived tokens
- bcrypt password hashing (12 rounds)
- Strict tenant isolation on every database query
- Private S3 storage (no public document URLs)
- Rate limiting on all API endpoints
- Input validation on all endpoints

### Scalability
- Support 100+ concurrent agencies
- Support 1000+ documents per agency
- Horizontal scaling via container orchestration

### Reliability
- Graceful degradation if AI service is unavailable
- Background processing doesn't block user requests
- Automatic token refresh on expiry
- Error states visible to user with retry options

### Compliance
- GDPR: right to erasure, data portability, audit trail
- No document content stored in application logs
- Permanent deletion removes S3 files + database records + embeddings

## UI/UX Requirements

### Language
- Primary UI language: Italian (fully localized)
- HTML lang attribute: `it`
- Date formatting: `it-IT` locale
- Navigation labels: Documenti, Confronta, Calcolatore, Report, Impostazioni
- Admin labels: Agenzie, Utenti, Log Attività
- Admin section header: Amministrazione
- All page titles, form labels, buttons, toasts, placeholders, table headers, status labels: Italian
- Backend API error messages: Italian (e.g., "Accesso negato", "Utente non trovato", "Token non valido o scaduto")
- Backend log messages: Italian

### Layout
- Sidebar navigation with role-based menu items
- Responsive design (desktop primary, tablet/mobile secondary)
- Dashboard layout with content area + contextual panels

### Feedback
- Toast notifications for actions (success/error)
- Loading states on all async operations
- Document processing status with visual indicators
- Confidence badges on AI responses

## Success Metrics
- Time to answer a policy question: < 30 seconds (vs 15+ minutes manual)
- Accuracy of AI responses: > 95% when information is in document
- User adoption: 80% of agents using weekly within 3 months
- Document processing success rate: > 99%
- System uptime: 99.5%

## Future Roadmap
- Multi-model LLM support (OpenAI / Gemini / Anthropic)
- Mobile app (React Native)
- Webhook notifications
- Agency-provided LLM API keys
- Usage analytics and billing
- Batch document processing
- Template-based report customization
- Client portal (read-only access for agency clients)
