# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project layout

The Next.js app lives in `figa-reservas/`, not the repo root. Run all commands below from inside that directory.

## Commands

On Windows/PowerShell, prefer `npm.cmd` over `npm` (plain `npm` can fail to resolve in some shells).

```bash
npm.cmd run dev          # start dev server
npm.cmd run build        # production build
npm.cmd run start        # run production build
npm.cmd run lint         # next lint
npm.cmd run test         # vitest run (single pass)
npm.cmd run test:watch   # vitest watch mode
npm.cmd run audit        # npm audit
npm.cmd run audit:fix    # npm audit fix
npm.cmd run audit:ci     # npm audit --audit-level=moderate (used in CI)
```

Run a single test file: `npx vitest run app/core/server/reservas/reservaValidators.test.js`

Vitest only collects `app/**/*.test.js` (see `vitest.config.mjs`) — `.test.jsx` files (e.g. `app/__tests__/ReservaForm.test.jsx`) are not part of the default run.

If the Windows build fails with stale `.next`/`readlink` errors, delete `.next` and rebuild.

## Architecture: pragmatic hexagonal

Full narrative in `figa-reservas/ARCHITECTURE_HEXAGONAL.md`. The short version — every domain follows the same flow and every layer has a fixed home:

```
app/api/**/route.jsx                    HTTP adapter: auth, roles, calls use case, returns jsonResponse
  -> app/core/server/<domain>/*UseCase*.js    business rules (framework-free)
       -> app/core/server/<domain>/*Repository*.js   Firestore/Firebase Auth access only
       -> app/core/server/<domain>/*Validators.js    input validation before use-case calls
       -> app/core/server/<domain>/providers/*.js    external services (email, WhatsApp, etc.)
```

Domains under `app/core/server/`: `reservas`, `users`, `catalogos` (conductores/vehiculos), `notifications`, `auth`, `diagnostico`, `shared` (cross-cutting: `appError.js`, `inputSanitizers.js`, `rateLimit.js`, `providers/firebaseAdminAuthProvider.js`).

Shared cross-layer utilities:
- `app/core/shared/http/jsonResponse.js` — standard JSON response shape for all routes.
- `app/core/shared/firebase/serializeFirestoreRefValue.js` — unified Firestore ref serialization.
- `app/core/client/http/authenticatedFetch.js` — the one place client code attaches auth headers.

Client side: pages under `app/*/page.jsx` call `app/lib/api.js`, which wraps `authenticatedFetch`. Cross-cutting client state lives in `app/context/` (`UserContext.js` for session, `ReservasDataContext.js` for the reservas cache); derived filtering/search logic belongs in `app/hooks/`, not in page-level effects.

**Do not put business rules directly in an API route if a use case already exists (or should exist) for that operation.**

### API route contract

- Authenticate with `getAuthUserContext` from `app/lib/serverAuth.js`.
- Authorize with `hasRole` + `ROLES` from `app/lib/roles.js` — canonical roles are `admin`, `operador`, `conductor` (normalize with `normalizeRole`); never rely on UI-only guards.
- Respond via `jsonResponse`; map domain failures with `isAppError` from `app/core/server/shared/appError.js`; throw them as `appError(message, status, code)`.
- Next.js 15 dynamic params are async: `const { id } = await params`.
- Conductor visibility over reservas is filtered by assignment logic inside the reservas use cases, not in the route.

### Dates and timezone

Reservation dates are stored as `YYYY-MM-DD` strings; times use Costa Rica timezone conventions throughout filters, reports, and reminders. Reuse `app/utils/` helpers and existing hooks/use-case date logic instead of writing ad-hoc conversions — date-only values are easy to shift by a day if converted carelessly.

### Notifications 24h

Reminder logic is `app/core/server/notifications/reservas24hUseCase.js`, exposed at `app/api/notifications/reservas-24h/route.jsx`. Channel providers (`providers/emailResendProvider.js` for Resend, `providers/whatsappTwilioProvider.js` for Twilio) are decoupled from orchestration and skip gracefully when config/recipient data is missing. Automated GET execution is protected by `CRON_SECRET`; manual POST stays admin-only — don't remove that role check. Runs hourly via `vercel.json` in production.

### External reservation integrations

`app/api/integrations/reservas/route.jsx` (POST) lets external booking sites push reservations in, via `reservasIntegrationUseCase.js`. Auth is `Authorization: Bearer <RESERVAS_WEBHOOK_SECRET>` or `x-webhook-key`; idempotency is keyed by `externalReservationId`/`orderId`/`purchaseId` per `source`. If `RESERVAS_WEBHOOK_HMAC_SECRET` is set, requests must also carry a valid `x-webhook-timestamp` + `x-webhook-signature` (HMAC-SHA256 over `${timestamp}.${rawBody}`, 5-minute replay window). Failed integrations can be retried via `app/api/integrations/reservas/replay/route.jsx` using `integrationKey` (`source:externalReservationId`) or `{ source, externalReservationId }`, with `force: true` to unstick one wedged in `processing`. Field mapping and payload examples are documented in `figa-reservas/README.md`.

## Environment / Firebase

- Client SDK: `app/lib/firebase.jsx`, needs `NEXT_PUBLIC_FIREBASE_*` vars (app shows an explicit startup error if missing, to avoid opaque `auth/invalid-api-key` failures).
- Admin SDK: `app/lib/firebaseadmin.jsx`, needs `FIREBASE_SERVICE_ACCOUNT_KEY` as valid one-line JSON. Missing/invalid value makes `db` unavailable and routes fail with 500s.
- Copy `figa-reservas/.env.example` to `.env.local` to start.

## Testing conventions

- Put new tests next to the code they cover: route tests as `app/api/**/route.test.js`, core logic as `app/core/server/**/*.test.js`.
- Mock Firebase Admin instead of hitting real services.
- Assert on the response contract (status code + JSON shape), not just success/failure.
- When notifications-24h behavior changes, cover: unauthorized trigger, authorized execution, summary structure fields, provider failure handling, and cron-secret behavior.

## Change discipline

- Make the smallest compatible change; preserve existing response contracts and route behavior unless the change explicitly requires breaking them.
- Add/update tests when behavior changes; avoid unrelated refactors inside a feature or bug-fix task.

## Editor-integrated Copilot config (for reference)

This repo also ships GitHub Copilot-style config that encodes the same rules in machine-applied form — useful as a cross-check when unsure which files a given change should touch:
- `figa-reservas/.github/instructions/*.instructions.md` — path-scoped rules (`applyTo` globs) for API/hexagonal, frontend reservas, and notifications-24h changes.
- `figa-reservas/.github/agents/*.agent.md` — role-specific agent briefs (backend API guardian, frontend reservas keeper, vitest API contract auditor).
- `figa-reservas/.github/skills/*/SKILL.md` — scaffolding skills for new endpoints and API contract tests.
