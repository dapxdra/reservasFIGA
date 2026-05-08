# AGENTS Guide - FIGA Reservas

This file helps coding agents become productive quickly in this repository.

## Project Snapshot
- Framework: Next.js App Router
- Language: JavaScript/JSX
- Data/Auth: Firebase Web SDK + Firebase Admin SDK
- Testing: Vitest
- Architecture: Hexagonal pragmatic (routes -> use cases -> repositories/providers)

See architecture details in [ARCHITECTURE_HEXAGONAL.md](ARCHITECTURE_HEXAGONAL.md).

## Runbook
Use PowerShell-safe commands in Windows:
- `npm.cmd run dev`
- `npm.cmd run build`
- `npm.cmd run test`
- `npm.cmd run test:watch`
- `npm.cmd run lint`
- `npm.cmd run audit`
- `npm.cmd run audit:fix`
- `npm.cmd run audit:ci`

If build fails on Windows with stale `.next`/`readlink` issues, remove `.next` and retry.

## Key Docs
- Setup and env: [README.md](README.md)
- Architecture and migration context: [ARCHITECTURE_HEXAGONAL.md](ARCHITECTURE_HEXAGONAL.md)
- Product refinement notes: [PROMPT_REFINAMIENTO.md](PROMPT_REFINAMIENTO.md)

## Code Boundaries (Follow Strictly)
- UI layer in `app/**/page.jsx`, `app/components/**`, `app/hooks/**`, `app/context/**`.
- HTTP adapters in `app/api/**/route.jsx`.
- Business logic in `app/core/server/**/**UseCase*.js`.
- Persistence in `app/core/server/**/*Repository*.js`.
- External providers in `app/core/server/**/providers/*.js`.
- Shared HTTP/error utilities in `app/core/shared/http/jsonResponse.js` and `app/core/server/shared/appError.js`.

Do not place business rules directly inside API routes if a use case exists.

## API Route Conventions
- Always authenticate with `getAuthUserContext` from `app/lib/serverAuth.js`.
- Always enforce role checks with `hasRole` and `ROLES` from `app/lib/roles.js`.
- Return JSON via `jsonResponse`.
- Map domain errors with `isAppError`.
- For dynamic route params in Next.js 15 handlers, use `const { id } = await params`.

## Domain Conventions
- Use validators before use-case actions:
  - reservas: `app/core/server/reservas/reservaValidators.js`
  - users: `app/core/server/users/usersValidators.js`
  - catalogos: `app/core/server/catalogos/catalogValidators.js`
  - auth setup: `app/core/server/auth/authValidators.js`
- Throw domain errors with `appError(message, status, code)`.
- Keep repositories focused on data access only.

## Roles and Authorization
- Canonical roles are in `app/lib/roles.js`.
- Normalize role values with `normalizeRole`.
- Respect role boundaries already used in route handlers.
- Conductor visibility is filtered by assignment logic in reservas use cases.

## Date/Time and Locale Rules
- Costa Rica timezone conventions are used across filters/reports/reminders.
- Reservation date storage format is `YYYY-MM-DD` strings.
- Be careful when converting date-only values; avoid timezone drift.
- Reuse existing helpers in `app/utils/` and date logic in reservas hooks/use cases.

## Notifications 24h
- Main logic: `app/core/server/notifications/reservas24hUseCase.js`.
- Route adapter: `app/api/notifications/reservas-24h/route.jsx`.
- Providers:
  - Email Resend: `app/core/server/notifications/providers/emailResendProvider.js`
  - WhatsApp Twilio: `app/core/server/notifications/providers/whatsappTwilioProvider.js`
- Ensure `CRON_SECRET` is configured in production.

## Firebase and Environment
- Client SDK init: `app/lib/firebase.jsx` (uses `NEXT_PUBLIC_FIREBASE_*`).
- Admin SDK init: `app/lib/firebaseadmin.jsx` (uses `FIREBASE_SERVICE_ACCOUNT_KEY`).
- Keep service account JSON env value valid one-line JSON.

## Testing Guidance
- Prefer focused tests near touched area first:
  - API route tests in `app/api/**/route.test.js`
  - Core validators/use cases in `app/core/server/**/*.test.js`
- Mock Firebase Admin dependencies instead of hitting real services.
- Preserve response contract expectations (status + JSON shape).

## Common Pitfalls
- In PowerShell, prefer `npm.cmd` instead of `npm`.
- Missing/invalid Admin SDK env leads to `db` unavailable (500 paths).
- If role/profile is missing or inactive, server auth blocks access even with valid token.
- Keep auth checks on server-side, never trust UI-only restrictions.

## Preferred Change Strategy
- Make smallest compatible changes.
- Preserve public API contracts unless explicitly requested.
- Add/adjust tests when behavior changes.
- Avoid unrelated refactors in feature or bug-fix tasks.

## Quick Adoption Guide
Use this section to pick the right agent/skill quickly.

### Agents: when to invoke
- `backend-api-guardian`: for API route work, use cases, validators, repositories, RBAC, and backend contract-safe refactors.
  - Example prompt: "Use backend-api-guardian to add `PATCH /api/reservas/[id]` field validation and keep response contracts unchanged."
- `frontend-reservas-keeper`: for reservas UI flows, hooks/contexts, cache invalidation, role navigation, and authenticated fetch usage.
  - Example prompt: "Use frontend-reservas-keeper to update dashboard filtering without breaking cache behavior in `ReservasDataContext`."
- `vitest-api-contract-auditor`: for route test hardening (401/403/2xx/error mapping/content-type).
  - Example prompt: "Use vitest-api-contract-auditor to expand tests for `app/api/users/[id]/route.jsx` with authorization matrix and JSON contract checks."

### Skills: when to invoke
- `role-aware-endpoint-scaffolding`: create a new endpoint following repository conventions.
  - Use when you need route + validator + use case + repository + tests in one flow.
  - Example prompt: "Run role-aware-endpoint-scaffolding for `/api/proveedores` with GET for admin/operador and POST only admin."
- `test-generator-vitest-api-contract`: generate or extend API contract tests.
  - Use when endpoint behavior changed or coverage is missing for auth and error paths.
  - Example prompt: "Run test-generator-vitest-api-contract for `app/api/conductores/route.jsx` methods GET and POST."

### Fast decision map
- New backend endpoint: `role-aware-endpoint-scaffolding` -> `backend-api-guardian`.
- Backend bug fix with auth/roles: `backend-api-guardian`.
- Frontend reservas behavior/UI state issue: `frontend-reservas-keeper`.
- Missing or weak API tests: `test-generator-vitest-api-contract` or `vitest-api-contract-auditor`.
- Notifications 24h changes: follow `.github/instructions/notifications-24h.instructions.md` and prefer `backend-api-guardian`.
