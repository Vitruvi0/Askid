# ASKID — AI-Powered Insurance Agency Assistant

ASKID is a production-ready SaaS platform that helps insurance agencies analyze policies, compare coverage, and calculate client needs using AI-powered document analysis.

## Features

- **Document Q&A (RAG)** — Upload PDF policies, ask questions, get answers grounded in document content
- **Policy Comparison** — Side-by-side comparison of two insurance policies across all key dimensions
- **Insurance Needs Calculator** — Pension gap, TCM capital, and life capital adequacy analysis
- **Report Generation** — Technical, client-ready, and email-formatted reports
- **Multi-Tenant Architecture** — Strict agency isolation with role-based access control
- **Audit Logging** — Full tracking of user actions, uploads, and queries
- **GDPR Compliant** — Permanent document deletion, encrypted storage, no public exposure

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.12), async |
| Database | PostgreSQL 16 + pgvector |
| Object Storage | S3-compatible (MinIO / AWS S3) |
| AI | OpenAI GPT-4o + text-embedding-3-small |
| Auth | JWT (access + refresh tokens), bcrypt |
| Infrastructure | Docker Compose, cloud-ready |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Next.js    │────▶│   FastAPI    │────▶│  PostgreSQL  │
│   Frontend   │     │   Backend    │     │  + pgvector  │
└─────────────┘     └──────┬───────┘     └──────────────┘
                           │
                    ┌──────┴───────┐
                    │              │
               ┌────▼────┐  ┌─────▼─────┐
               │  MinIO   │  │  OpenAI   │
               │  (S3)    │  │  API      │
               └──────────┘  └───────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- OpenAI API key

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env with your OpenAI API key and secrets
```

### 2. Start all services

```bash
docker compose up -d
```

This starts:
- PostgreSQL (port 5432) with pgvector extension
- Redis (port 6379)
- MinIO (port 9000, console at 9001)
- Backend API (port 8000)
- Frontend (port 3000)

### 3. Access the application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **MinIO Console**: http://localhost:9001

### 4. Default login

```
Email: admin@askid.ai
Password: admin123!
```

**Change this immediately in production.**

## Local Development (Without Docker)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
ASKID/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # Route handlers
│   │   ├── core/               # Config, database, security
│   │   ├── middleware/          # Auth, tenant isolation
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── services/           # Business logic
│   │   └── main.py             # FastAPI app entry
│   ├── alembic/                # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom hooks (auth store)
│   │   ├── lib/                # API client, utilities
│   │   └── types/              # TypeScript types
│   └── package.json
├── docker/                     # Dockerfiles
├── docker-compose.yml          # Development stack
├── docker-compose.prod.yml     # Production stack
└── .env.example                # Environment template
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/refresh` | Refresh access token |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/documents/` | List documents |
| POST | `/api/v1/documents/upload` | Upload PDF |
| POST | `/api/v1/documents/ask` | Ask question on document |
| POST | `/api/v1/documents/upload-and-ask` | Upload + immediate Q&A |
| DELETE | `/api/v1/documents/{id}` | Permanently delete |

### Comparison
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/compare/` | Compare two existing documents |
| POST | `/api/v1/compare/upload` | Upload two docs and compare |

### Calculator
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/calculator/pension-gap` | Pension gap analysis |
| POST | `/api/v1/calculator/tcm` | TCM capital calculation |
| POST | `/api/v1/calculator/life-capital` | Life capital adequacy |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/reports/generate` | Generate reports |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/stats` | Dashboard statistics |
| GET | `/api/v1/admin/logs` | Audit logs |
| GET/POST | `/api/v1/agencies/` | Manage agencies |
| GET/POST/PUT | `/api/v1/users/` | Manage users |

## Roles & Permissions

| Action | Super Admin | Agency Admin | Agency User |
|--------|:-----------:|:------------:|:-----------:|
| Manage agencies | Yes | No | No |
| Create users | Yes | Own agency | No |
| Activate/deactivate users | Yes | Own agency | No |
| View audit logs | All | Own agency | No |
| Upload documents | Yes | Yes | Yes |
| Query documents | Yes | Yes | Yes |
| Compare policies | Yes | Yes | Yes |
| Use calculator | Yes | Yes | Yes |
| Generate reports | Yes | Yes | Yes |
| Delete documents | Yes | Own agency | Own agency |

## Security Best Practices

### Authentication & Authorization
- JWT tokens with short expiry (30 min access, 7 day refresh)
- Passwords hashed with bcrypt (12 rounds)
- Role-based access control on every endpoint
- Strict tenant isolation — agencies cannot access other agencies' data

### Data Protection
- Documents stored in private S3 buckets (never publicly accessible)
- Server-side encryption (AES-256) for stored files
- All API communication over HTTPS (TLS 1.2+)
- No document content stored in logs
- Permanent deletion capability (GDPR right to erasure)

### Infrastructure
- All services run in isolated Docker containers
- PostgreSQL connections use connection pooling
- Rate limiting on API endpoints
- Input validation on all endpoints (Pydantic schemas)
- SQL injection prevention via SQLAlchemy ORM
- XSS prevention via React's built-in escaping

### AI Safety
- RAG responses strictly grounded in document content
- System prompts enforce no-hallucination rules
- Low-temperature generation (0.1) for factual accuracy
- Confidence scoring on all AI responses

### Production Checklist
- [ ] Change default admin credentials
- [ ] Set strong `SECRET_KEY` and `JWT_SECRET_KEY` (32+ chars)
- [ ] Enable HTTPS via reverse proxy (nginx/Caddy)
- [ ] Configure proper CORS origins
- [ ] Set up database backups
- [ ] Enable PostgreSQL SSL connections
- [ ] Configure log aggregation
- [ ] Set up monitoring and alerting
- [ ] Review and restrict CORS origins
- [ ] Enable rate limiting in production

## Deployment Guide

### AWS (ECS/Fargate)

1. Push images to ECR
2. Create RDS PostgreSQL instance with pgvector extension
3. Create S3 bucket for documents
4. Deploy via ECS with Fargate tasks
5. Use ALB for load balancing + HTTPS termination
6. Use Secrets Manager for environment variables

### GCP (Cloud Run)

1. Push images to Artifact Registry
2. Create Cloud SQL PostgreSQL instance
3. Create Cloud Storage bucket
4. Deploy backend and frontend as Cloud Run services
5. Use Cloud Load Balancing for HTTPS
6. Use Secret Manager for environment variables

### Self-Hosted (VPS)

1. Install Docker and Docker Compose
2. Clone repository and configure `.env`
3. Run `docker compose -f docker-compose.prod.yml up -d`
4. Set up nginx reverse proxy with Let's Encrypt SSL
5. Configure firewall (only expose ports 80/443)
6. Set up automated backups for PostgreSQL and MinIO

## License

Proprietary — All rights reserved.
