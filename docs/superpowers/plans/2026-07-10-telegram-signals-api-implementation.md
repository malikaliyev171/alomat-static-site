# Telegram Signals API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Cloudflare Worker + D1 API that receives signals from the existing Telegram bot and make the home timeline render those live signals while preserving the current static fallback.

**Architecture:** Keep the static site architecture intact: `build.mjs` generates fallback HTML, `styles.css` owns presentation, and `app.js` owns browser behavior. Add a separate `worker/` package for `POST /api/signals` and `GET /api/signals`, backed by D1. The browser never calls Telegram directly; the existing Telegram bot posts to the Worker, and the site reads from the Worker.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js 20+, Cloudflare Worker, Cloudflare D1, `node:test` for local contract tests.

## Global Constraints

- Preserve the current home page timeline and right-side detail panel visual design.
- Keep the static site dependency-free.
- The Telegram bot already exists and is out of scope.
- `POST /api/signals` must require `Authorization: Bearer <ALOMAT_SIGNALS_SECRET>`.
- `GET /api/signals` must be public read-only.
- Live timeline cards must replace demo cards only when the API returns at least one signal.
- If the live API fails, returns malformed JSON, or returns no signals, the fallback demo timeline must stay usable.
- Selecting a live left-side card must update the right-side detail panel with that same live signal text.
- Do not commit real secrets.

---

## File Structure

- `worker/wrangler.toml`: Cloudflare Worker and D1 binding configuration.
- `worker/package.json`: Worker-local scripts for tests, local dev, and deploy.
- `worker/migrations/0001_create_signals.sql`: D1 schema for persisted signals.
- `worker/src/signals.js`: Pure validation, normalization, formatting, and response helpers.
- `worker/src/index.js`: Worker HTTP routing and D1 reads/writes.
- `worker/test/signals.test.mjs`: Unit tests for validation, normalization, limits, duplicate mapping, and HTTP behavior with a fake D1 binding.
- `app.js`: Live timeline fetch, DOM replacement, story-map refresh, and right-panel integration.
- `build.mjs`: Add timeline container hooks and expose a configurable live API base URL.
- `scripts/check-site.mjs`: Extend readiness checks for live timeline integration markers.
- `README.md`: Document Worker setup, D1 migration, secret setup, bot POST example, and local verification.

---

### Task 1: Worker Storage Contract And Pure Helpers

**Files:**
- Create: `worker/package.json`
- Create: `worker/migrations/0001_create_signals.sql`
- Create: `worker/src/signals.js`
- Create: `worker/test/signals.test.mjs`

**Interfaces:**
- Consumes: JSON payloads from the existing Telegram bot.
- Produces:
  - `normalizeSignalInput(input: unknown, nowIso: string): { ok: true, value: NormalizedSignal } | { ok: false, status: number, error: string }`
  - `parseLimit(rawValue: string | null): number`
  - `rowToSignal(row: D1SignalRow): ApiSignal`
  - `jsonResponse(body: unknown, status?: number, extraHeaders?: Record<string, string>): Response`

- [ ] **Step 1: Create the Worker package metadata**

Create `worker/package.json`:

