import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest } from "../src/index.js";
import {
  jsonResponse,
  normalizeSignalInput,
  parseLimit,
  rowToSignal,
} from "../src/signals.js";
import { normalizeTelegramUpdate } from "../src/telegram.js";

class FakeD1 {
  constructor() {
    this.rows = [];
    this.authCodes = [];
    this.readerProfiles = [];
    this.nextId = 1;
    this.nextAuthCodeId = 1;
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
      const [
        external_id,
        title,
        summary_json,
        rich_summary_json,
        title_en,
        summary_en_json,
        rich_summary_en_json,
        title_tr,
        summary_tr_json,
        rich_summary_tr_json,
        source,
        url,
        category,
        image,
        language,
        created_at,
      ] = this.values;
      const existing = external_id ? this.db.rows.find((row) => row.external_id === external_id) : null;
      if (existing && this.sql.includes("ON CONFLICT(external_id)")) {
        Object.assign(existing, {
          title,
          summary_json,
          rich_summary_json,
          title_en,
          summary_en_json,
          rich_summary_en_json,
          title_tr,
          summary_tr_json,
          rich_summary_tr_json,
          source,
          url,
          category,
          image,
          language,
          created_at,
        });
        return { success: true };
      }
      if (existing) {
        const error = new Error("D1_ERROR: UNIQUE constraint failed: signals.external_id");
        error.cause = { message: "UNIQUE constraint failed: signals.external_id" };
        throw error;
      }
      this.db.rows.push({
        id: this.db.nextId,
        external_id,
        title,
        summary_json,
        rich_summary_json,
        title_en,
        summary_en_json,
        rich_summary_en_json,
        title_tr,
        summary_tr_json,
        rich_summary_tr_json,
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

    if (this.sql.includes("INSERT INTO auth_codes")) {
      const [email, code_hash, expires_at, created_at] = this.values;
      this.db.authCodes.push({
        id: this.db.nextAuthCodeId,
        email,
        code_hash,
        expires_at,
        created_at,
        used_at: null,
      });
      this.db.nextAuthCodeId += 1;
      return { success: true };
    }

    if (this.sql.includes("UPDATE auth_codes")) {
      const [used_at, id] = this.values;
      const row = this.db.authCodes.find((entry) => entry.id === id);
      if (row) {
        row.used_at = used_at;
      }
      return { success: true };
    }

    if (this.sql.includes("INSERT INTO reader_profiles")) {
      const [email, first_name, last_name, created_at, updated_at] = this.values;
      const existing = this.db.readerProfiles.find((row) => row.email === email);
      if (existing) {
        existing.first_name = first_name || existing.first_name;
        existing.last_name = last_name || existing.last_name;
        existing.updated_at = updated_at;
      } else {
        this.db.readerProfiles.push({
          email,
          first_name,
          last_name,
          created_at,
          updated_at,
        });
      }
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

  async first() {
    if (this.sql.includes("FROM auth_codes")) {
      const [email] = this.values;
      return (
        [...this.db.authCodes]
          .filter((row) => row.email === email && !row.used_at)
          .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.id - left.id)[0] ?? null
      );
    }

    throw new Error(`Unexpected SQL for first: ${this.sql}`);
  }
}

function testEnv() {
  return {
    DB: new FakeD1(),
    ALOMAT_SIGNALS_SECRET: "secret-for-tests",
    TELEGRAM_WEBHOOK_SECRET: "telegram-secret-for-tests",
    AUTH_DEV_CODE: "123456",
  };
}

const translatedSignal = {
  external_id: "translated-1",
  title: "O'zbekcha sarlavha",
  title_en: "English headline",
  title_tr: "Turkce baslik",
  summary: ["O'zbekcha paragraf"],
  summary_en: ["English paragraph"],
  summary_tr: ["Turkce paragraf"],
  rich_summary: [],
  rich_summary_en: [],
  rich_summary_tr: [],
};

function resendFetchRecorder() {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: "email-test-id" }),
    };
  };
  return { calls, fetchImpl };
}

test("normalizeTelegramUpdate converts a text message to signal input", () => {
  const result = normalizeTelegramUpdate(
    {
      update_id: 10,
      message: {
        message_id: 77,
        date: 1783701546,
        text: "Telegramdan kelgan habar\nIkkinchi satir timeline summary boladi\nhttps://example.com/source",
        from: { language_code: "tr" },
        chat: { id: 12345, type: "private", first_name: "Malik" },
      },
    },
    "2026-07-10T14:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    external_id: "telegram:12345:77",
    title: "Telegramdan kelgan habar",
    summary: ["Ikkinchi satir timeline summary boladi", "https://example.com/source"],
    source: "Malik",
    url: "https://example.com/source",
    category: "telegram",
    image: "",
    language: "tr",
    created_at: "2026-07-10T16:39:06.000Z",
  });
});

