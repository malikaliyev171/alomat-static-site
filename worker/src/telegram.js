const TELEGRAM_URL_PATTERN = /https?:\/\/[^\s<>"'`\\]+/i;

export function normalizeTelegramUpdate(update, nowIso) {
  if (!update || typeof update !== "object" || Array.isArray(update)) {
    return { ok: false, status: 400, error: "body must be a JSON object" };
  }

  const message = update.message || update.channel_post;
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return { ok: true, ignored: true, reason: "unsupported update" };
  }

  const rawText = normalizeText(message.text || message.caption);
  if (!rawText) {
    return { ok: true, ignored: true, reason: "empty message" };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] || rawText;
  const summary = lines.slice(1);
  const chat = message.chat && typeof message.chat === "object" ? message.chat : {};

  return {
    ok: true,
    value: {
      external_id: telegramExternalId(chat.id, message.message_id, update.update_id),
      title,
      summary: summary.length ? summary : [title],
      source: telegramSource(chat),
      url: firstUrl(rawText),
      category: "telegram",
      image: "",
      language: normalizeText(message.from?.language_code) || "tr",
      created_at: telegramCreatedAt(message.date, nowIso),
    },
  };
}

function telegramExternalId(chatId, messageId, updateId) {
  if (chatId != null && messageId != null) {
    return `telegram:${chatId}:${messageId}`;
  }
  return updateId != null ? `telegram:update:${updateId}` : "";
}

function telegramSource(chat) {
  if (typeof chat.title === "string" && chat.title.trim()) {
    return chat.title.trim();
  }
  if (typeof chat.username === "string" && chat.username.trim()) {
    return `@${chat.username.trim().replace(/^@/, "")}`;
  }
  const name = [chat.first_name, chat.last_name].filter((part) => typeof part === "string" && part.trim()).join(" ");
  return name.trim() || "Telegram bot";
}

function telegramCreatedAt(unixSeconds, nowIso) {
  if (typeof unixSeconds !== "number" || !Number.isFinite(unixSeconds)) {
    return nowIso;
  }
  const date = new Date(unixSeconds * 1000);
  return Number.isNaN(date.getTime()) ? nowIso : date.toISOString();
}

function firstUrl(text) {
  const match = text.match(TELEGRAM_URL_PATTERN);
  return match ? match[0] : "";
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}