```json
{
  "name": "alomat-signals-worker",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/*.test.mjs",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "d1:migrate:local": "wrangler d1 migrations apply alomat_signals --local",
    "d1:migrate:remote": "wrangler d1 migrations apply alomat_signals --remote"
  },
  "devDependencies": {
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 2: Add the D1 migration**

Create `worker/migrations/0001_create_signals.sql`:

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

- [ ] **Step 3: Write failing pure-helper tests**

Create `worker/test/signals.test.mjs` with these tests first:

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  jsonResponse,
  normalizeSignalInput,
  parseLimit,
  rowToSignal,
} from "../src/signals.js";

test("normalizeSignalInput accepts the bot payload and fills defaults", () => {
  const result = normalizeSignalInput(
    {
      external_id: "telegram-123",
      title: "Signal card title",
      summary: ["Short explanation 1", "Short explanation 2"],
      source: "Source name",
      url: "https://example.com/source",
      category: "ai",
      image: "https://example.com/image.jpg",
      language: "uz",
      created_at: "2026-07-10T13:20:00.000Z",
    },
    "2026-07-10T14:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    external_id: "telegram-123",
    title: "Signal card title",
    summary_json: JSON.stringify(["Short explanation 1", "Short explanation 2"]),
    source: "Source name",
    url: "https://example.com/source",
    category: "ai",
    image: "https://example.com/image.jpg",
    language: "uz",
    created_at: "2026-07-10T13:20:00.000Z",
  });
});

test("normalizeSignalInput rejects missing title", () => {
  const result = normalizeSignalInput({ summary: ["Only summary"] }, "2026-07-10T14:00:00.000Z");

  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: "title is required",
  });
});

test("normalizeSignalInput rejects empty summary", () => {
  const result = normalizeSignalInput({ title: "No summary", summary: [] }, "2026-07-10T14:00:00.000Z");

  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: "summary must contain at least one item",
  });
});

test("parseLimit clamps to the public read range", () => {
  assert.equal(parseLimit(null), 20);
  assert.equal(parseLimit("0"), 1);
  assert.equal(parseLimit("7"), 7);
  assert.equal(parseLimit("999"), 50);
  assert.equal(parseLimit("not-a-number"), 20);
});

test("rowToSignal parses summary_json and exposes API fields", () => {
  assert.deepEqual(
    rowToSignal({
      id: 42,
      external_id: "telegram-123",
      title: "Signal card title",
      summary_json: "[\"Short explanation\"]",
      source: "Source name",
      url: "https://example.com/source",
      category: "ai",
      image: "",
      language: "uz",
      created_at: "2026-07-10T13:20:00.000Z",
    }),
    {
      id: 42,
      external_id: "telegram-123",
      title: "Signal card title",
      summary: ["Short explanation"],
      source: "Source name",
      url: "https://example.com/source",
      category: "ai",
      image: "",
      language: "uz",
      created_at: "2026-07-10T13:20:00.000Z",
    },
  );
});

test("jsonResponse returns JSON with CORS headers", async () => {
  const response = jsonResponse({ ok: true }, 201, { "X-Test": "yes" });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("x-test"), "yes");
  assert.deepEqual(await response.json(), { ok: true });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run:

```powershell
cd worker
npm test
```

Expected: FAIL because `worker/src/signals.js` does not exist.

- [ ] **Step 5: Implement pure helpers**

Create `worker/src/signals.js`:

```js
const MAX_TEXT_LENGTH = 5000;
const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 50;

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      ...extraHeaders,
    },
  });
}

export function parseLimit(rawValue) {
  const parsed = Number.parseInt(rawValue ?? "", 10);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, parsed));
}

export function normalizeSignalInput(input, nowIso) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, status: 400, error: "body must be a JSON object" };
  }

  const title = normalizeText(input.title);
  if (!title) {
    return { ok: false, status: 400, error: "title is required" };
  }

  const summary = normalizeSummary(input.summary);
  if (!summary.length) {
    return { ok: false, status: 400, error: "summary must contain at least one item" };
  }

  const createdAt = normalizeCreatedAt(input.created_at, nowIso);
  if (!createdAt) {
    return { ok: false, status: 400, error: "created_at must be a valid ISO date" };
  }

  return {
    ok: true,
    value: {
      external_id: normalizeOptionalText(input.external_id),
      title,
      summary_json: JSON.stringify(summary),
      source: normalizeOptionalText(input.source),
      url: normalizeOptionalText(input.url),
      category: normalizeOptionalText(input.category) || "general",
      image: normalizeOptionalText(input.image),
      language: normalizeOptionalText(input.language) || "uz",
      created_at: createdAt,
    },
  };
}

export function rowToSignal(row) {
  return {
    id: row.id,
    external_id: row.external_id || "",
    title: row.title,
    summary: parseSummaryJson(row.summary_json),
    source: row.source || "",
    url: row.url || "",
    category: row.category || "general",
    image: row.image || "",
    language: row.language || "uz",
    created_at: row.created_at,
  };
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, MAX_TEXT_LENGTH);
}

function normalizeOptionalText(value) {
  return normalizeText(value);
}

function normalizeSummary(value) {
  const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return items.map(normalizeText).filter(Boolean).slice(0, 6);
}

