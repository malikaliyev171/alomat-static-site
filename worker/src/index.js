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
