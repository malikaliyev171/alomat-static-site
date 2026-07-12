import { jsonResponse, normalizeSignalInput, parseLimit, rowToSignal } from "./signals.js";
import { normalizeTelegramUpdate } from "./telegram.js";

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};

export async function handleRequest(request, env, now = new Date(), services = {}) {
  const url = new URL(request.url);

  if (url.pathname === "/api/telegram-webhook") {
    return handleTelegramWebhook(request, env, now);
  }

  if (url.pathname === "/api/readers") {
    return handleReaderProfile(request, env, now);
  }

  if (url.pathname !== "/api/signals") {
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
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
    `SELECT id, external_id, title, summary_json, rich_summary_json, source, url, category, image, language, created_at
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

  const stored = await insertSignal(env, normalized.value);
  if (!stored.ok) {
    return jsonResponse({ error: stored.error }, stored.status);
  }

  return jsonResponse({ ok: true }, 201);
}

async function handleTelegramWebhook(request, env, now) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405, { allow: "POST" });
  }

  if (!isTelegramWebhookAuthorized(request, env)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return jsonResponse({ error: "invalid JSON body" }, 400);
  }

  const telegram = normalizeTelegramUpdate(update, now.toISOString());
  if (!telegram.ok) {
    return jsonResponse({ error: telegram.error }, telegram.status);
  }
  if (telegram.ignored) {
    return jsonResponse({ ok: true, ignored: true, reason: telegram.reason });
  }

  const normalized = normalizeSignalInput(telegram.value, now.toISOString());
  if (!normalized.ok) {
    return jsonResponse({ ok: true, ignored: true, reason: normalized.error });
  }

  const stored = await insertSignal(env, normalized.value);
  if (!stored.ok && stored.status === 409) {
    return jsonResponse({ ok: true, duplicate: true });
  }
  if (!stored.ok) {
    return jsonResponse({ error: stored.error }, stored.status);
  }

  return jsonResponse({ ok: true }, 201);
}

async function handleReaderProfile(request, env, now) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, 405, { allow: "POST" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid JSON body" }, 400);
  }

  const email = normalizeEmail(body?.email);
  if (!email) {
    return jsonResponse({ error: "valid email is required" }, 400);
  }

  const firstName = normalizeName(body?.first_name);
  const lastName = normalizeName(body?.last_name);
  const timestamp = now.toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO reader_profiles (email, first_name, last_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         first_name = CASE WHEN excluded.first_name != '' THEN excluded.first_name ELSE reader_profiles.first_name END,
         last_name = CASE WHEN excluded.last_name != '' THEN excluded.last_name ELSE reader_profiles.last_name END,
         updated_at = excluded.updated_at`,
    )
      .bind(email, firstName, lastName, timestamp, timestamp)
      .run();
  } catch {
    return jsonResponse({ error: "storage error" }, 500);
  }

  return jsonResponse({ ok: true });
}

async function insertSignal(env, signal) {
  try {
    await env.DB.prepare(
      `INSERT INTO signals (external_id, title, summary_json, rich_summary_json, source, url, category, image, language, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        signal.external_id || null,
        signal.title,
        signal.summary_json,
        signal.rich_summary_json,
        signal.source,
        signal.url,
        signal.category,
        signal.image,
        signal.language,
        signal.created_at,
      )
      .run();
  } catch (error) {
    if (String(error?.message ?? "").includes("UNIQUE constraint failed")) {
      return { ok: false, status: 409, error: "duplicate external_id" };
    }
    return { ok: false, status: 500, error: "storage error" };
  }

  return { ok: true };
}

function isAuthorized(request, env) {
  const expected = env.ALOMAT_SIGNALS_SECRET;
  const actual = request.headers.get("authorization") ?? "";
  return Boolean(expected) && actual === `Bearer ${expected}`;
}

function isTelegramWebhookAuthorized(request, env) {
  const expected = env.TELEGRAM_WEBHOOK_SECRET;
  const actual = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  return Boolean(expected) && actual === expected;
}

function normalizeEmail(value) {
  const email = String(value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function normalizeName(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
}
