# Telegram Signals API Design

## Goal

Replace the static reference timeline cards on the .alomat home page with live signal cards created from the existing Telegram bot. When the bot receives a new item, it posts that item to a Cloudflare-hosted API. The home page reads the latest items from that API and renders them in the existing left-side timeline design.

## Current State

The site is a dependency-free static project. `build.mjs` owns page data and HTML generation, `styles.css` owns presentation, and `app.js` owns browser interactions. The home timeline currently comes from static arrays in `build.mjs`, then `app.js` reads an embedded `data-signal-stories` JSON payload to populate the right-side detail panel.

The new feature must preserve the current visual design and interaction behavior while changing the source of timeline card data.

## Recommended Architecture

Use a separate Cloudflare Worker backed by Cloudflare D1.

The Worker exposes:

```text
POST /api/signals
GET  /api/signals
```

The Telegram bot calls `POST /api/signals` whenever a new signal arrives. The site calls `GET /api/signals?limit=20` from the home page to load the most recent signals. D1 stores each signal as one row, ordered by creation time.

This keeps the static site deploy simple while giving the timeline a real persistence layer that supports ordering, limits, duplicate checks, and future moderation tools.

## Data Model

Create a D1 table named `signals`.

```sql
CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,
  title TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  image TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'uz',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals (created_at DESC);
```

`summary_json` stores an array of short strings. `external_id` is optional and lets the Telegram bot prevent duplicate inserts if it has a message id or source id.

## POST Contract

The bot sends:

```json
{
  "external_id": "telegram-message-123",
  "title": "Signal card title",
  "summary": ["Short explanation 1", "Short explanation 2"],
  "source": "Source name",
  "url": "https://example.com/source",
  "category": "ai",
  "image": "https://example.com/image.jpg",
  "language": "uz",
  "created_at": "2026-07-10T13:20:00.000Z"
}
```

Required fields:

- `title`
- `summary`

Optional fields:

- `external_id`
- `source`
- `url`
- `category`
- `image`
- `language`
- `created_at`

If `created_at` is missing, the Worker uses the server insert time. The visible timeline time comes from `created_at`, so the card reflects when the bot received or submitted the item.

## GET Contract

The site requests:

```text
GET /api/signals?limit=20
```

The Worker returns:

```json
{
  "signals": [
    {
      "id": 42,
      "title": "Signal card title",
      "summary": ["Short explanation 1", "Short explanation 2"],
      "source": "Source name",
      "url": "https://example.com/source",
      "category": "ai",
      "image": "https://example.com/image.jpg",
      "language": "uz",
      "created_at": "2026-07-10T13:20:00.000Z"
    }
  ]
}
```

Results are newest-first. The Worker clamps `limit` to a safe range, for example 1 to 50.

## Security

`POST /api/signals` requires:

```text
Authorization: Bearer <ALOMAT_SIGNALS_SECRET>
```

The secret is stored as a Cloudflare Worker secret and never committed to the repository. `GET /api/signals` is public read-only.

The Worker validates request bodies and rejects oversized or malformed payloads. It stores only the fields needed by the timeline.

## Frontend Behavior

The generated HTML keeps the existing static timeline cards as a fallback. On page load, `app.js` fetches the live API. If the API returns one or more signals, the app replaces the static demo timeline with live cards and rebuilds the story map used by the detail panel.

If the API fails, times out, or returns no signals, the static demo cards remain visible so the page does not look broken.

The right-side detail panel must always reflect the selected left-side timeline card. When the timeline is populated from live Telegram signals, clicking or scrolling to a live card opens that same signal in the detail panel. The panel shows the live signal title, summary, source, created time, category, image, and source URL. It must not keep the old reference/demo text after live cards have replaced the fallback timeline.

The live cards map into the current story shape:

```js
{
  id,
  title,
  source,
  time,
  score,
  url,
  image,
  category,
  summary
}
```

`time` is formatted from `created_at` in the reader's local timezone. `score` can default to `94` until a real scoring field exists.

## Error Handling

For `POST /api/signals`:

- `401` for missing or invalid bearer token.
- `400` for invalid JSON or missing required fields.
- `409` for duplicate `external_id`.
- `201` when a signal is created.

For `GET /api/signals`:

- `200` with an empty array when no signals exist.
- `400` only for invalid query parameters that cannot be clamped.
- `500` for unexpected storage errors.

For the browser:

- API failure is non-fatal.
- Existing static timeline fallback remains visible.
- No error banner is shown in the first version.

## Testing And Verification

Add Worker tests or a local smoke script that verifies:

- Unauthorized POST is rejected.
- Valid POST inserts a row.
- Duplicate `external_id` is rejected.
- GET returns newest-first rows.
- GET clamps the requested limit.

Extend the existing site readiness checks to confirm:

- The home page still embeds fallback timeline data.
- `app.js` contains the live API fetch path.
- The API failure path leaves fallback cards usable.
- Selecting a live left-side card updates the right-side detail panel with that same live signal.

Manual verification:

- Run the static build and site readiness check.
- Run the Worker locally with a D1 preview database.
- POST a sample signal.
- Open the home page and confirm the new card appears in the left timeline with the submitted time.
- Select the new card and confirm the right-side panel shows the same live signal text.

## Out Of Scope For First Version

- Writing or replacing the Telegram bot.
- Admin dashboards.
- Editing, deleting, or moderating signals.
- Real-time push updates without refresh or polling.
- Multi-language translation automation.
- Authentication for public readers.

## Deployment Notes

The Worker should live in the same repository under a small `worker/` directory with its own `wrangler.toml`, migrations, and source file. The static site can continue using `dist/` for Cloudflare Pages or static upload.

The production API base URL should be configurable in the static build, with a sensible same-origin default for future Cloudflare Pages integration.
