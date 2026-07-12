# Local Library Actions Design

## Goal

Make the homepage detail-panel heart, save, and share controls functional without introducing user accounts or cross-device synchronization. Liked and saved stories must appear in the library on the same browser.

## Scope

- Store liked and saved stories in browser local storage.
- Keep like and save as independent toggles.
- Render real stored stories in the library instead of static demonstration rows and counts.
- Make both visible share controls functional.
- Remove the download control.
- Replace text glyphs with consistent outline SVG icons for heart, bookmark, and share.
- Preserve the existing name gate for entering the library.
- Defer server persistence, user identity, and cross-device synchronization.

## Storage Model

Use one versioned key named `alomat-library-v1`:

```json
{
  "version": 1,
  "items": {
    "signal-id": {
      "story": {
        "id": "signal-id",
        "title": "Story title",
        "summary": ["Story paragraph"],
        "source": "Source",
        "time": "12:34",
        "score": 94,
        "url": "https://example.com/story",
        "image": "https://example.com/image.jpg",
        "created_at": "2026-07-12T09:34:00.000Z"
      },
      "liked": true,
      "saved": false,
      "updatedAt": "2026-07-12T09:35:00.000Z"
    }
  }
}
```

Story snapshots are stored rather than IDs alone so a library item remains visible if it later falls outside the API response window. Invalid or unsupported stored payloads are treated as an empty library without breaking the page.

When both `liked` and `saved` become false, remove the item from storage. The existing name gate continues to control library navigation, but action clicks store immediately so a click is not lost before the reader completes the name flow.

## Detail Panel

Add explicit `data-story-action` attributes and `aria-pressed` states:

- `like`: outline heart; filled/accented when active.
- `save`: outline bookmark; filled/accented when active.
- `share`: standard three-node share icon; never toggled.

Keep bookmark and share in the upper action group and heart and share in the footer group so the panel retains its existing reference composition. Both share buttons call the same behavior. Remove the download label and button entirely.

Whenever a story opens, its controls hydrate from local storage. Toggling like or save updates storage and every duplicate control for the active story. A small accessible status message announces saved, unsaved, liked, unliked, shared, or copied states.

## Sharing

Build the share payload from the active story title and safe source URL:

1. Use `navigator.share()` when available.
2. Otherwise copy the source URL to the clipboard.
3. If neither works, show a localized failure status without navigating or throwing.

Sharing does not require a name or library entry.

## Library Rendering

Replace static collection rows and hard-coded metrics with data hooks:

- Saved count: entries where `saved` is true.
- Liked count: entries where `liked` is true.
- Total count: unique union of liked and saved entries.

Sort entries newest-first by `updatedAt`. Render each story once with title, summary, source/time metadata, and visible `Saved` and/or `Liked` state labels. Show a localized empty state when there are no entries. Listen for the browser `storage` event so an already-open library tab refreshes after actions in another tab.

## Error Handling

- Wrap local-storage reads and writes so private-mode or quota errors do not break the timeline.
- Sanitize story URLs before rendering links or sharing.
- Ignore malformed entries individually.
- Keep the interface usable if storage, Web Share, or clipboard APIs are unavailable.

## Verification

- Unit-test storage parsing, toggle behavior, deduplication, removal, counts, and ordering.
- Test action markup, active-state hydration, share fallback, and download removal.
- Test library rendering for empty, saved-only, liked-only, and dual-state entries.
- Run the full build and readiness checks.
- Verify desktop and mobile detail controls and library rendering in the browser.
