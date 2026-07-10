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

## Reviewer fix addendum

- Widened live timeline selection so the card/article surface triggers the same detail-panel update as the headline button, while keeping the button path intact for keyboard/accessible activation.
- Reused the existing `.alomat` fallback artwork for image-less live signals in both the live timeline card background and the right-side detail visual.
- Added a small observer cleanup so replacing timeline stories disconnects any prior reveal observer before wiring the new live items.

### Addendum verification

- Ran `npm run check`: passed.
- Ran a focused `jsdom` DOM harness against built `dist/index.html` with a mocked live `/api/signals` payload containing an empty `image`:
  - the live card rendered a non-empty `--signal-story-image` fallback containing the existing SVG fallback artwork,
  - clicking the live article surface updated the detail panel with the mocked live title and summary,
  - clicking the live headline button still updated the detail panel correctly,
  - the detail visual used the same non-empty fallback artwork instead of a blank background.
