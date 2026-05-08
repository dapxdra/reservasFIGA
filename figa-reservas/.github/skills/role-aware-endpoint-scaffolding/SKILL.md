---
name: role-aware-endpoint-scaffolding
description: "Scaffold a new role-aware Next.js API endpoint using route + validator + use case + repository + tests following this repository conventions."
---

# Role-Aware Endpoint Scaffolding

Use this skill when you need a new endpoint that follows current backend patterns.

## Inputs
- Resource name (example: `proveedores`)
- Endpoint path (example: `/api/proveedores` or `/api/proveedores/[id]`)
- Allowed roles per method
- Methods to implement (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- Data fields and required validation rules

## Output
Create or update only these backend artifacts when needed:
1. Route adapter in `app/api/.../route.jsx`
2. Validator in `app/core/server/<domain>/*Validators.js`
3. Use case in `app/core/server/<domain>/*UseCases.js`
4. Repository in `app/core/server/<domain>/*Repository.js`
5. Route tests in `app/api/.../route.test.js`

## Workflow
1. Inspect nearest existing endpoint in same domain and mirror naming style.
2. Add/extend validator first and define `appError` codes for failures.
3. Add/extend repository methods for persistence only.
4. Add/extend use case to orchestrate validation + repository operations.
5. Implement route handlers with:
   - `getAuthUserContext`
   - `hasRole` and `ROLES`
   - `jsonResponse`
   - `isAppError` mapping
6. Add Vitest tests for:
   - authorized role path
   - forbidden role path
   - validation error path
   - server/unexpected error path
7. Keep response contract stable unless explicitly requested.

## Guardrails
- Never embed business rules directly in repository.
- Never skip server-side role checks even if UI has guards.
- In dynamic routes use `await params`.
- Keep date fields in existing canonical formats.

## Reference Files
- `AGENTS.md`
- `ARCHITECTURE_HEXAGONAL.md`
- `app/lib/serverAuth.js`
- `app/lib/roles.js`
- `app/core/shared/http/jsonResponse.js`
- `app/core/server/shared/appError.js`
