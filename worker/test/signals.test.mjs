import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest } from "../src/index.js";
import {
  jsonResponse,
  normalizeSignalInput,
  parseLimit,
  rowToSignal,
} from "../src/signals.js";

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
