# Final Review Fix 3

## Change

Updated `normalizeLiveSignalSummary()` so it only accepts actual string entries before trimming and filtering. Malformed summary arrays like `[null]` and `[{}]` now normalize to an empty summary instead of producing placeholder text that can displace the fallback timeline.

Added regression coverage in the root client tests for malformed live summary arrays preserving the static fallback timeline.

## Verification

- `npm run check`
- `npm test` in the repo root
- `npm test` in `worker/`
