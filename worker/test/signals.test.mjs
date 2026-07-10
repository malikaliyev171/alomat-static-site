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
