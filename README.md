# AsbestosGuard

AsbestosGuard is a full-stack licensing and compliance portal for asbestos abatement firms in British Columbia. It provides a guided multi-step application wizard for employers, an admin review dashboard with AI-assisted risk analysis, and a secure REST API backed by file-based storage.

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Security](#security)
- [AI Analysis](#ai-analysis)

---

## Quick Start

### Prerequisites

- Node.js 18+
- A Google Gemini API key (for AI analysis)

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and fill in the required values (see [Configuration](#configuration)).

3. **Run the full stack:**
   ```bash
   npm run start:dev
   ```
   The app will be available at `http://localhost:5173` (Vite dev server) with the API at `http://localhost:5000`.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Employer    │  │ Admin        │  │ Shared Components  │  │
│  │ Portal      │  │ Dashboard    │  │ UI, ErrorBoundary  │  │
│  │ (wizard)    │  │ (review)     │  │ ApplicationSummary │  │
│  └──────┬──────┘  └──────┬───────┘  └────────────────────┘  │
│         │                │                                    │
│  ┌──────▼────────────────▼───────────────────────────────┐   │
│  │            Custom Hooks (useAuth, useAppData)          │   │
│  └──────────────────────────┬────────────────────────────┘   │
│                             │ fetch / cookie auth             │
└─────────────────────────────┼───────────────────────────────-┘
                              │
┌─────────────────────────────▼────────────────────────────────┐
│                   Express API Server (Node.js)                │
│                                                               │
│  Security: Helmet · CORS · Rate Limiting · JWT · Audit Log   │
│                                                               │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌────────────┐  │
│  │ /auth    │ │ /applications│ │/fact-    │ │ /analysis  │  │
│  │          │ │              │ │sheets    │ │            │  │
│  └──────────┘ └──────────────┘ └──────────┘ └────────────┘  │
│  ┌──────────┐ ┌──────────────────────────────────────────┐   │
│  │ /data    │ │ /__api/gemini  (AI analysis)              │   │
│  └──────────┘ └──────────────────────────────────────────┘   │
│                                                               │
│                  File-based JSON Storage (./data/)            │
└──────────────────────────────────────────────────────────────┘
```

**Tech stack:**
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide icons
- **Backend:** Node.js, Express, TypeScript (ESM)
- **Auth:** JWT (HTTP-only cookies) + bcrypt
- **AI:** Google Gemini API
- **Logging:** Winston (structured, with file rotation)
- **Testing:** Vitest, Testing Library

---

## Project Structure

```
AsbestosGuard/
├── components/                 # Shared React components
│   ├── ApplicationSummary.tsx  # Read-only application review view
│   ├── ErrorBoundary.tsx       # React error boundary
│   └── UI.tsx                  # Design system: Button, Input, Select, Card, Badge
│
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts              # Authentication state & login/logout
│   └── useAppData.ts           # Applications & fact sheets CRUD
│
├── middleware/                 # Express middleware
│   ├── auth.ts                 # JWT verification, role guards, token generation
│   ├── auditLog.ts             # Security event audit logging
│   └── errorHandler.ts        # Centralised error handling, asyncHandler wrapper
│
├── pages/
│   ├── Admin/                  # Admin-only pages
│   │   ├── ApplicationReview.tsx
│   │   ├── FactSheetManager.tsx
│   │   └── AdminLogin.tsx
│   └── Employer/               # Employer-facing pages
│       ├── NewApplicationForm.tsx
│       ├── steps/
│       │   ├── FormComponents.tsx   # Shared RadioGroup, FormFooter
│       │   └── formValidation.ts    # Step validation logic
│       └── EmployerLogin.tsx
│
├── routes/                     # Express route modules
│   ├── auth.ts                 # POST /login/admin, /login/employer, /logout, /refresh
│   ├── applications.ts         # CRUD /api/applications
│   ├── factSheets.ts           # CRUD /api/fact-sheets (admin)
│   ├── analysis.ts             # CRUD /api/analysis (admin)
│   ├── data.ts                 # GET|POST|DELETE /api/data/:key
│   └── ai.ts                   # POST /__api/gemini/analyze
│
├── services/                   # Business logic & external integrations
│   ├── apiService.ts           # Frontend API client (fetch wrappers)
│   ├── fileSystemStorageService.ts
│   ├── geminiAnalysisService.ts
│   ├── geminiClient.ts
│   └── geminiService.ts
│
├── utils/
│   ├── errors.ts               # Custom AppError subclasses
│   ├── logger.ts               # Winston logger configuration
│   ├── openapi.ts              # Swagger/OpenAPI spec
│   ├── passwordHash.ts         # bcrypt helpers
│   └── validators.ts           # Input sanitisation utilities
│
├── data/                       # Runtime data (gitignored)
│   ├── applications/           # Submitted licence applications
│   ├── fact-sheets/            # Employer fact sheets
│   └── analysis/               # Saved AI analysis results
│
├── docs/                       # Additional guides
│   ├── QUICK_START.md
│   └── GEMINI_SETUP.md
│
├── server.ts                   # Express server entry point
├── App.tsx                     # React root & view router
├── Dockerfile                  # Multi-stage production image
└── docker-compose.yml          # Production deployment
```

---

## Configuration

Copy `.env.example` to `.env.local` and set the following:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | API server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `JWT_SECRET` | **Yes** | — | Random 256-bit secret (`openssl rand -base64 32`) |
| `JWT_EXPIRES_IN` | No | `1h` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `ADMIN_USERNAME` | No | `admin` | Admin login username |
| `ADMIN_PASSWORD_HASH` | **Yes** | — | bcrypt hash of admin password |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000,http://localhost:5173` | Comma-separated CORS origins |
| `GEMINI_API_KEY` | **Yes** (for AI) | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-pro` | Gemini model name |
| `LOG_LEVEL` | No | `info` | `error`, `warn`, `info`, or `debug` |

**Generate an admin password hash:**
```bash
node -e "import('./utils/passwordHash.js').then(m => m.generateHash('yourpassword'))"
```

---

## API Reference

Interactive Swagger UI is available at `http://localhost:5000/api-docs` in development.

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login/admin` | — | Admin login (username + password) |
| POST | `/api/auth/login/employer` | — | Employer login (email + password) |
| POST | `/api/auth/logout` | — | Clear auth cookies |
| GET | `/api/auth/me` | JWT | Get current user |
| POST | `/api/auth/refresh` | cookie | Refresh access token |

### Applications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/applications` | JWT | List all applications |
| POST | `/api/applications` | JWT | Create application |
| PUT | `/api/applications/:filename` | JWT | Update application |
| DELETE | `/api/applications/:filename` | JWT | Delete application |

### Fact Sheets (admin only)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/fact-sheets` | JWT | List fact sheets |
| POST | `/api/fact-sheets` | JWT + admin | Create fact sheet |
| PUT | `/api/fact-sheets/:filename` | JWT + admin | Update fact sheet |
| DELETE | `/api/fact-sheets/:filename` | JWT + admin | Delete fact sheet |

### AI Analysis

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/__api/gemini/analyze` | JWT + admin | Run Gemini AI analysis |

### System

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/policies` | Load `.docx` policy documents |
| GET | `/api-docs` | Swagger UI (development only) |

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite frontend dev server |
| `npm run server` | Start Express API server with `ts-node` |
| `npm run start:dev` | Run both frontend and server concurrently |
| `npm run build` | Build frontend for production |
| `npm run start:prod` | Run production build |
| `npm test` | Run Vitest test suite |

---

## Deployment

### Docker (recommended)

```bash
# Build and start with Docker Compose
docker compose up --build -d
```

The app will be available at `http://localhost:8080`.

All secrets are read from environment variables — set them in a `.env` file or your host environment before running. Named Docker volumes (`app_data`, `app_logs`) persist data across container restarts.

### Manual

```bash
npm run build
NODE_ENV=production node server.js
```

---

## Security

The following security controls are in place:

- **Authentication:** JWT access tokens (1h) + refresh tokens (7d), stored in HTTP-only `sameSite: strict` cookies
- **Password hashing:** bcrypt with 10 salt rounds
- **Role-based access control:** `employer` and `admin` roles enforced per route
- **Rate limiting:** 100 req/15 min globally; 5 login attempts/15 min; 20 AI calls/hr
- **Security headers:** Helmet (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)
- **CORS:** Dynamic origin validation from `ALLOWED_ORIGINS`
- **Input validation:** `express-validator` on all mutating routes; filename sanitisation prevents path traversal
- **Audit logging:** All mutating requests and auth events logged with user ID, role, IP, and outcome
- **Structured logging:** Winston with log rotation (5 MB × 5 files)
- **Error handling:** Custom `AppError` hierarchy; stack traces suppressed in production

---

## AI Analysis

Admin users can trigger a three-step Gemini AI analysis on submitted applications:

1. **Fact Sheet Analysis** — Compares application data against the matched employer fact sheet, flagging overdue balances and discrepancies.
2. **Risk & Policy Analysis** — Checks certification levels, compliance history, and policy violations against WorkSafeBC OHS Regulation.
3. **Business Profile Analysis** — Performs a web-based company validation and geographic risk assessment.

Results are saved to `./data/analysis/` and can be reloaded on subsequent reviews.

---

## License

Copyright © 2024 AsbestosGuard. All rights reserved.
