Task 1 completed: Worker Storage Contract And Pure Helpers.

Implemented:
- `worker/package.json`
- `worker/migrations/0001_create_signals.sql`
- `worker/src/signals.js`
- `worker/test/signals.test.mjs`

Behavior delivered:
- `normalizeSignalInput(input, nowIso)` validates bot payloads, normalizes fields, applies defaults, and returns structured success/error results.
- `parseLimit(rawValue)` clamps public read limits to the 1-50 range with a default of 20.
- `rowToSignal(row)` converts D1 rows into API signal objects and parses `summary_json`.
- `jsonResponse(body, status, extraHeaders)` returns JSON responses with the required CORS headers.

Verification:
- Ran `cd worker && npm test`
- Result: pass, 6 tests passing

Concerns:
- None for Task 1. HTTP routing and Telegram POST handling are intentionally out of scope for this task.
