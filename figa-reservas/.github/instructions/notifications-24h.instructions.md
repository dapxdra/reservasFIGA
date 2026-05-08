---
applyTo: "app/api/notifications/reservas-24h/route.jsx,app/core/server/notifications/**/*.js,app/core/server/notifications/**/*.jsx,app/core/server/notifications/providers/*.js"
description: "Use when editing reminder 24h logic, notification windows, channel providers, or cron security behavior."
---

# Notifications 24h Rules

Apply this guidance for any reminder 24h changes.

## Security and Triggering
- Keep cron route protection behavior explicit and documented.
- Prefer `CRON_SECRET` validation for automated GET execution.
- Preserve admin-only manual POST execution path.
- Do not remove role checks from manual trigger flow.

## Time Window and Timezone
- Keep Costa Rica timezone assumptions consistent with current code.
- Preserve window semantics (`minHours`, `maxHours`) and defaults unless requested.
- Avoid date-only conversions that shift calendar day.

## Delivery Channels
- Keep channel providers decoupled from use case orchestration.
- Respect current env-driven enable/disable behavior for Resend and Twilio.
- Preserve graceful skip behavior when channel config or recipient data is missing.

## Data Integrity
- Preserve skip reasons accounting in summary payload.
- Preserve sent-tracking fields on reservation documents.
- Keep id normalization and fallback lookups intact (conductor/user resolution).

## Error and Contract Handling
- Return stable JSON summary structure for operations.
- Keep appError mapping and 500 fallback behavior.
- Do not throw raw provider errors directly to route responses.

## Test Expectations
When behavior changes, update or add tests near:
- `app/api/notifications/reservas-24h/route.test.js`

Cover at least:
1. unauthorized trigger path,
2. authorized execution path,
3. summary structure fields,
4. provider failure handling,
5. cron secret behavior.

## References
- `AGENTS.md`
- `README.md`
- `ARCHITECTURE_HEXAGONAL.md`
- `app/core/server/notifications/reservas24hUseCase.js`