test("normalizeSignalInput keeps the bot source URL while stripping visible summary links", () => {
  const result = normalizeSignalInput(
    {
      title: "Signal card title",
      summary: [
        "Batafsil: https://example.com/news?utm=telegram",
        "Kanal: t.me/alomat",
        "Sayt www.example.org/path orqali ochildi.",
        "Tadqiqot (https://arxiv.org/abs/2607.07859) e'lon qilindi.",
        "Markdown [manba](https://example.com/source) matni qoladi.",
      ],
      url: "https://wrong.example/about",
    },
    "2026-07-10T14:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(result.value.summary_json), [
    "Sayt orqali ochildi.",
    "Tadqiqot e'lon qilindi.",
    "Markdown manba matni qoladi.",
  ]);
  assert.equal(result.value.url, "https://wrong.example/about");
});

test("normalizeSignalInput falls back to a visible summary link when the bot source URL is missing", () => {
  const result = normalizeSignalInput(
    {
      title: "Signal card title",
      summary: ["Haber tafsilotlari: https://example.com/news?utm=telegram"],
    },
    "2026-07-10T14:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.url, "https://example.com/news?utm=telegram");
});

test("normalizeTelegramUpdate ignores unsupported updates", () => {
  const result = normalizeTelegramUpdate({ update_id: 11, callback_query: {} }, "2026-07-10T14:00:00.000Z");

  assert.deepEqual(result, { ok: true, ignored: true, reason: "unsupported update" });
});

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
    rich_summary_json: "[]",
    title_en: "",
    summary_en_json: "[]",
    rich_summary_en_json: "[]",
    title_tr: "",
    summary_tr_json: "[]",
    rich_summary_tr_json: "[]",
    source: "Source name",
    url: "https://example.com/source",
    category: "ai",
    image: "https://example.com/image.jpg",
    language: "uz",
    created_at: "2026-07-10T13:20:00.000Z",
  });
});

test("normalizeSignalInput stores optional English and Turkish fields", () => {
  const result = normalizeSignalInput(translatedSignal, "2026-07-13T12:00:00.000Z");

  assert.equal(result.ok, true);
  assert.equal(result.value.title_en, "English headline");
  assert.equal(result.value.summary_en_json, JSON.stringify(["English paragraph"]));
  assert.equal(result.value.rich_summary_en_json, "[]");
  assert.equal(result.value.title_tr, "Turkce baslik");
  assert.equal(result.value.summary_tr_json, JSON.stringify(["Turkce paragraf"]));
  assert.equal(result.value.rich_summary_tr_json, "[]");
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

test("normalizeSignalInput rejects bot operational error messages", () => {
  const result = normalizeSignalInput(
    {
      title: "Manba matni taqdim etilmaganligi sababli post yozib bo'lmadi. Iltimos, maqolaning to'liq matnini yuboring.",
      summary: [
        "Manba matni taqdim etilmaganligi sababli post yozib bo'lmadi. Iltimos, maqolaning to'liq matnini yuboring.",
      ],
      source: "Telegram bot",
      url: "https://example.com/source",
    },
    "2026-07-10T14:00:00.000Z",
  );

  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: "signal must be a news item",
  });
});

test("normalizeSignalInput keeps valid http and https url fields unchanged", () => {
  const result = normalizeSignalInput(
    {
      title: "Signal card title",
      summary: ["Short explanation 1"],
      url: "https://example.com/source?ref=signals",
      image: "http://cdn.example.com/image.jpg",
    },
    "2026-07-10T14:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.url, "https://example.com/source?ref=signals");
  assert.equal(result.value.image, "http://cdn.example.com/image.jpg");
});

test("normalizeSignalInput preserves rich summary links and removes unsafe hrefs", () => {
  const result = normalizeSignalInput(
    {
      title: "AI digest",
      summary: ["OpenAI va Anthropic yangiliklari."],
      rich_summary: [
        {
          segments: [
            { text: "OpenAI", url: "https://openai.com/news" },
            { text: " va " },
            { text: "Anthropic", url: "javascript:alert(1)" },
            { text: " yangiliklari." },
          ],
        },
      ],
    },
    "2026-07-10T14:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.deepEqual(JSON.parse(result.value.rich_summary_json), [
    {
      segments: [
        { text: "OpenAI", url: "https://openai.com/news" },
        { text: " va " },
        { text: "Anthropic" },
        { text: " yangiliklari." },
      ],
    },
  ]);
});

