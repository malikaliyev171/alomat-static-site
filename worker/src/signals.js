const MAX_TEXT_LENGTH = 5000;
const MAX_SUMMARY_ITEMS = 6;
const MAX_RICH_SEGMENTS = 64;
const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 200;

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

  if (isBotOperationalMessage({ title, summary })) {
    return { ok: false, status: 400, error: "signal must be a news item" };
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
      rich_summary_json: JSON.stringify(
        isAiDigestTitle(title) ? normalizeDigestRichSummary(input.rich_summary, input.summary) : [],
      ),
      title_en: normalizeOptionalText(input.title_en),
      summary_en_json: JSON.stringify(normalizeSummary(input.summary_en)),
      rich_summary_en_json: JSON.stringify(
        isAiDigestTitle(title) ? normalizeDigestRichSummary(input.rich_summary_en, input.summary_en) : [],
      ),
      title_tr: normalizeOptionalText(input.title_tr),
      summary_tr_json: JSON.stringify(normalizeSummary(input.summary_tr)),
      rich_summary_tr_json: JSON.stringify(
        isAiDigestTitle(title) ? normalizeDigestRichSummary(input.rich_summary_tr, input.summary_tr) : [],
      ),
      has_title_en: hasOwnProperty(input, "title_en"),
      has_summary_en: hasOwnProperty(input, "summary_en"),
      has_rich_summary_en: hasOwnProperty(input, "rich_summary_en"),
      has_title_tr: hasOwnProperty(input, "title_tr"),
      has_summary_tr: hasOwnProperty(input, "summary_tr"),
      has_rich_summary_tr: hasOwnProperty(input, "rich_summary_tr"),
      source: normalizeOptionalText(input.source),
      url: normalizeOptionalUrl(input.url) || firstVisibleLinkFromSummary(input.summary),
      category: normalizeOptionalText(input.category) || "general",
      image: normalizeOptionalUrl(input.image),
      language: normalizeOptionalText(input.language) || "uz",
      created_at: createdAt,
    },
  };
}

function hasOwnProperty(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function rowToSignal(row) {
  return {
    id: row.id,
    external_id: row.external_id || "",
    title: row.title,
    summary: parseSummaryJson(row.summary_json),
    rich_summary: parseRichSummaryJson(row.rich_summary_json),
    title_en: row.title_en || "",
    summary_en: parseSummaryJson(row.summary_en_json),
    rich_summary_en: parseRichSummaryJson(row.rich_summary_en_json),
    title_tr: row.title_tr || "",
    summary_tr: parseSummaryJson(row.summary_tr_json),
    rich_summary_tr: parseRichSummaryJson(row.rich_summary_tr_json),
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
  return items
    .map(normalizeText)
    .map(stripVisibleLinks)
    .filter((item) => !isLinkOnlyLabel(item))
    .filter(Boolean)
    .slice(0, MAX_SUMMARY_ITEMS);
}

function isAiDigestTitle(value) {
  const title = String(value ?? "")
    .normalize("NFKD")
    .replace(/\u0307/g, "");
  return /\bAI[\s-]+Digest\b/i.test(title);
}

function normalizeRichSummary(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, MAX_SUMMARY_ITEMS)
    .map((paragraph) => {
      const rawSegments = Array.isArray(paragraph?.segments) ? paragraph.segments : [];
      let remaining = MAX_TEXT_LENGTH;
      const segments = [];

      for (const segment of rawSegments.slice(0, MAX_RICH_SEGMENTS)) {
        if (remaining <= 0 || typeof segment?.text !== "string") {
          continue;
        }
        const text = segment.text.slice(0, remaining);
        remaining -= text.length;
        if (!text) {
          continue;
        }
        const url = normalizeOptionalUrl(segment.url);
        segments.push(url ? { text, url } : { text });
      }

      return segments.length && segments.map((segment) => segment.text).join("").trim()
        ? { segments }
        : null;
    })
    .filter(Boolean);
}

function normalizeDigestRichSummary(richValue, summaryValue) {
  const normalized = normalizeRichSummary(richValue);
  if (hasRichSummaryLinks(normalized)) {
    return normalized;
  }

  const summaryDerived = deriveRichSummaryFromLinkedText(summaryValue);
  if (summaryDerived.length) {
    return summaryDerived;
  }

  const richTextItems = Array.isArray(richValue)
    ? richValue.map((paragraph) =>
        (Array.isArray(paragraph?.segments) ? paragraph.segments : [])
          .map((segment) => (typeof segment?.text === "string" ? segment.text : ""))
          .join(""),
      )
    : [];
  const richTextDerived = deriveRichSummaryFromLinkedText(richTextItems);
  return richTextDerived.length ? richTextDerived : normalized;
}

function hasRichSummaryLinks(paragraphs) {
  return paragraphs.some((paragraph) => paragraph.segments.some((segment) => Boolean(segment.url)));
}

function deriveRichSummaryFromLinkedText(value) {
  const items = (Array.isArray(value) ? value : typeof value === "string" ? [value] : [])
    .filter((item) => typeof item === "string")
    .slice(0, MAX_SUMMARY_ITEMS);
  const parsed = items.map(parseLinkedSummaryParagraph).filter((entry) => entry.paragraph);
  if (!parsed.some((entry) => entry.hasLink)) {
    return [];
  }
  return parsed.map((entry) => entry.paragraph);
}

function parseLinkedSummaryParagraph(value) {
  const raw = normalizeText(value);
  const linkPattern =
    /<a\b[^>]*\bhref\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>|\[([^\]]+)\]\(((?:https?:\/\/|www\.|t\.me\/|telegram\.me\/)[^)]+)\)/gi;
  const segments = [];
  let cursor = 0;
  let remaining = MAX_TEXT_LENGTH;
  let hasLink = false;

  const pushSegment = (textValue, urlValue = "") => {
    if (remaining <= 0 || segments.length >= MAX_RICH_SEGMENTS) {
      return;
    }
    const text = stripHtmlMarkup(textValue).slice(0, remaining);
    if (!text) {
      return;
    }
    remaining -= text.length;
    const url = normalizeInlineLinkUrl(urlValue);
    if (url) {
      hasLink = true;
      segments.push({ text, url });
    } else {
      segments.push({ text });
    }
  };

  for (const match of raw.matchAll(linkPattern)) {
    pushSegment(raw.slice(cursor, match.index));
    const htmlUrl = match[1] || match[2] || match[3] || "";
    const label = match[4] ?? match[5] ?? "";
    const markdownUrl = match[6] || "";
    pushSegment(label, htmlUrl || markdownUrl);
    cursor = match.index + match[0].length;
  }
  pushSegment(raw.slice(cursor));

  if (!segments.length) {
    const text = stripVisibleLinks(raw);
    return {
      paragraph: text ? { segments: [{ text }] } : null,
      hasLink: false,
    };
  }

  return {
    paragraph: segments.map((segment) => segment.text).join("").trim() ? { segments } : null,
    hasLink,
  };
}

