---
name: test-generator-vitest-api-contract
description: "Generate or extend Vitest tests for API authorization, error mapping, and JSON response contracts in this repository."
---

# Vitest API Contract Test Generator

Use this skill to add strong route-level tests without changing feature code unless required.

## Inputs
- Target route file (example: `app/api/reservas/route.jsx`)
- Methods to cover (`GET`, `POST`, etc.)
- Roles expected to pass/fail
- Key contract fields expected in JSON response

## Output
- New or updated `route.test.js` near the target route.
- Optional minimal test-friendly refactors only when strictly required.

## Test Matrix
For each method, cover at least:
1. Unauthenticated request -> expected 401/unauth response.
2. Authenticated but unauthorized role -> expected 403.
3. Authorized success path -> expected 2xx + required payload keys.
4. Validation/domain failure -> expected mapped status/code from `appError`.
5. Unexpected failure -> expected 500 fallback JSON.

## Contract Assertions
- Assert status code.
- Assert content-type includes `application/json`.
- Assert stable response keys (`message`, `error`, `id`, `ok`, etc. as applicable).
- Avoid brittle assertions on full dynamic payloads.

## Mocking Rules
- Mock auth context (`getAuthUserContext`) per scenario.
- Mock role checks only when necessary; otherwise test with realistic role objects.
- Mock repository/use case dependencies to isolate route behavior.
- Do not call real Firebase services in unit route tests.

## Guardrails
- Do not weaken existing authorization coverage.
- Keep tests deterministic and independent.
- Follow existing style in neighboring `route.test.js` files.

## Reference Files
- `AGENTS.md`
- `vitest.config.mjs`
- `app/api/reservas/route.test.js`
- `app/api/users/route.test.js`
- `app/core/server/shared/appError.js`
- `app/core/shared/http/jsonResponse.js`