test("normalizeSignalInput preserves every translated AI Digest URL exactly", () => {
  const urls = {
    uz: "https://example.com/uz/news?source=digest&lang=uz#bir",
    en: "https://example.com/en/news?source=digest&lang=en#one",
    tr: "https://example.com/tr/news?source=digest&lang=tr#bir",
  };
  const result = normalizeSignalInput(
    {
      ...translatedSignal,
      title: "AI Digest - 2026-07-13",
      rich_summary: [{ segments: [{ text: "O'zbekcha havola", url: urls.uz }] }],
      rich_summary_en: [{ segments: [{ text: "English link", url: urls.en }] }],
      rich_summary_tr: [{ segments: [{ text: "Turkce baglanti", url: urls.tr }] }],
    },
    "2026-07-13T12:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.equal(JSON.parse(result.value.rich_summary_json)[0].segments[0].url, urls.uz);
  assert.equal(JSON.parse(result.value.rich_summary_en_json)[0].segments[0].url, urls.en);
  assert.equal(JSON.parse(result.value.rich_summary_tr_json)[0].segments[0].url, urls.tr);
});

test("normalizeSignalInput derives multi-word Digest links from Markdown and HTML summaries", () => {
  const result = normalizeSignalInput(
    {
      title: "AI Digest — 2026-07-13",
      summary: [
        "Terry Tao [zamonaviy kodlash agentlari yordamida eski va yangi ilovalar yaratish](https://terrytao.wordpress.com/old-and-new-apps/) haqida yozdi.",
        "Elliot Smith <a href=\"https://example.com/autoresearch\">Autoresearch va Claude bilan cheklangan optimallashtirish</a> masalasini tahlil qildi.",
      ],
      rich_summary: [
        {
          segments: [{ text: "Terry Tao zamonaviy kodlash agentlari haqida yozdi." }],
        },
      ],
    },
    "2026-07-13T12:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.url, "https://terrytao.wordpress.com/old-and-new-apps/");
  assert.deepEqual(JSON.parse(result.value.summary_json), [
    "Terry Tao zamonaviy kodlash agentlari yordamida eski va yangi ilovalar yaratish haqida yozdi.",
    "Elliot Smith Autoresearch va Claude bilan cheklangan optimallashtirish masalasini tahlil qildi.",
  ]);
  assert.deepEqual(JSON.parse(result.value.rich_summary_json), [
    {
      segments: [
        { text: "Terry Tao " },
        {
          text: "zamonaviy kodlash agentlari yordamida eski va yangi ilovalar yaratish",
          url: "https://terrytao.wordpress.com/old-and-new-apps/",
        },
        { text: " haqida yozdi." },
      ],
    },
    {
      segments: [
        { text: "Elliot Smith " },
        {
          text: "Autoresearch va Claude bilan cheklangan optimallashtirish",
          url: "https://example.com/autoresearch",
        },
        { text: " masalasini tahlil qildi." },
      ],
    },
  ]);
});

test("normalizeSignalInput drops rich summary links from normal news", () => {
  const result = normalizeSignalInput(
    {
      title: "OpenAI yangi modelini taqdim etdi",
      summary: ["OpenAI yangi modelini taqdim etdi."],
      rich_summary: [
        {
          segments: [
            { text: "OpenAI", url: "https://openai.com/news" },
            { text: " yangi modelini taqdim etdi." },
          ],
        },
      ],
    },
    "2026-07-10T14:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.rich_summary_json, "[]");
});

test("normalizeSignalInput blanks unsafe url and image fields", () => {
  const result = normalizeSignalInput(
    {
      title: "Signal card title",
      summary: ["Short explanation 1"],
      url: "javascript:alert(1)",
      image: 'https://example.com/image.jpg") ; background-image:url(javascript:alert(1))',
    },
    "2026-07-10T14:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.url, "");
  assert.equal(result.value.image, "");
});

test("normalizeSignalInput blanks control-character and data url fields", () => {
  const result = normalizeSignalInput(
    {
      title: "Signal card title",
      summary: ["Short explanation 1"],
      url: " \u0000https://example.com/source",
      image: "data:image/svg+xml,<svg></svg>",
    },
    "2026-07-10T14:00:00.000Z",
  );

  assert.equal(result.ok, true);
  assert.equal(result.value.url, "");
  assert.equal(result.value.image, "");
});

test("parseLimit clamps to the public read range", () => {
  assert.equal(parseLimit(null), 20);
  assert.equal(parseLimit("0"), 1);
  assert.equal(parseLimit("7"), 7);
  assert.equal(parseLimit("200"), 200);
  assert.equal(parseLimit("999"), 200);
  assert.equal(parseLimit("not-a-number"), 20);
});

test("rowToSignal parses summary_json and exposes API fields", () => {
  assert.deepEqual(
    rowToSignal({
      id: 42,
      external_id: "telegram-123",
      title: "Signal card title",
      summary_json: "[\"Short explanation\"]",
      rich_summary_json:
        '[{"segments":[{"text":"OpenAI","url":"https://openai.com/news"},{"text":" update"}]}]',
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
      rich_summary: [
        {
          segments: [
            { text: "OpenAI", url: "https://openai.com/news" },
            { text: " update" },
          ],
        },
      ],
      title_en: "",
      summary_en: [],
      rich_summary_en: [],
      title_tr: "",
      summary_tr: [],
      rich_summary_tr: [],
      source: "Source name",
      url: "https://example.com/source",
      category: "ai",
      image: "",
      language: "uz",
      created_at: "2026-07-10T13:20:00.000Z",
    },
  );
});

test("rowToSignal returns empty translated fields for legacy rows", () => {
  const signal = rowToSignal({
    id: 43,
    external_id: "legacy-1",
    title: "Legacy signal",
    summary_json: '["Legacy summary"]',
    rich_summary_json: "[]",
    source: "",
    url: "",
    category: "general",
    image: "",
    language: "uz",
    created_at: "2026-07-10T13:20:00.000Z",
  });

  assert.equal(signal.title_en, "");
  assert.deepEqual(signal.summary_en, []);
  assert.deepEqual(signal.rich_summary_en, []);
  assert.equal(signal.title_tr, "");
  assert.deepEqual(signal.summary_tr, []);
  assert.deepEqual(signal.rich_summary_tr, []);
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
    new Request("https://xabar.alomat.workers.dev/api/signals", {
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
    new Request("https://xabar.alomat.workers.dev/api/signals", {
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

test("POST and GET /api/signals preserve rich summary link segments", async () => {
  const env = testEnv();
  const richSummary = [
    {
      segments: [
        { text: "OpenAI", url: "https://openai.com/news" },
        { text: " yangi model chiqardi." },
      ],
    },
  ];
  const created = await handleRequest(
    new Request("https://xabar.alomat.workers.dev/api/signals", {
      method: "POST",
      headers: {
        authorization: "Bearer secret-for-tests",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        external_id: "digest-1",
        title: "AI digest",
        summary: ["OpenAI yangi model chiqardi."],
        rich_summary: richSummary,
      }),
    }),
    env,
    new Date("2026-07-10T14:00:00.000Z"),
  );

  const listed = await handleRequest(new Request("https://xabar.alomat.workers.dev/api/signals"), env);
  const body = await listed.json();

  assert.equal(created.status, 201);
  assert.equal(listed.status, 200);
  assert.deepEqual(body.signals[0].rich_summary, richSummary);
});

test("POST upsert and GET /api/signals preserve translated fields", async () => {
  const env = testEnv();
  const postSignal = (body, now) =>
    handleRequest(
      new Request("https://xabar.alomat.workers.dev/api/signals", {
        method: "POST",
        headers: {
          authorization: "Bearer secret-for-tests",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      }),
      env,
      new Date(now),
    );

  const created = await postSignal(translatedSignal, "2026-07-13T12:00:00.000Z");
  assert.equal(created.status, 201);
  assert.equal(env.DB.rows[0].title_en, "English headline");
  assert.equal(env.DB.rows[0].summary_en_json, JSON.stringify(["English paragraph"]));
  assert.equal(env.DB.rows[0].rich_summary_en_json, "[]");
  assert.equal(env.DB.rows[0].title_tr, "Turkce baslik");
  assert.equal(env.DB.rows[0].summary_tr_json, JSON.stringify(["Turkce paragraf"]));
  assert.equal(env.DB.rows[0].rich_summary_tr_json, "[]");
  const translatedUpdate = {
    ...translatedSignal,
    title_en: "Updated English headline",
    summary_en: ["Updated English paragraph"],
    title_tr: "Guncel Turkce baslik",
    summary_tr: ["Guncel Turkce paragraf"],
  };
  const updated = await postSignal(translatedUpdate, "2026-07-13T12:01:00.000Z");
  const listed = await handleRequest(new Request("https://xabar.alomat.workers.dev/api/signals"), env);
  const body = await listed.json();

  assert.equal(updated.status, 201);
  assert.equal(env.DB.rows.length, 1);
  assert.equal(listed.status, 200);
  assert.deepEqual(body.signals[0], {
    id: 1,
    external_id: "translated-1",
    title: "O'zbekcha sarlavha",
    summary: ["O'zbekcha paragraf"],
    rich_summary: [],
    title_en: "Updated English headline",
    summary_en: ["Updated English paragraph"],
    rich_summary_en: [],
    title_tr: "Guncel Turkce baslik",
    summary_tr: ["Guncel Turkce paragraf"],
    rich_summary_tr: [],
    source: "",
    url: "",
    category: "general",
    image: "",
    language: "uz",
    created_at: "2026-07-13T12:01:00.000Z",
  });
});

test("POST /api/telegram-webhook rejects missing Telegram secret", async () => {
  const response = await handleRequest(
    new Request("https://xabar.alomat.workers.dev/api/telegram-webhook", {
      method: "POST",
      body: JSON.stringify({ update_id: 10 }),
    }),
    testEnv(),
    new Date("2026-07-10T14:00:00.000Z"),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "unauthorized" });
});

test("POST /api/telegram-webhook inserts a Telegram message", async () => {
  const env = testEnv();
  const response = await handleRequest(
    new Request("https://xabar.alomat.workers.dev/api/telegram-webhook", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "telegram-secret-for-tests" },
      body: JSON.stringify({
        update_id: 10,
        message: {
          message_id: 77,
          date: 1783701546,
          text: "Telegramdan kelgan habar\nIkkinchi satir timeline summary boladi",
          chat: { id: 12345, type: "private", first_name: "Malik" },
        },
      }),
    }),
    env,
    new Date("2026-07-10T14:00:00.000Z"),
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(env.DB.rows.length, 1);
  assert.equal(env.DB.rows[0].external_id, "telegram:12345:77");
  assert.equal(env.DB.rows[0].title, "Telegramdan kelgan habar");
});

test("POST /api/telegram-webhook keeps duplicate Telegram retries idempotent", async () => {
  const env = testEnv();
  const request = () =>
    new Request("https://xabar.alomat.workers.dev/api/telegram-webhook", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": "telegram-secret-for-tests" },
      body: JSON.stringify({
        update_id: 10,
        message: {
          message_id: 77,
          date: 1783701546,
          text: "Telegramdan kelgan habar\nIkkinchi satir timeline summary boladi",
          chat: { id: 12345, type: "private", first_name: "Malik" },
        },
      }),
    });

  await handleRequest(request(), env, new Date("2026-07-10T14:00:00.000Z"));
  const duplicate = await handleRequest(request(), env, new Date("2026-07-10T14:00:01.000Z"));

  assert.equal(duplicate.status, 201);
  assert.deepEqual(await duplicate.json(), { ok: true });
  assert.equal(env.DB.rows.length, 1);
});

test("POST /api/signals updates an existing external_id with corrected source data", async () => {
  const env = testEnv();
  const originalBody = {
    external_id: "telegram-123",
    title: "Live card",
    summary: ["Live summary"],
    url: "https://info.arxiv.org/about",
  };
  const correctedBody = {
    external_id: "telegram-123",
    title: "Corrected live card",
    summary: ["Corrected live summary"],
    url: "https://arxiv.org/abs/2607.09153",
  };

  await handleRequest(
    new Request("https://xabar.alomat.workers.dev/api/signals", {
      method: "POST",
      headers: { authorization: "Bearer secret-for-tests" },
      body: JSON.stringify(originalBody),
    }),
    env,
    new Date("2026-07-10T14:00:00.000Z"),
  );
  const duplicate = await handleRequest(
    new Request("https://xabar.alomat.workers.dev/api/signals", {
      method: "POST",
      headers: { authorization: "Bearer secret-for-tests" },
      body: JSON.stringify(correctedBody),
    }),
    env,
    new Date("2026-07-10T14:01:00.000Z"),
  );

  assert.equal(duplicate.status, 201);
  assert.deepEqual(await duplicate.json(), { ok: true });
  assert.equal(env.DB.rows.length, 1);
  assert.equal(env.DB.rows[0].title, "Corrected live card");
  assert.equal(env.DB.rows[0].summary_json, JSON.stringify(["Corrected live summary"]));
  assert.equal(env.DB.rows[0].url, "https://arxiv.org/abs/2607.09153");
});

test("GET /api/signals returns newest-first rows", async () => {
  const env = testEnv();
  for (const [title, created_at] of [
    ["Older", "2026-07-10T10:00:00.000Z"],
    ["Newer", "2026-07-10T12:00:00.000Z"],
  ]) {
    await handleRequest(
      new Request("https://xabar.alomat.workers.dev/api/signals", {
        method: "POST",
        headers: { authorization: "Bearer secret-for-tests" },
        body: JSON.stringify({ title, summary: [`${title} summary`], created_at }),
      }),
      env,
      new Date("2026-07-10T14:00:00.000Z"),
    );
  }

  const response = await handleRequest(new Request("https://xabar.alomat.workers.dev/api/signals?limit=1"), env);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.signals.length, 1);
  assert.equal(body.signals[0].title, "Newer");
});

test("OPTIONS /api/signals returns CORS preflight headers", async () => {
  const response = await handleRequest(new Request("https://xabar.alomat.workers.dev/api/signals", { method: "OPTIONS" }), testEnv());

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
});

test("POST /api/readers stores an email without sending mail", async () => {
  const env = testEnv();
  const resend = resendFetchRecorder();
  const response = await handleRequest(
    new Request("https://alomat.ai/api/readers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: " Malik@example.COM " }),
    }),
    env,
    new Date("2026-07-11T12:00:00.000Z"),
    { fetch: resend.fetchImpl },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(env.DB.authCodes.length, 0);
  assert.equal(resend.calls.length, 0);
  assert.deepEqual(env.DB.readerProfiles, [
    {
      email: "malik@example.com",
      first_name: "",
      last_name: "",
      created_at: "2026-07-11T12:00:00.000Z",
      updated_at: "2026-07-11T12:00:00.000Z",
    },
  ]);
});

test("POST /api/readers stores first and last name for an existing email", async () => {
  const env = testEnv();
  const response = await handleRequest(
    new Request("https://alomat.ai/api/readers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "malik@example.com", first_name: " Malik ", last_name: " Aliyev " }),
    }),
    env,
    new Date("2026-07-11T12:01:00.000Z"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.deepEqual(env.DB.readerProfiles, [
    {
      email: "malik@example.com",
      first_name: "Malik",
      last_name: "Aliyev",
      created_at: "2026-07-11T12:01:00.000Z",
      updated_at: "2026-07-11T12:01:00.000Z",
    },
  ]);
});

test("POST /api/auth/welcome-email is not exposed for the reader profile flow", async () => {
  const response = await handleRequest(
    new Request("https://alomat.ai/api/auth/welcome-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "malik@example.com" }),
    }),
    testEnv(),
    new Date("2026-07-11T12:00:00.000Z"),
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not found" });
});

test("POST /api/auth/request-code is not exposed for the reader profile flow", async () => {
  const env = testEnv();
  const resend = resendFetchRecorder();
  const response = await handleRequest(
    new Request("https://xabar.alomat.workers.dev/api/auth/request-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: " Malik@example.COM " }),
    }),
    env,
    new Date("2026-07-11T12:00:00.000Z"),
    { fetch: resend.fetchImpl },
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not found" });
  assert.equal(env.DB.authCodes.length, 0);
  assert.equal(resend.calls.length, 0);
});

test("POST /api/auth/verify-code is not exposed for the local email-save flow", async () => {
  const response = await handleRequest(
    new Request("https://xabar.alomat.workers.dev/api/auth/verify-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "malik@example.com", code: "123456" }),
    }),
    testEnv(),
    new Date("2026-07-11T12:01:00.000Z"),
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "not found" });
});

test("GET / serves static site assets when the Worker has an assets binding", async () => {
  const env = {
    ...testEnv(),
    ASSETS: {
      async fetch(request) {
        return new Response(`asset:${new URL(request.url).pathname}`, {
          headers: { "content-type": "text/plain" },
        });
      },
    },
  };

  const response = await handleRequest(new Request("https://xabar.alomat.workers.dev/"), env);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "asset:/");
});
