# Task 3 Report: Static Site Live Timeline Integration

## Scope completed

- Updated `build.mjs` to add the `data-signal-timeline-items` hook on the home timeline container.
- Updated `build.mjs` to emit `window.__ALOMAT_SIGNALS_API_BASE__` before the inline app script using `serializeJson(process.env.ALOMAT_SIGNALS_API_BASE ?? "")`.
- Updated `app.js` so `timelineItems`, `storyData`, and `storyMap` are mutable and the timeline container is addressable.
- Added live signal helpers for API URL construction, signal normalization, time formatting, and attribute escaping.
- Added live timeline rendering and replacement logic that refreshes both the left rail cards and the right-side detail state.
- Moved timeline click binding into reusable `bindTimelineItemEvents()` so newly rendered live cards update the detail panel from the refreshed `storyMap`.
- Added `loadLiveSignals()` to fetch `GET /api/signals?limit=20` and preserve the static fallback when the request fails or returns unusable data.

## Verification

### Automated

- Ran an inline source check for the new hook, API config script, mutable timeline state, reusable binder, and live loader: passed.
- Ran `npm run check`: passed.

### Manual / browser sanity checks

- Started local preview and verified fallback behavior with no API response:
  - The demo timeline remained visible.
  - Clicking the first left-side card updated the right-side detail panel to the matching demo story title.
- Verified live replacement behavior by mocking `GET /api/signals?limit=20` in a real browser session:
  - Demo cards were replaced with live card titles.
  - Clicking the first live card updated the right-side detail panel with the matching live title and live summary text.
  - Clicking the second live card updated the right-side detail panel with the second live signal text.
  - Confirmed the detail panel did not retain old demo copy after live replacement.

## Files changed

- `build.mjs`
- `app.js`
- Regenerated `dist/` outputs from `npm run check`

## Notes

- Preserved the static fallback path when `/api/signals` is unavailable or unusable.
- Kept the existing visual structure intact while refreshing the timeline/detail data flow for live cards.
- Observed CRLF warnings during diff output on Windows; they did not affect build or verification results.
