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
      url: normalizeOptionalUrl(input.url),
      category: normalizeOptionalText(input.category) || "general",
      image: normalizeOptionalUrl(input.image),
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

function normalizeOptionalUrl(value) {
  const normalized = normalizeText(value);
  if (!normalized || !isSafeHttpUrl(normalized)) {
    return "";
  }

  return normalized;
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

function isSafeHttpUrl(value) {
  if (!value || /[\u0000-\u001F\u007F]/.test(value)) {
    return false;
  }

  if (/[<>"'`\\\s;]/.test(value)) {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  return parsed.protocol === "http:" || parsed.protocol === "https:";
}
