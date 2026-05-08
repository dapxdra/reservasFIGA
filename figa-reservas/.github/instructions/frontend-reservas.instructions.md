---
applyTo: "app/components/**/*.jsx,app/hooks/**/*.js,app/context/**/*.js,app/**/page.jsx,app/lib/api.js,app/core/client/http/authenticatedFetch.js"
description: "Use when changing dashboard, forms, hooks, contexts, or authenticated client data-fetch flows in reservas frontend."
---

# Frontend Reservas Rules

## Data Fetching
- Reuse `authenticatedFetch` and `authenticatedJson` in `app/core/client/http/authenticatedFetch.js`.
- Keep API client wrappers in `app/lib/api.js` as the UI entry point.
- Avoid duplicating token/header logic in components.

## State Management
- Session state belongs in `app/context/UserContext.js`.
- Reserva list cache belongs in `app/context/ReservasDataContext.js`.
- Keep filter/search derivations in hooks (`app/hooks/useReservas.js`), not in large page effects.

## UX and Safety
- Respect existing role-based guards via `ProtectedRoute`.
- For create/update/delete actions, invalidate or update cache paths consistently.
- Keep toast feedback aligned with current patterns (`react-hot-toast`, `app/utils/notify.js`).

## Date and Time
- Reuse existing date helpers and CR timezone rules.
- Do not introduce new date formats for reservation core fields.

## Component Discipline
- Keep presentation in components and business/data orchestration in hooks/contexts.
- Avoid large side-effect chains in pages when a hook/context already exists.

## Regression Guard
- If UI behavior changes for reservas lifecycle, update/add tests under `app/__tests__` or related route tests when needed.
- Preserve current routes and role navigation behavior.

## References
- `AGENTS.md`
- `ARCHITECTURE_HEXAGONAL.md`
- `README.md`