function normalizeCreatedAt(value, nowIso) {
  if (typeof value !== "string" || !value.trim()) {
    return nowIso;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}

function parseSummaryJson(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 6: Run tests to verify Task 1 passes**

Run:

```powershell
cd worker
npm test
```

Expected: PASS for all helper tests.

- [ ] **Step 7: Commit Task 1**

```powershell
git add worker/package.json worker/migrations/0001_create_signals.sql worker/src/signals.js worker/test/signals.test.mjs
git commit -m "Add signals worker storage contract"
```

---

### Task 2: Worker HTTP API

**Files:**
- Create: `worker/wrangler.toml`
- Create: `worker/src/index.js`
- Modify: `worker/test/signals.test.mjs`

**Interfaces:**
- Consumes:
  - `normalizeSignalInput(input, nowIso)` from `worker/src/signals.js`
  - D1 binding `env.DB`
  - secret `env.ALOMAT_SIGNALS_SECRET`
- Produces:
  - `fetch(request: Request, env: WorkerEnv): Promise<Response>`
  - `handleRequest(request: Request, env: WorkerEnv, now?: Date): Promise<Response>`

- [ ] **Step 1: Add failing HTTP tests**

Append to `worker/test/signals.test.mjs`:

```js
import { handleRequest } from "../src/index.js";

class FakeD1 {
  constructor() {
    this.rows = [];
    this.nextId = 1;
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    if (this.sql.includes("INSERT INTO signals")) {
      const [external_id, title, summary_json, source, url, category, image, language, created_at] = this.values;
      if (external_id && this.db.rows.some((row) => row.external_id === external_id)) {
        const error = new Error("D1_ERROR: UNIQUE constraint failed: signals.external_id");
        error.cause = { message: "UNIQUE constraint failed: signals.external_id" };
        throw error;
      }
      this.db.rows.push({
        id: this.db.nextId,
        external_id,
        title,
        summary_json,
        source,
        url,
        category,
        image,
        language,
        created_at,
      });
      this.db.nextId += 1;
      return { success: true };
    }

    throw new Error(`Unexpected SQL for run: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes("SELECT")) {
      const limit = this.values[0];
      const results = [...this.db.rows]
        .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id - left.id)
        .slice(0, limit);
      return { results };
    }

    throw new Error(`Unexpected SQL for all: ${this.sql}`);
  }
}

function testEnv() {
  return {
    DB: new FakeD1(),
    ALOMAT_SIGNALS_SECRET: "secret-for-tests",
  };
}