function stripHtmlMarkup(value) {
  return String(value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "");
}

function normalizeInlineLinkUrl(value) {
  let normalized = String(value ?? "").trim().replace(/&amp;/gi, "&");
  if (/^(?:www\.|t\.me\/|telegram\.me\/)/i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  return normalizeOptionalUrl(normalized);
}

function firstVisibleLinkFromText(value) {
  const text = String(value ?? "");
  const match = text.match(/https?:\/\/[^\s<>"'`\\)\]]+|www\.[^\s<>"'`\\)\]]+|(?:t\.me|telegram\.me)\/[^\s<>"'`\\)\]]+/i);
  if (!match) {
    return "";
  }
  const url = match[0].startsWith("www.") ? `https://${match[0]}` : match[0];
  return isSafeHttpUrl(url) ? url : "";
}

function firstVisibleLinkFromSummary(value) {
  const items = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  for (const item of items) {
    const link = firstVisibleLinkFromText(item);
    if (link) {
      return link;
    }
  }
  return "";
}

function stripVisibleLinks(value) {
  return String(value ?? "")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.|t\.me\/|telegram\.me\/)[^)]+\)/gi, "$1")
    .replace(/<a\b[^>]*>(.*?)<\/a>/gis, "$1")
    .replace(/https?:\/\/[^\s<>"'`\\]+|www\.[^\s<>"'`\\]+|(?:t\.me|telegram\.me)\/[^\s<>"'`\\]+/gi, "")
    .replace(/\(\s+/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function isLinkOnlyLabel(value) {
  return /^[\s\-–—•*]*(?:batafsil|kanal|link|manba|source|channel|more|read more)\s*:?\s*$/i.test(value);
}

function normalizeOperationalText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[‘’ʻʼ`]/g, "'");
}

function isBotOperationalMessage(signal) {
  const text = normalizeOperationalText([signal?.title, ...(Array.isArray(signal?.summary) ? signal.summary : [])].join(" "));
  return (
    text.includes("manba matni taqdim etilmagan") ||
    text.includes("post yozib bo'lmadi") ||
    text.includes("maqolaning to'liq matnini yuboring") ||
    text.includes("source text was not provided") ||
    text.includes("could not write the post")
  );
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

function parseRichSummaryJson(value) {
  try {
    return normalizeRichSummary(JSON.parse(value || "[]"));
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
