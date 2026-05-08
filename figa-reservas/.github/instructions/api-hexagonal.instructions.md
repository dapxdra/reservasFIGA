---
applyTo: "app/api/**/*.jsx,app/core/server/**/*.js,app/lib/serverAuth.js,app/lib/roles.js,app/core/shared/http/jsonResponse.js,app/core/server/shared/appError.js"
description: "Use when creating or changing API routes, use cases, repositories, validators, providers, or auth/role checks in this hexagonal backend."
---

# API Hexagonal Rules

Follow these rules for backend changes.

## Mandatory Flow
1. Route handler in `app/api/**/route.jsx`.
2. Business rules in `app/core/server/**/**UseCase*.js`.
3. Data access in `app/core/server/**/*Repository*.js`.
4. Input checks in validator modules before use case operations.

## Route Handler Contract
- Authenticate with `getAuthUserContext` from `app/lib/serverAuth.js`.
- Authorize with `hasRole` and `ROLES` from `app/lib/roles.js`.
- Use `jsonResponse` from `app/core/shared/http/jsonResponse.js`.
- Convert domain errors with `isAppError` from `app/core/server/shared/appError.js`.
- In dynamic routes, read params as `const { id } = await params`.

## Validation and Errors
- Validate payloads in validator files, not in UI.
- Throw `appError(message, status, code)` for domain and validation failures.
- Keep HTTP status mapping stable to avoid contract regressions.

## Authorization Boundaries
- Do not trust client-side guards alone.
- Enforce role checks in route handlers even if UI already hides actions.
- Reuse existing role semantics in `app/lib/roles.js`.

## Data and Time
- Keep reservation date format as `YYYY-MM-DD` string.
- Reuse existing timezone logic (Costa Rica) and helpers instead of ad-hoc conversions.

## Change Discipline
- Prefer smallest compatible changes.
- Preserve existing response shape unless explicitly requested.
- Update/add Vitest route tests when behavior changes.
- Link architecture references instead of duplicating docs:
  - `ARCHITECTURE_HEXAGONAL.md`
  - `README.md`
