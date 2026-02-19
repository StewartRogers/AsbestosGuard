# Changelog

All notable changes to AsbestosGuard are documented here.

---

## [Unreleased]

### Phase 6 — Documentation & Polish

- Rewrote `README.md` with full architecture diagram, project structure, configuration table, API reference, deployment guide, and security summary
- Added JSDoc to `hooks/useAuth.ts` and `hooks/useAppData.ts` — interface members, parameters, return values, and behavioural notes
- Added JSDoc to all five components in `components/UI.tsx` (`Button`, `Input`, `Select`, `Card`, `Badge`) and the `ErrorBoundary` class with usage examples
- Created this `CHANGELOG.md`

---

### Phase 5 — Additional Security Features

- **Secured `/api/data` routes** — All three `GET`/`POST`/`DELETE` endpoints now require a valid JWT; previously they were unauthenticated
- **AI rate limiting** — Added a dedicated rate limiter (20 requests/hour) on `/__api/gemini` and `/__api/foundry` to prevent abuse of the Gemini API
- **Audit logging middleware** — New `middleware/auditLog.ts` logs every mutating request (method, path, status, user ID, role, IP); explicit `logAuditEvent` calls in `routes/auth.ts` capture login success and failure with reason codes
- **Docker Compose** — Added `docker-compose.yml` with named volumes for data and log persistence; all secrets injected via environment variables
- **OpenAPI / Swagger docs** — Installed `swagger-jsdoc` + `swagger-ui-express`; created `utils/openapi.ts` with full spec (schemas, security schemes, tags); added `@openapi` JSDoc to `routes/auth.ts` and `routes/applications.ts`; interactive UI served at `/api-docs` in development

---

### Phase 4 — Code Refactoring

- **`App.tsx`** reduced from 524 → 232 lines (56%)
  - Extracted authentication logic into `hooks/useAuth.ts`
  - Extracted data management logic into `hooks/useAppData.ts`
- **`server.ts`** reduced from 575 → 199 lines (65%)
  - Extracted into five route modules under `routes/`: `applications.ts`, `factSheets.ts`, `analysis.ts`, `data.ts`, `ai.ts`
- **`NewApplicationForm.tsx`** reduced from 1,002 → 571 lines (43%)
  - Extracted `RadioGroup` and `FormFooter` into `pages/Employer/steps/FormComponents.tsx`
  - Extracted `validateStep`, `validateEmail`, `validatePhone` into `pages/Employer/steps/formValidation.ts`
  - Replaced repetitive step-6 UI blocks with data-driven arrays (`HISTORY_QUESTIONS`, `ACKNOWLEDGMENTS`, `LICENSE_REQUIREMENTS`)

---

### Phase 3 — Error Handling & Logging

- **Winston logger** — Created `utils/logger.ts` with console transport (dev) and rotating file transports (`combined.log`, `error.log`) in production; disabled in test environment
- **Server-side logging** — Replaced all `console.log` / `console.error` calls in `server.ts`, `middleware/errorHandler.ts`, `services/fileSystemStorageService.ts`, and `services/geminiAnalysisService.ts` with structured Winston calls
- **React Error Boundary** — Created `components/ErrorBoundary.tsx`; integrated into `index.tsx` wrapping `<App />`; shows user-friendly error card with collapsible stack trace in development

---

### Phase 2 — Testing Infrastructure

- Configured Vitest with `@testing-library/react` and `@testing-library/user-event`
- Added unit tests for utility functions (`validators.ts`, `errors.ts`, `passwordHash.ts`)
- Added component tests for `EmployerLogin`, `AdminLogin`, and `ErrorBoundary`
- Added integration tests for auth routes (`/api/auth/login`, `/api/auth/me`, `/api/auth/refresh`)
- Added integration tests for application and fact sheet CRUD routes
- 118 tests total; 88 passing at baseline

---

### Phase 1 — Security Foundation

- **JWT authentication** — Replaced session-less design with signed JWT access tokens (1 h) and refresh tokens (7 d); tokens stored in HTTP-only `sameSite: strict` cookies
- **bcrypt password hashing** — Admin password stored as a bcrypt hash (10 rounds); added `utils/passwordHash.ts` with `hashPassword`, `comparePassword`, and `generateHash` helpers
- **Role-based access control** — `requireAuth`, `requireAdmin`, and `requireEmployer` middleware guards added to all protected routes
- **Rate limiting** — `express-rate-limit` applied globally (100 req/15 min) and specifically on login endpoints (5 attempts/15 min)
- **Helmet security headers** — CSP, HSTS, X-Frame-Options, X-Content-Type-Options, and related headers configured
- **CORS** — Dynamic origin validation from `ALLOWED_ORIGINS` environment variable
- **Input validation** — `express-validator` added to all mutating routes; `sanitizeFilename` prevents path traversal on file-based storage
- **Custom error hierarchy** — `utils/errors.ts` defines `AppError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `InternalServerError`
- **Centralised error handler** — `middleware/errorHandler.ts` with `asyncHandler` wrapper; stack traces suppressed in production
- **Docker hardening** — Multi-stage `Dockerfile` with non-root `nodejs` user, minimal production image, and health check
- **`.env.example`** — Documented all required and optional environment variables