test("POST /api/signals rejects missing bearer token", async () => {
  const response = await handleRequest(
    new Request("https://signals.example.com/api/signals", {
      method: "POST",
      body: JSON.stringify({ title: "Title", summary: ["Summary"] }),
    }),
    testEnv(),
    new Date("2026-07-10T14:00:00.000Z"),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("POST /api/signals inserts a valid signal", async () => {
  const env = testEnv();
  const response = await handleRequest(
    new Request("https://signals.example.com/api/signals", {
      method: "POST",
      headers: {
        authorization: "Bearer secret-for-tests",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        external_id: "telegram-123",
        title: "Live card",
        summary: ["Live summary"],
        source: "Bot",
      }),
    }),
    env,
    new Date("2026-07-10T14:00:00.000Z"),
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(env.DB.rows.length, 1);
  assert.equal(env.DB.rows[0].title, "Live card");
});

test("POST /api/signals rejects duplicate external_id", async () => {
  const env = testEnv();
  const requestBody = {
    external_id: "telegram-123",
    title: "Live card",
    summary: ["Live summary"],
  };

  await handleRequest(
    new Request("https://signals.example.com/api/signals", {
      method: "POST",
      headers: { authorization: "Bearer secret-for-tests" },
      body: JSON.stringify(requestBody),
    }),
    env,
    new Date("2026-07-10T14:00:00.000Z"),
  );
  const duplicate = await handleRequest(
    new Request("https://signals.example.com/api/signals", {
      method: "POST",
      headers: { authorization: "Bearer secret-for-tests" },
      body: JSON.stringify(requestBody),
    }),
    env,
    new Date("2026-07-10T14:01:00.000Z"),
  );

  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), { error: "duplicate external_id" });
});

test("GET /api/signals returns newest-first rows", async () => {
  const env = testEnv();
  for (const [title, created_at] of [
    ["Older", "2026-07-10T10:00:00.000Z"],
    ["Newer", "2026-07-10T12:00:00.000Z"],
  ]) {
    await handleRequest(
      new Request("https://signals.example.com/api/signals", {
        method: "POST",
        headers: { authorization: "Bearer secret-for-tests" },
        body: JSON.stringify({ title, summary: [`${title} summary`], created_at }),
      }),
      env,
      new Date("2026-07-10T14:00:00.000Z"),
    );
  }

  const response = await handleRequest(new Request("https://signals.example.com/api/signals?limit=1"), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.signals.length, 1);
  assert.equal(body.signals[0].title, "Newer");
});

test("OPTIONS /api/signals returns CORS preflight headers", async () => {
  const response = await handleRequest(new Request("https://signals.example.com/api/signals", { method: "OPTIONS" }), testEnv());

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```powershell
cd worker
npm test
```

Expected: FAIL because `worker/src/index.js` does not exist.

- [ ] **Step 3: Add Worker routing**

Create `worker/src/index.js`:

```js
import { jsonResponse, normalizeSignalInput, parseLimit, rowToSignal } from "./signals.js";

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};

export async function handleRequest(request, env, now = new Date()) {
  const url = new URL(request.url);

  if (url.pathname !== "/api/signals") {
    return jsonResponse({ error: "not found" }, 404);
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
      },
    });
  }

  if (request.method === "GET") {
    return listSignals(url, env);
  }

  if (request.method === "POST") {
    return createSignal(request, env, now);
  }

  return jsonResponse({ error: "method not allowed" }, 405, { allow: "GET, POST, OPTIONS" });
}

async function listSignals(url, env) {
  const limit = parseLimit(url.searchParams.get("limit"));
  const result = await env.DB.prepare(
    `SELECT id, external_id, title, summary_json, source, url, category, image, language, created_at
     FROM signals
     ORDER BY created_at DESC, id DESC
     LIMIT ?`,
  )
    .bind(limit)
    .all();

  return jsonResponse({ signals: (result.results ?? []).map(rowToSignal) });
}

async function createSignal(request, env, now) {
  if (!isAuthorized(request, env)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid JSON body" }, 400);
  }

  const normalized = normalizeSignalInput(body, now.toISOString());
  if (!normalized.ok) {
    return jsonResponse({ error: normalized.error }, normalized.status);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO signals (external_id, title, summary_json, source, url, category, image, language, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        normalized.value.external_id || null,
        normalized.value.title,
        normalized.value.summary_json,
        normalized.value.source,
        normalized.value.url,
        normalized.value.category,
        normalized.value.image,
        normalized.value.language,
        normalized.value.created_at,
      )
      .run();
  } catch (error) {
    if (String(error?.message ?? "").includes("UNIQUE constraint failed")) {
      return jsonResponse({ error: "duplicate external_id" }, 409);
    }
    return jsonResponse({ error: "storage error" }, 500);
  }

  return jsonResponse({ ok: true }, 201);
}

function isAuthorized(request, env) {
  const expected = env.ALOMAT_SIGNALS_SECRET;
  const actual = request.headers.get("authorization") ?? "";
  return Boolean(expected) && actual === `Bearer ${expected}`;
}
```

- [ ] **Step 4: Add Wrangler config**

Create `worker/wrangler.toml`:

```toml
name = "alomat-signals-api"
main = "src/index.js"
compatibility_date = "2026-07-10"

[[d1_databases]]
binding = "DB"
database_name = "alomat_signals"
database_id = "00000000-0000-0000-0000-000000000000"
migrations_dir = "migrations"
```

- [ ] **Step 5: Run Worker tests**

Run:

```powershell
cd worker
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit Task 2**

```powershell
git add worker/wrangler.toml worker/src/index.js worker/test/signals.test.mjs
git commit -m "Add signals worker API"
```

---

### Task 3: Static Site Live Timeline Integration

**Files:**
- Modify: `build.mjs`
- Modify: `app.js`

**Interfaces:**
- Consumes: `GET /api/signals?limit=20` response `{ signals: ApiSignal[] }`.
- Produces:
  - `window.__ALOMAT_SIGNALS_API_BASE__` from generated HTML.
  - Live cards rendered into `[data-signal-timeline-items]`.
  - Refreshed `storyMap` and `timelineItems` used by the detail panel.

- [ ] **Step 1: Add generated HTML hooks**

Modify `build.mjs` so `renderHome()` adds a data hook to the existing timeline items container:

```js
<div class="signal-timeline__items" data-signal-timeline-items>
```

Modify `renderDocument()` so the page includes this config script before the main app script:

```html
<script>window.__ALOMAT_SIGNALS_API_BASE__=${serializeJson(process.env.ALOMAT_SIGNALS_API_BASE ?? "")};</script>
```

Use the existing `serializeJson()` helper.

- [ ] **Step 2: Make timeline state mutable in `app.js`**

Change:

```js
const timelineItems = Array.from(document.querySelectorAll(".signal-timeline__item"));
const storyData = parseStoryData();
const storyMap = new Map(storyData.map((story) => [String(story.id), story]));
```

to:

```js
let timelineItems = Array.from(document.querySelectorAll(".signal-timeline__item"));
let storyData = parseStoryData();
let storyMap = new Map(storyData.map((story) => [String(story.id), story]));
const timelineItemsContainer = document.querySelector("[data-signal-timeline-items]");
```

- [ ] **Step 3: Add live signal normalization helpers**

Add these functions after `parseStoryData()` in `app.js`:

```js
function getSignalsApiUrl() {
  const base = String(window.__ALOMAT_SIGNALS_API_BASE__ || "").trim();
  const path = "/api/signals?limit=20";
  if (!base) {
    return path;
  }
  return `${base.replace(/\/$/, "")}${path}`;
}

function normalizeLiveSignal(signal, index) {
  const id = signal.id ?? signal.external_id ?? `live-${index}`;
  const createdAt = typeof signal.created_at === "string" ? signal.created_at : "";
  const summary = Array.isArray(signal.summary)
    ? signal.summary.map(String).filter(Boolean)
    : typeof signal.summary === "string"
      ? [signal.summary]
      : [];

  return {
    id: `live-${id}`,
    title: String(signal.title || "").trim(),
    source: String(signal.source || "").trim(),
    time: formatSignalTime(createdAt),
    score: Number.isFinite(signal.score) ? signal.score : 94,
    url: String(signal.url || "").trim(),
    image: String(signal.image || "").trim(),
    category: String(signal.category || "general").trim(),
    summary,
  };
}

function formatSignalTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\"", "&quot;");
}
```

- [ ] **Step 4: Add live timeline rendering**

Add this function in `app.js` near the detail/timeline helpers:

```js
function renderLiveTimelineItem(story, index) {
  const shift = ((index % 3) - 1) * 7;
  const storyImage = story.image || "";
  return `
    <article class="signal-timeline__item" data-side="left" data-story-id="${escapeAttribute(story.id)}" data-timeline-index="${index}" style="--timeline-headline-size: 1.420rem; --timeline-headline-shift: ${shift}px; --timeline-node-size: 20.3px; --timeline-importance: 0.94; --signal-story-image: url(&quot;${escapeAttribute(storyImage)}&quot;); --timeline-widget-image-opacity: 0.096; --timeline-widget-active-image-opacity: 0.552; --timeline-widget-width: 520px; --timeline-widget-pad-x: 19.4px; --timeline-widget-pad-y: 13.6px;">
      <div class="signal-timeline__node" aria-hidden="true"></div>
      <button type="button" class="signal-timeline__headline-button">
        <span class="signal-timeline__headline-text">${escapeHtml(story.title)}</span>
      </button>
    </article>`;
}

function replaceTimelineStories(nextStories) {
  if (!timelineItemsContainer || !nextStories.length) {
    return;
  }

  const dayMarker = timelineItemsContainer.querySelector(".signal-timeline__day-marker");
  const sentinel = timelineItemsContainer.querySelector(".signal-timeline__sentinel");
  const earlierGate = timelineItemsContainer.querySelector(".signal-timeline__earlier-gate");

  timelineItemsContainer.querySelectorAll(".signal-timeline__item").forEach((item) => item.remove());
  const html = nextStories.map(renderLiveTimelineItem).join("");

  if (sentinel) {
    sentinel.insertAdjacentHTML("beforebegin", html);
  } else if (earlierGate) {
    earlierGate.insertAdjacentHTML("beforebegin", html);
  } else if (dayMarker) {
    dayMarker.insertAdjacentHTML("afterend", html);
  } else {
    timelineItemsContainer.insertAdjacentHTML("afterbegin", html);
  }

  storyData = nextStories;
  storyMap = new Map(storyData.map((story) => [String(story.id), story]));
  timelineItems = Array.from(timelineItemsContainer.querySelectorAll(".signal-timeline__item"));
  bindTimelineItemEvents();
  resetDetailPanel();
}
```

- [ ] **Step 5: Move existing timeline click binding into a reusable function**

Find the existing code that attaches click handlers to `timelineItems` and replace it with:

```js
function bindTimelineItemEvents() {
  timelineItems.forEach((item) => {
    const button = item.querySelector(".signal-timeline__headline-button");
    button?.addEventListener("click", () => {
      const story = storyMap.get(String(item.dataset.storyId));
      if (!story) {
        return;
      }
      applyStoryToDetail(story, item, { scrollIntoView: true });
    });
  });
}

bindTimelineItemEvents();
```

Keep the same behavior for fallback cards.

- [ ] **Step 6: Fetch live signals after initial setup**

Add this function to `app.js`:

```js
async function loadLiveSignals() {
  if (!timelineItemsContainer) {
    return;
  }

  try {
    const response = await fetch(getSignalsApiUrl(), {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    const signals = Array.isArray(payload?.signals) ? payload.signals : [];
    const nextStories = signals.map(normalizeLiveSignal).filter((story) => story.title && story.summary.length);
    if (!nextStories.length) {
      return;
    }

    replaceTimelineStories(nextStories);
  } catch {
    // Keep the static fallback timeline.
  }
}

loadLiveSignals();
```

- [ ] **Step 7: Run the static site check**

Run:

```powershell
npm run check
```

Expected: PASS.

- [ ] **Step 8: Manually verify fallback behavior**

Run:

```powershell
npm run preview
```

Open the printed local URL. Expected: if no local Worker is running, the static demo timeline still appears and clicking a left card still updates the right detail panel.

- [ ] **Step 9: Commit Task 3**

```powershell
git add build.mjs app.js dist
git commit -m "Load live signals into home timeline"
```

---

### Task 4: Readiness Checks And Documentation

**Files:**
- Modify: `scripts/check-site.mjs`
- Modify: `README.md`

**Interfaces:**
- Consumes: Worker files and frontend integration from Tasks 1-3.
- Produces: `npm run check` coverage for live timeline integration and README instructions for the bot/API handoff.

- [ ] **Step 1: Extend readiness checks**

Add checks to `scripts/check-site.mjs`:

```js
const appPath = path.join(projectRoot, "app.js");
if (fs.existsSync(appPath)) {
  const app = fs.readFileSync(appPath, "utf8");
  if (!app.includes("function loadLiveSignals()")) {
    fail("app.js must load live signals from the API");
  }
  if (!app.includes("function replaceTimelineStories(nextStories)")) {
    fail("app.js must replace fallback timeline cards with live cards");
  }
  if (!app.includes("storyMap = new Map(storyData.map((story) => [String(story.id), story]));")) {
    fail("live timeline replacement must rebuild the detail-panel story map");
  }
  if (!app.includes("bindTimelineItemEvents();")) {
    fail("live timeline replacement must bind click events for right-panel updates");
  }
}

const buildPath = path.join(projectRoot, "build.mjs");
if (fs.existsSync(buildPath)) {
  const build = fs.readFileSync(buildPath, "utf8");
  if (!build.includes("data-signal-timeline-items")) {
    fail("home timeline must expose a container hook for live signal replacement");
  }
  if (!build.includes("__ALOMAT_SIGNALS_API_BASE__")) {
    fail("build output must expose the configurable signals API base URL");
  }
}

for (const relativePath of [
  "worker/src/index.js",
  "worker/src/signals.js",
  "worker/migrations/0001_create_signals.sql",
  "worker/wrangler.toml",
]) {
  if (!fs.existsSync(path.join(projectRoot, relativePath))) {
    fail(`${relativePath} is missing`);
  }
}
```

Place these checks near the existing `app.js`, `build.mjs`, and file-existence checks without duplicating existing `const appPath` or `const buildPath` declarations.

- [ ] **Step 2: Update README with Telegram bot handoff**

Add this section to `README.md`:

```md
## Live Telegram Signals

The home timeline can load live cards from a Cloudflare Worker API. The browser does not call Telegram directly. The existing Telegram bot sends each new signal to the Worker:

```bash
curl -X POST "https://signals.example.com/api/signals" \
  -H "Authorization: Bearer example-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "telegram-message-123",
    "title": "Signal card title",
    "summary": ["Short explanation 1", "Short explanation 2"],
    "source": "Source name",
    "url": "https://example.com/source",
    "category": "ai",
    "image": "https://example.com/image.jpg",
    "language": "uz",
    "created_at": "2026-07-10T13:20:00.000Z"
  }'
```

The site reads:

```text
GET /api/signals?limit=20
```

For local static builds that need a remote Worker URL, set:

```powershell
$env:ALOMAT_SIGNALS_API_BASE="https://signals.example.com"
npm run build
```

If the API is unavailable or empty, the generated fallback timeline remains visible.
```

- [ ] **Step 3: Run static and Worker checks**

Run:

```powershell
npm run check
cd worker
npm test
```

Expected: both PASS.

- [ ] **Step 4: Commit Task 4**

```powershell
git add scripts/check-site.mjs README.md
git commit -m "Document and check live signals integration"
```

---

### Task 5: Local End-To-End Verification

**Files:**
- No required source changes unless verification exposes a bug.

**Interfaces:**
- Consumes: completed Worker API and frontend live timeline integration.
- Produces: verified local behavior and exact bot integration instructions.

- [ ] **Step 1: Install Worker dependencies**

Run:

```powershell
cd worker
npm install
```

Expected: `package-lock.json` is created under `worker/`.

- [ ] **Step 2: Apply local D1 migration**

Run:

```powershell
cd worker
npm run d1:migrate:local
```

Expected: Wrangler reports the migration applied to the local D1 database.

- [ ] **Step 3: Start the Worker locally**

Run:

```powershell
cd worker
$env:ALOMAT_SIGNALS_SECRET="local-secret"
npm run dev
```

Expected: Wrangler prints a local Worker URL, usually `http://127.0.0.1:8787`.

- [ ] **Step 4: POST a sample signal**

In a second terminal:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8787/api/signals" `
  -Headers @{ Authorization = "Bearer local-secret" } `
  -ContentType "application/json" `
  -Body '{"external_id":"local-test-1","title":"Live Telegram test","summary":["This came through the Worker API."],"source":"Telegram bot","url":"https://example.com/source","category":"ai","language":"uz","created_at":"2026-07-10T13:20:00.000Z"}'
```

Expected response:

```json
{
  "ok": true
}
```

- [ ] **Step 5: Build the site against the local Worker**

Run:

```powershell
$env:ALOMAT_SIGNALS_API_BASE="http://127.0.0.1:8787"
npm run build
npm run preview
```

Expected: preview server prints a local static site URL.

- [ ] **Step 6: Verify browser behavior**

Open the preview URL. Expected:

- The left timeline shows `Live Telegram test`.
- Clicking `Live Telegram test` opens the right detail panel.
- The right detail panel shows `Live Telegram test` and `This came through the Worker API.`
- The source button points to `https://example.com/source`.

- [ ] **Step 7: Run final checks**

Run:

```powershell
npm run check
cd worker
npm test
git status --short
```

Expected: checks pass. `git status --short` shows only intended files, including `worker/package-lock.json` if `npm install` created it.

- [ ] **Step 8: Commit verification artifacts if needed**

If `worker/package-lock.json` was created:

```powershell
git add worker/package-lock.json
git commit -m "Lock worker dependencies"
```

If verification required bug fixes, commit those files with a focused message describing the fix.

---

## Deployment Handoff

After implementation passes local verification:

1. Create a Cloudflare D1 database named `alomat_signals`.
2. Replace `database_id` in `worker/wrangler.toml` with the real D1 database id.
3. Set the Worker secret:

```powershell
cd worker
wrangler secret put ALOMAT_SIGNALS_SECRET
```

4. Apply remote migrations:

```powershell
npm run d1:migrate:remote
```

5. Deploy the Worker:

```powershell
npm run deploy
```

6. Give the existing Telegram bot:

```text
POST https://signals.example.com/api/signals
Authorization: Bearer example-secret
Content-Type: application/json
```

7. Build the static site with the Worker URL:

```powershell
$env:ALOMAT_SIGNALS_API_BASE="https://signals.example.com"
npm run build
```

8. Deploy `dist/` as before.
