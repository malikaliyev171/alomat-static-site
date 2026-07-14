const paletteOrder = ["0", "2", "4", "5", "6", "7"];
const paletteThemeMap = {
  0: "dark",
  2: "light",
  4: "signal",
  5: "light",
  6: "dark",
  7: "signal",
};
const paletteSwatches = {
  0: { bg: "#05070d", fg: "#ff4d32" },
  2: { bg: "#efeff2", fg: "#05070d" },
  4: { bg: "#ff4d32", fg: "#efeff2" },
  5: { bg: "#efeff2", fg: "#ff4d32" },
  6: { bg: "#05070d", fg: "#efeff2" },
  7: { bg: "#ff4d32", fg: "#05070d" },
};

const supportedLocales = ["uz", "en", "tr"];
const documentLocale = String(document.documentElement.lang || "").toLowerCase().split("-")[0];
const locale = supportedLocales.includes(documentLocale) ? documentLocale : "uz";
const themePickers = Array.from(document.querySelectorAll("[data-palette-picker]"));
const themeButtons = Array.from(document.querySelectorAll("[data-palette-toggle]"));
const themeOptions = Array.from(document.querySelectorAll("[data-palette-option]"));
const signalSortRoot = document.querySelector("[data-signal-sort]");
const signalSortButton = signalSortRoot?.querySelector("[data-signal-sort-trigger]");
const signalSortLabel = signalSortRoot?.querySelector("[data-signal-sort-label]");
const signalSortMenu = signalSortRoot?.querySelector("[data-signal-sort-menu]");
const signalSortOptions = Array.from(signalSortRoot?.querySelectorAll("[data-signal-sort-option]") ?? []);
const nameForm = document.querySelector("[data-name-form]");
const nameInput = document.querySelector("[data-name-input]");
const nameFirstInput = document.querySelector("[data-name-first-input]");
const nameLastInput = document.querySelector("[data-name-last-input]");
const nameEmailStep = document.querySelector("[data-name-email-step]");
const nameProfileStep = document.querySelector("[data-name-profile-step]");
const nameCodeField = document.querySelector("[data-name-code-field]");
const nameCodeInput = document.querySelector("[data-name-code-input]");
const nameAuthStatus = document.querySelector("[data-name-auth-status]");
const nameAuthSubmit = document.querySelector("[data-name-auth-submit]");
const nameSubmitLabel = document.querySelector("[data-name-submit-label]");
const nameDisplay = document.querySelector("[data-name-display]");
const heroTitle = document.querySelector("[data-hero-title]");
const heroBody = document.querySelector("[data-hero-body]");
const readerGateAction = document.querySelector(".signal-reader-gate__action");
const nameModal = document.querySelector("[data-name-modal]");
const nameModalClose = document.querySelector("[data-name-modal-close]");
const libraryGateActions = Array.from(document.querySelectorAll("[data-library-gate]"));
const loadEarlierButton = document.querySelector("[data-load-earlier]");
const signalStatusTime = document.querySelector("[data-signal-status-time]");
const signalStatusCount = document.querySelector("[data-signal-status-count]");
const libraryList = document.querySelector("[data-library-list]");
const libraryEmpty = document.querySelector("[data-library-empty]");
const libraryCountElements = {
  saved: document.querySelector('[data-library-count="saved"]'),
  liked: document.querySelector('[data-library-count="liked"]'),
  total: document.querySelector('[data-library-count="total"]'),
};
let timelineItems = Array.from(document.querySelectorAll(".signal-timeline__item"));
const storyDataElement = document.querySelector("[data-signal-stories]");
const detailPanel = document.querySelector("[data-signal-detail]");
const detailContent = detailPanel?.querySelector("[data-signal-detail-content]");
const detailVisual = detailPanel?.querySelector("[data-signal-detail-visual]");
const pageMain = document.querySelector(".page-home");
let storyData = parseStoryData();
let storyMap = new Map(storyData.map((story) => [String(story.id), story]));
const timelineItemsContainer = document.querySelector("[data-signal-timeline-items]");
const timelineRoot = document.querySelector(".signal-timeline");
const timelineStage = document.querySelector("[data-timeline-stage]");
const timelineRouteSvg = document.querySelector("[data-timeline-route-svg]");
const timelineRoutePath = document.querySelector("[data-timeline-route-path]");
const timelineCursor = document.querySelector("[data-timeline-cursor]");
const timelineStartAxis = document.querySelector(".signal-reader-gate__axis");
const detailDefaults = captureDetailDefaults();
let activeStoryId = null;
let activeUpdateFrame = 0;
let activeTimelineIndex = -1;
let timelineLayoutFrame = 0;
let timelineResizeObserver = null;
let timelineMorphIndexes = new Set();
let timelineLayout = {
  rootDocumentTop: 0,
  start: null,
  samples: [],
  activationYs: [],
  activationScrollYs: [],
  cardEntryYs: [],
  cardRanges: [],
  scrollMap: null,
  items: [],
  scrollRange: 1,
  stageHeight: 1,
  visualHeight: 1,
};
let timelineRevealObserver = null;
let earlierLiveStoryGroups = [];
let liveTimelineTodayKey = getLocalDayKey(new Date());
let authRequestInFlight = false;

document.documentElement.classList.add("js-ready");

const storageKeys = {
  theme: "alomat-palette",
  name: "alomat-name",
  email: "alomat-email",
  library: "alomat-library-v1",
};

const legacyStorageKeys = {
  theme: "oesnada-feed-palette",
  name: "oesnada-name",
};

const labelMap = {
  uz: {
    palette: "Rang tanla",
    save: "Saqlangan",
    greeting: (name) => `Salom, ${name}. Ismingiz saqlandi.`,
    hint: (name) => `Salom, ${name}. Saqlashlar va yoqtirishlar shu nom bilan bog‘langan.`,
    heroGreeting: (name) => `Xush kelibsiz, ${name}.`,
    heroBody:
      "Kunning eng muhim o'zgarishlari vaqt, manba va dolzarbligi bilan bitta chiziqda. Signalni oching va nima uchun muhimligini tezda ko'ring.",
    reveal: "Oldingi kunlar ochildi",
    savedEmail: "Mail saqlap qolindi",
    requestSubmit: "Mailni saqlash",
    nameSubmit: "Ismni saqlash",
    invalidEmail: "Iltimos, to'g'ri e-pochta kiriting.",
    invalidName: "Iltimos, ism va familiyani kiriting.",
    saveFailed: "Ma'lumot saqlanmadi. Qayta urinib ko'ring.",
  },
  en: {
    palette: "Palette",
    save: "Saved",
    greeting: (name) => `Hello, ${name}. Your name is saved.`,
    hint: (name) => `Hello, ${name}. Saves and likes are tied to this name.`,
    heroGreeting: (name) => `Welcome, ${name}.`,
    heroBody:
      "The day's most important shifts sit on one line with time, source, and relevance. Open a signal and see why it matters fast.",
    reveal: "Earlier days revealed",
    savedEmail: "Mail saqlap qolindi",
    requestSubmit: "Save email",
    nameSubmit: "Save name",
    invalidEmail: "Please enter a valid email.",
    invalidName: "Please enter your first and last name.",
    saveFailed: "The details could not be saved. Please try again.",
  },
  tr: {
    palette: "Palet",
    save: "Kaydedilenler",
    greeting: (name) => `Merhaba, ${name}. Adınız kaydedildi.`,
    hint: (name) => `Merhaba, ${name}. Kayıtlar ve beğeniler bu ada bağlı.`,
    heroGreeting: (name) => `Hoş geldiniz, ${name}.`,
    heroBody:
      "Günün en önemli değişimleri zaman, kaynak ve ilgileriyle tek bir çizgide. Bir sinyali açın ve neden önemli olduğunu hızla görün.",
    reveal: "Önceki günler gösterildi",
    savedEmail: "E-posta kaydedildi",
    requestSubmit: "E-postayı kaydet",
    nameSubmit: "Adı kaydet",
    invalidEmail: "Lütfen geçerli bir e-posta adresi girin.",
    invalidName: "Lütfen adınızı ve soyadınızı girin.",
    saveFailed: "Bilgiler kaydedilemedi. Lütfen tekrar deneyin.",
  },
};

const themeLabels = {
  uz: { 0: "1. palet", 2: "2. palet", 4: "3. palet", 5: "3. palet", 6: "2. palet", 7: "1. palet" },
  en: { 0: "Palette 1", 2: "Palette 2", 4: "Palette 3", 5: "Palette 3", 6: "Palette 2", 7: "Palette 1" },
  tr: { 0: "Palet 1", 2: "Palet 2", 4: "Palet 3", 5: "Palet 3", 6: "Palet 2", 7: "Palet 1" },
}[locale];

const detailLabels = {
  uz: {
    active: "FAOL SIGNAL",
    close: "Panelni yopish",
    source: "MANBA",
    time: "VAQT",
    weight: "DOLZARBLIGI",
    originalSource: "ASL MANBA",
    like: "Yoqtirish",
    save: "Saqlash",
    share: "Ulashish",
    liked: "Yoqtirildi",
    unliked: "Yoqtirish bekor qilindi",
    saved: "Saqlandi",
    unsaved: "Saqlash bekor qilindi",
    shared: "Ulashildi",
    copied: "Havola nusxalandi",
    shareFailed: "Havolani ulashib bo'lmadi",
  },
  en: {
    active: "ACTIVE SIGNAL",
    close: "Close panel",
    source: "SOURCE",
    time: "TIME",
    weight: "WEIGHT",
    originalSource: "ORIGINAL SOURCE",
    like: "Like",
    save: "Save",
    share: "Share",
    liked: "Liked",
    unliked: "Like removed",
    saved: "Saved",
    unsaved: "Save removed",
    shared: "Shared",
    copied: "Link copied",
    shareFailed: "The link could not be shared",
  },
  tr: {
    active: "AKTİF SİNYAL",
    close: "Paneli kapat",
    source: "KAYNAK",
    time: "SAAT",
    weight: "ÖNEM",
    originalSource: "ORİJİNAL KAYNAK",
    like: "Beğen",
    save: "Kaydet",
    share: "Paylaş",
    liked: "Beğenildi",
    unliked: "Beğeni kaldırıldı",
    saved: "Kaydedildi",
    unsaved: "Kayıt kaldırıldı",
    shared: "Paylaşıldı",
    copied: "Bağlantı kopyalandı",
    shareFailed: "Bağlantı paylaşılamadı",
  },
};

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseStoryData() {
  if (!storyDataElement?.textContent) {
    return [];
  }

  try {
    const stories = JSON.parse(storyDataElement.textContent);
    return Array.isArray(stories) ? stories.map(withDigestClassification) : [];
  } catch {
    return [];
  }
}

function emptyLibraryState() {
  return { version: 1, items: {} };
}

function normalizeLocalizedText(value) {
  const values = typeof value === "string" ? { uz: value } : value && typeof value === "object" ? value : {};
  const clean = (entry) => typeof entry === "string" ? entry.trim() : "";
  const uz = clean(values.uz) || clean(values.en) || clean(values.tr);
  return {
    uz,
    en: clean(values.en) || uz,
    tr: clean(values.tr) || uz,
  };
}

function normalizeLocalizedArray(value, normalizeEntries = (entries) => entries) {
  const values = Array.isArray(value) ? { uz: value } : value && typeof value === "object" ? value : {};
  const clean = (entries) => Array.isArray(entries) ? normalizeEntries(entries) : [];
  const uzCandidate = clean(values.uz);
  const enCandidate = clean(values.en);
  const trCandidate = clean(values.tr);
  const uz = uzCandidate.length ? uzCandidate : enCandidate.length ? enCandidate : trCandidate;
  return {
    uz,
    en: enCandidate.length ? enCandidate : uz,
    tr: trCandidate.length ? trCandidate : uz,
  };
}

function localizeStoryArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  const candidates = [value[locale], value.uz, value.en, value.tr];
  return candidates.find((entry) => Array.isArray(entry) && entry.length) || [];
}

function withDigestClassification(story) {
  if (!story || typeof story !== "object" || typeof story.isDigest === "boolean") {
    return story;
  }

  const title = normalizeLocalizedText(story.title);
  return {
    ...story,
    isDigest: supportedLocales.some((language) => isAiDigestTitle(title[language])),
  };
}

function normalizeLibraryStory(story) {
  const classifiedStory = withDigestClassification(story);
  const id = String(story?.id ?? "").trim();
  const title = normalizeLocalizedText(story?.title);
  const normalizeSummary = (entries) => entries
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const summary = normalizeLocalizedArray(story?.summary, normalizeSummary);
  const richSummary = normalizeLocalizedArray(story?.richSummary ?? story?.rich_summary, normalizeLiveRichSummary);
  if (!id || !title.uz) {
    return null;
  }

  return {
    id,
    title,
    summary,
    richSummary,
    isDigest: classifiedStory?.isDigest === true,
    source: String(story?.source ?? "").trim(),
    time: String(story?.time ?? "").trim(),
    score: Number.isFinite(story?.score) ? story.score : 94,
    url: sanitizeStoryUrl(story?.url),
    image: sanitizeStoryImage(story?.image),
    created_at: String(story?.createdAt ?? story?.created_at ?? "").trim(),
  };
}

function readLibraryState(storage = safeStorage()) {
  if (!storage) {
    return emptyLibraryState();
  }

  try {
    const parsed = JSON.parse(storage.getItem(storageKeys.library) || "");
    if (parsed?.version !== 1 || !parsed.items || typeof parsed.items !== "object" || Array.isArray(parsed.items)) {
      return emptyLibraryState();
    }

    const items = {};
    Object.entries(parsed.items).forEach(([id, entry]) => {
      const story = normalizeLibraryStory(entry?.story);
      const liked = entry?.liked === true;
      const saved = entry?.saved === true;
      if (!story || story.id !== id || (!liked && !saved)) {
        return;
      }
      items[id] = {
        story,
        liked,
        saved,
        updatedAt: String(entry?.updatedAt || ""),
      };
    });
    return { version: 1, items };
  } catch {
    return emptyLibraryState();
  }
}

function writeLibraryState(state, storage = safeStorage()) {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(storageKeys.library, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function getLibraryEntries(storage = safeStorage()) {
  return Object.values(readLibraryState(storage).items).sort((left, right) =>
    String(right.updatedAt).localeCompare(String(left.updatedAt)),
  );
}

function getLibraryCounts(entries = getLibraryEntries()) {
  return entries.reduce(
    (counts, entry) => {
      counts.liked += entry.liked ? 1 : 0;
      counts.saved += entry.saved ? 1 : 0;
      counts.total += 1;
      return counts;
    },
    { liked: 0, saved: 0, total: 0 },
  );
}

function toggleLibraryAction(story, action, storage = safeStorage(), now = new Date().toISOString()) {
  if (action !== "like" && action !== "save") {
    return null;
  }
  const snapshot = normalizeLibraryStory(story);
  if (!snapshot) {
    return null;
  }

  const state = readLibraryState(storage);
  const current = state.items[snapshot.id] || {
    story: snapshot,
    liked: false,
    saved: false,
    updatedAt: "",
  };
  const next = {
    story: snapshot,
    liked: action === "like" ? !current.liked : current.liked,
    saved: action === "save" ? !current.saved : current.saved,
    updatedAt: String(now),
  };

  if (!next.liked && !next.saved) {
    delete state.items[snapshot.id];
  } else {
    state.items[snapshot.id] = next;
  }
  writeLibraryState(state, storage);
  return state.items[snapshot.id] || null;
}

function renderLibraryEntriesMarkup(entries) {
  const labels = {
    uz: { liked: "Yoqtirildi", saved: "Saqlandi", source: "Manba" },
    en: { liked: "Liked", saved: "Saved", source: "Source" },
    tr: { liked: "Beğenildi", saved: "Kaydedildi", source: "Kaynak" },
  }[locale];

  return entries
    .map((entry, index) => {
      const story = entry?.story || {};
      const href = sanitizeStoryUrl(story.url);
      const title = escapeHtml(localizeStoryValue(story.title));
      const summary = escapeHtml(localizeStoryArray(story.summary)[0] ?? "");
      const source = escapeHtml(story.source ?? "");
      const time = escapeHtml(story.time ?? "");
      const titleMarkup =
        href === "#"
          ? title
          : `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer">${title}</a>`;
      const states = [
        entry?.liked ? `<span>${escapeHtml(labels.liked)}</span>` : "",
        entry?.saved ? `<span>${escapeHtml(labels.saved)}</span>` : "",
      ]
        .filter(Boolean)
        .join("");

      return `
        <article class="library-signal-row">
          <span class="library-signal-row__index">${String(index + 1).padStart(2, "0")}</span>
          <div class="library-signal-row__body">
            <h2>${titleMarkup}</h2>
            ${summary ? `<p>${summary}</p>` : ""}
            <p class="library-signal-row__source">${escapeHtml(labels.source)}: ${source}${source && time ? " / " : ""}${time}</p>
          </div>
          <span class="library-signal-row__meta">${states}</span>
        </article>`;
    })
    .join("");
}

function renderLibraryFromStorage() {
  if (!libraryList) {
    return;
  }
  const entries = getLibraryEntries();
  const counts = getLibraryCounts(entries);
  libraryList.innerHTML = renderLibraryEntriesMarkup(entries);
  Object.entries(libraryCountElements).forEach(([key, element]) => {
    if (element) {
      element.textContent = String(counts[key]);
    }
  });
  if (libraryEmpty) {
    libraryEmpty.hidden = entries.length > 0;
  }
}

function initLibrary() {
  if (!libraryList) {
    return;
  }
  renderLibraryFromStorage();
  window.addEventListener("storage", (event) => {
    if (event.key === storageKeys.library) {
      renderLibraryFromStorage();
    }
  });
}

function getSignalsApiUrl() {
  return buildApiUrl("/api/signals?limit=200");
}

function buildApiUrl(path) {
  const base = String(window.__ALOMAT_SIGNALS_API_BASE__ || "").trim();
  if (!base) {
    return path;
  }
  return `${base.replace(/\/$/, "")}${path}`;
}

function sanitizeHttpUrl(value, fallback = "") {
  const normalized = String(value ?? "").trim();
  if (!normalized || /[\u0000-\u001F\u007F]/.test(normalized)) {
    return fallback;
  }

  if (/[<>"'`\\\s;]/.test(normalized)) {
    return fallback;
  }

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? normalized : fallback;
  } catch {
    return fallback;
  }
}

function sanitizeStoryUrl(value) {
  return sanitizeHttpUrl(value, "#");
}

const HOSTED_PUBLISHING_DOMAINS = new Set([
  "wordpress.com",
  "substack.com",
  "medium.com",
  "blogspot.com",
  "github.io",
]);

const MULTIPART_PUBLIC_SUFFIXES = new Set([
  "co.uk",
  "com.au",
  "com.tr",
  "com.uz",
  "co.jp",
]);

function getSiteLabelFromUrl(value) {
  const href = sanitizeStoryUrl(value);
  if (href === "#") {
    return "";
  }

  try {
    const labels = new URL(href).hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .split(".")
      .filter(Boolean);
    if (!labels.length) {
      return "";
    }
    if (labels.length === 1) {
      return labels[0].toUpperCase();
    }

    const hostname = labels.join(".");
    const hostedDomain = [...HOSTED_PUBLISHING_DOMAINS].find(
      (domain) => hostname.endsWith(`.${domain}`),
    );
    if (hostedDomain) {
      const tenantIndex = labels.length - hostedDomain.split(".").length - 1;
      return (labels[tenantIndex] || labels[0]).toUpperCase();
    }

    const suffix = labels.slice(-2).join(".");
    const siteIndex = MULTIPART_PUBLIC_SUFFIXES.has(suffix) ? labels.length - 3 : labels.length - 2;
    return (labels[siteIndex] || labels[0]).toUpperCase();
  } catch {
    return "";
  }
}

function getStorySourceLabel(story) {
  if (story?.isDigest === true) {
    return "ALOMAT";
  }

  const siteLabel = getSiteLabelFromUrl(story?.url);
  if (siteLabel) {
    return siteLabel;
  }

  return String(story?.source ?? "").trim().toUpperCase();
}

function sanitizeStoryImage(value) {
  return sanitizeHttpUrl(value, "");
}

function firstVisibleLinkFromText(value) {
  const text = String(value ?? "");
  const match = text.match(/https?:\/\/[^\s<>"'`\\)\]]+|www\.[^\s<>"'`\\)\]]+|(?:t\.me|telegram\.me)\/[^\s<>"'`\\)\]]+/i);
  if (!match) {
    return "";
  }
  const url = match[0].startsWith("www.") ? `https://${match[0]}` : match[0];
  return sanitizeStoryUrl(url);
}

function firstVisibleLinkFromSummary(summary) {
  const items = Array.isArray(summary) ? summary : typeof summary === "string" ? [summary] : [];
  for (const item of items) {
    const link = firstVisibleLinkFromText(item);
    if (link !== "#") {
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

function isBotOperationalMessage(story) {
  const text = normalizeOperationalText([localizeStoryValue(story?.title), ...localizeStoryArray(story?.summary)].join(" "));
  return (
    text.includes("manba matni taqdim etilmagan") ||
    text.includes("post yozib bo'lmadi") ||
    text.includes("maqolaning to'liq matnini yuboring") ||
    text.includes("source text was not provided") ||
    text.includes("could not write the post")
  );
}

function isPublishableSignal(story) {
  const title = localizeStoryValue(story?.title);
  const summary = localizeStoryArray(story?.summary);
  return Boolean(title && summary.length && !isBotOperationalMessage(story));
}

function normalizeLiveSignalSummary(summary) {
  if (!Array.isArray(summary)) {
    return [];
  }

  return summary
    .filter((entry) => typeof entry === "string")
    .map((entry) => stripVisibleLinks(entry))
    .filter((entry) => !isLinkOnlyLabel(entry))
    .filter(Boolean);
}

function hasLocalizedSignalContent(signal, localeKey = locale) {
  const suffix = localeKey === "tr" ? "_tr" : "";
  const title = String(signal?.[`title${suffix}`] ?? "").trim();
  const summary = normalizeLiveSignalSummary(signal?.[`summary${suffix}`]);
  return Boolean(title && summary.length);
}

function normalizeLiveRichSummary(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 6).map((paragraph) => {
    const segments = Array.isArray(paragraph?.segments)
      ? paragraph.segments
          .slice(0, 64)
          .map((segment) => {
            const text = typeof segment?.text === "string" ? segment.text.slice(0, 5000) : "";
            if (!text) {
              return null;
            }
            const url = sanitizeStoryUrl(segment.url);
            return url === "#" ? { text } : { text, url };
          })
          .filter(Boolean)
      : [];
    return segments.length && segments.map((segment) => segment.text).join("").trim()
      ? { segments }
      : null;
  }).filter(Boolean);
}

function isAiDigestTitle(value) {
  const title = String(value ?? "")
    .normalize("NFKD")
    .replace(/\u0307/g, "");
  return /\bAI[\s-]+Digest\b/i.test(title);
}

function normalizeLiveSignal(signal, index) {
  const id = signal.id ?? signal.external_id ?? `live-${index}`;
  const createdAt = typeof signal.created_at === "string" ? signal.created_at : "";
  const title = normalizeLocalizedText({
    uz: signal.title,
    en: signal.title_en,
    tr: signal.title_tr,
  });
  const summary = normalizeLocalizedArray({
    uz: signal.summary,
    en: signal.summary_en,
    tr: signal.summary_tr,
  }, normalizeLiveSignalSummary);
  const isDigest = withDigestClassification({ title }).isDigest;
  const richSummary = isDigest
    ? normalizeLocalizedArray({
        uz: signal.rich_summary,
        en: signal.rich_summary_en,
        tr: signal.rich_summary_tr,
      }, normalizeLiveRichSummary)
    : normalizeLocalizedArray([], normalizeLiveRichSummary);
  const sourceUrl = signal.url || firstVisibleLinkFromSummary(signal.summary);

  return {
    id: `live-${id}`,
    title,
    source: String(signal.source || "").trim(),
    createdAt,
    dayKey: getLocalDayKey(createdAt),
    time: formatSignalTime(createdAt),
    score: Number.isFinite(signal.score) ? signal.score : 94,
    url: sanitizeStoryUrl(sourceUrl),
    image: sanitizeStoryImage(signal.image),
    category: String(signal.category || "general").trim(),
    summary,
    richSummary,
    isDigest,
  };
}

function getLocalDayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayKeyToLocalDate(dayKey) {
  const [year, month, day] = String(dayKey || "").split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDayDistance(fromDayKey, toDayKey) {
  const fromDate = dayKeyToLocalDate(fromDayKey);
  const toDate = dayKeyToLocalDate(toDayKey);
  if (!fromDate || !toDate) {
    return 0;
  }
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((fromDate - toDate) / dayMs));
}

function partitionStoriesByToday(stories, now = new Date()) {
  const todayKey = getLocalDayKey(now);
  if (!todayKey) {
    return { todayStories: stories, earlierStoryGroups: [] };
  }

  const groups = stories.reduce(
    (groups, story) => {
      if (!story.dayKey || story.dayKey === todayKey) {
        groups.todayStories.push(story);
      } else {
        const dayStories = groups.earlierStoriesByDay.get(story.dayKey) || [];
        dayStories.push(story);
        groups.earlierStoriesByDay.set(story.dayKey, dayStories);
      }
      return groups;
    },
    { todayStories: [], earlierStoriesByDay: new Map() },
  );

  return {
    todayStories: groups.todayStories,
    earlierStoryGroups: Array.from(groups.earlierStoriesByDay.values()),
  };
}

function formatTimelineDayLabel(dayKey, todayKey = liveTimelineTodayKey) {
  const distance = getDayDistance(todayKey, dayKey);
  if (distance <= 0) {
    return { uz: "Bugun", en: "Today", tr: "Bugün" }[locale];
  }
  if (distance === 1) {
    return { uz: "Kecha", en: "Yesterday", tr: "Dün" }[locale];
  }
  return {
    uz: `${distance} kun oldin`,
    en: `${distance} days ago`,
    tr: `${distance} gün önce`,
  }[locale];
}

function formatSignalTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat({ uz: "uz-UZ", en: "en-US", tr: "tr-TR" }[locale], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatSignalCount(count) {
  if (locale === "en") {
    return `${count} ${count === 1 ? "signal" : "signals"}`;
  }
  return locale === "tr" ? `${count} sinyal` : `${count} signal`;
}

function findLatestStory(stories) {
  return stories.reduce((latest, story) => {
    const storyDate = new Date(story?.createdAt || "");
    if (Number.isNaN(storyDate.getTime())) {
      return latest;
    }
    if (!latest) {
      return story;
    }
    const latestDate = new Date(latest.createdAt || "");
    return Number.isNaN(latestDate.getTime()) || storyDate > latestDate ? story : latest;
  }, null);
}

function updateSignalTopbarStatus(todayStories, allStories = todayStories) {
  if (signalStatusCount) {
    signalStatusCount.textContent = formatSignalCount(todayStories.length);
  }

  const latestStory = findLatestStory(todayStories.length ? todayStories : allStories);
  if (signalStatusTime && latestStory?.createdAt) {
    signalStatusTime.textContent = formatSignalTime(latestStory.createdAt);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\"", "&quot;");
}

function getStoryImageUrl(story) {
  return sanitizeStoryImage(story?.image);
}

function escapeCssUrl(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
}

function createBackgroundImageValue(imageUrl) {
  const safeImageUrl = sanitizeStoryImage(imageUrl);
  return safeImageUrl ? `url("${escapeCssUrl(safeImageUrl)}")` : "";
}

function localizeStoryValue(value) {
  if (typeof value === "string") {
    return value;
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const candidates = [value[locale], value.uz, value.en, value.tr];
  return candidates.find((entry) => typeof entry === "string" && entry.trim()) || "";
}

function buildExpandedSummary(story) {
  const title = localizeStoryValue(story.title);
  const sourceFallback = { uz: "asl manba", en: "the original source", tr: "orijinal kaynak" }[locale];
  const timeFallback = { uz: "bugun", en: "today", tr: "bugün" }[locale];
  const source = getStorySourceLabel(story) || sourceFallback;
  const time = story.time ?? timeFallback;
  const category = story.category ?? "signal";
  const summary = [...localizeStoryArray(story.summary)];
  const currentLength = summary.join(" ").length;

  if (currentLength >= 650) {
    return summary;
  }

  if (locale === "en") {
    summary.push(
      `The signal matters because "${title}" is not just a single headline; it points to a broader shift in how ${category} decisions are being made, funded, and explained in public. The timing from ${time} gives the story a current edge, while ${source} provides the first frame for judging what changed and what remains uncertain.`,
      `For readers, the practical takeaway is to watch the second-order effects: which teams, markets, users, or regulators respond next. A useful signal is not only what happened, but what it makes easier to predict. This card keeps the focus on that context so the line stays readable without turning into a full news feed.`,
    );
    return summary;
  }

  if (locale === "tr") {
    summary.push(
      `Bu sinyal önemli, çünkü "${title}" yalnızca tek bir başlık değil; bu alandaki kararların nasıl alındığı, finanse edildiği ve kamuya nasıl anlatıldığı konusunda daha geniş bir değişime işaret ediyor. ${time} zamanlaması hikayeyi güncel tutarken ${source}, neyin değiştiğini ve neyin belirsiz kaldığını değerlendirmek için ilk çerçeveyi sunuyor.`,
      "Okurlar için pratik sonuç, ikinci dereceden etkileri izlemektir: hangi ekiplerin, pazarların, kullanıcıların veya düzenleyicilerin sırada tepki vereceği. Yararlı bir sinyal sadece ne olduğunu değil, bundan sonra neyin izlenmesi gerektiğini de gösterir.",
    );
    return summary;
  }

  summary.push(
    `Bu signal muhim, chunki "${title}" faqat bitta sarlavha emas; u shu yo'nalishda qarorlar qanday qabul qilinayotgani, qanday moliyalashtirilayotgani va ommaga qanday tushuntirilayotganini ko'rsatadi. ${time} vaqti voqeani bugungi kun ritmiga bog'laydi, ${source} esa nima o'zgargani va nimasi hali ochiq qolayotganini baholash uchun birinchi kontekstni beradi.`,
    `O'quvchi uchun asosiy nuqta keyingi ta'sirlarni kuzatish: qaysi jamoalar, bozorlar, foydalanuvchilar yoki regulyatorlar bunga javob beradi. Foydali signal faqat nima bo'lganini aytmaydi; u keyin nimaga qarash kerakligini ham aniqlaydi. Shu sababli karta mavzuni uzun feedga aylantirmasdan, tushunarli kontekst bilan ushlab turadi.`,
  );
  return summary;
}

function renderRichSummaryParagraph(paragraph) {
  const segments = Array.isArray(paragraph?.segments) ? paragraph.segments : [];
  const markup = segments
    .map((segment) => {
      const text = escapeHtml(segment?.text ?? "");
      const href = sanitizeStoryUrl(segment?.url);
      return href === "#"
        ? text
        : `<a class="timeline-panel__inline-link" href="${escapeAttribute(href)}" target="_blank" rel="noreferrer noopener">${text}</a>`;
    })
    .join("");
  return markup ? `<p>${markup}</p>` : "";
}

function actionIcon(name) {
  const icons = {
    heart: '<svg data-icon="heart" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path data-icon-fill fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path></svg>',
    bookmark: '<svg data-icon="bookmark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path data-icon-fill fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z"></path></svg>',
    share: '<svg data-icon="share" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="18" cy="5" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"></circle><circle cx="6" cy="12" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"></circle><circle cx="18" cy="19" r="2.5" fill="none" stroke="currentColor" stroke-width="1.8"></circle><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"></path></svg>',
  };
  return icons[name] || "";
}

async function shareStory(story, navigatorApi = globalThis.navigator) {
  const url = sanitizeStoryUrl(story?.url);
  if (url === "#") {
    return "failed";
  }
  const title = String(localizeStoryValue(story?.title) || "").trim();
  try {
    if (typeof navigatorApi?.share === "function") {
      await navigatorApi.share({ title, url });
      return "shared";
    }
    if (typeof navigatorApi?.clipboard?.writeText === "function") {
      await navigatorApi.clipboard.writeText(url);
      return "copied";
    }
  } catch {
    return "failed";
  }
  return "failed";
}

function captureDetailDefaults() {
  return detailContent
    ? {
        html: detailContent.innerHTML,
        visual: detailVisual?.style.backgroundImage ?? "",
      }
    : null;
}

function getTimelineAnchor() {
  if (window.matchMedia("(max-width: 560px)").matches) {
    return window.innerHeight * 0.34;
  }

  if (window.matchMedia("(max-width: 820px)").matches) {
    return window.innerHeight * 0.42;
  }

  return window.innerHeight * 0.52;
}

function formatTimelineNumber(value) {
  return String(Math.round(Number(value) * 1000) / 1000);
}

function createTimelinePath(points, curve = 0.42) {
  const routePoints = Array.isArray(points)
    ? points.filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
    : [];
  if (!routePoints.length) {
    return "";
  }

  const commands = [`M ${formatTimelineNumber(routePoints[0].x)} ${formatTimelineNumber(routePoints[0].y)}`];
  for (let index = 1; index < routePoints.length; index += 1) {
    const previous = routePoints[index - 1];
    const current = routePoints[index];
    const distance = Math.max(0, current.y - previous.y);
    commands.push(
      `C ${formatTimelineNumber(previous.x)} ${formatTimelineNumber(previous.y + distance * curve)}`
      + ` ${formatTimelineNumber(current.x)} ${formatTimelineNumber(current.y - distance * curve)}`
      + ` ${formatTimelineNumber(current.x)} ${formatTimelineNumber(current.y)}`,
    );
  }
  return commands.join(" ");
}

function findTimelinePointForY(samples, targetY) {
  if (!Array.isArray(samples) || !samples.length) {
    return null;
  }
  if (targetY <= samples[0].y) {
    return { ...samples[0] };
  }
  const last = samples[samples.length - 1];
  if (targetY >= last.y) {
    return { ...last };
  }

  let low = 0;
  let high = samples.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].y <= targetY) {
      low = middle;
    } else {
      high = middle;
    }
  }

  const before = samples[low];
  const after = samples[high];
  const progress = (targetY - before.y) / Math.max(1, after.y - before.y);
  return {
    x: before.x + (after.x - before.x) * progress,
    y: targetY,
    length: before.length + (after.length - before.length) * progress,
  };
}

function findActiveTimelineIndex(activationPoints, cursorY) {
  let low = 0;
  let high = Array.isArray(activationPoints) ? activationPoints.length : 0;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (activationPoints[middle] <= cursorY) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  return low - 1;
}

function clampTimelineProgress(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function smoothTimelineProgress(value) {
  const progress = clampTimelineProgress(value);
  return progress * progress * (3 - 2 * progress);
}

function getTimelineSceneProgress(scrollY, sceneTop, scrollDuration) {
  const duration = Math.max(1, Number(scrollDuration) || 1);
  return clampTimelineProgress(((Number(scrollY) || 0) - (Number(sceneTop) || 0)) / duration);
}

function getTimelinePanY(routeY, stageHeight, visualHeight) {
  const viewportHeight = Math.max(1, Number(stageHeight) || 1);
  const contentHeight = Math.max(viewportHeight, Number(visualHeight) || viewportHeight);
  const anchorY = viewportHeight * 0.42;
  const minimumPan = Math.min(0, viewportHeight - contentHeight);
  return Math.max(minimumPan, Math.min(0, anchorY - (Number(routeY) || 0)));
}

const TIMELINE_CARD_SPREAD_END = 0.65;
const TIMELINE_CARD_EXIT_START = 0.82;
const TIMELINE_TRAVEL_WEIGHT = 2.4;

function createTimelineScrollMap(startY, cardRanges) {
  let cursorY = Number.isFinite(Number(startY)) ? Number(startY) : 0;
  let offset = 0;
  const segments = [];
  const activationOffsets = [];

  (Array.isArray(cardRanges) ? cardRanges : []).forEach((range, cardIndex) => {
    const entryY = Number(range?.entryY);
    const exitY = Number(range?.exitY);
    if (![entryY, exitY].every(Number.isFinite) || exitY <= entryY) {
      return;
    }

    const travelSpan = Math.max(0, entryY - cursorY) * TIMELINE_TRAVEL_WEIGHT;
    if (travelSpan > 0) {
      segments.push({
        type: "travel",
        start: offset,
        end: offset + travelSpan,
        fromY: cursorY,
        toY: entryY,
      });
      offset += travelSpan;
    }

    const cardHeight = exitY - entryY;
    const cardSpan = Math.min(420, Math.max(320, cardHeight * 4));
    const cardStart = offset;
    const cardEnd = cardStart + cardSpan;
    segments.push({
      type: "card",
      start: cardStart,
      end: cardEnd,
      fromY: entryY,
      toY: exitY,
      cardIndex,
    });
    activationOffsets.push(cardStart + cardSpan * TIMELINE_CARD_SPREAD_END);
    offset = cardEnd;
    cursorY = exitY;
  });

  return {
    segments,
    total: Math.max(1, offset),
    activationOffsets,
  };
}

function getTimelineScrollState(scrollMap, virtualOffset) {
  const segments = Array.isArray(scrollMap?.segments) ? scrollMap.segments : [];
  if (!segments.length) {
    return { routeY: 0, cardIndex: -1, cardProgress: 0 };
  }

  const total = Math.max(1, Number(scrollMap?.total) || 1);
  const offset = Math.max(0, Math.min(total, Number(virtualOffset) || 0));
  const segment = segments.find((candidate, index) => (
    offset < candidate.end || index === segments.length - 1
  ));
  const span = Math.max(1, segment.end - segment.start);
  const progress = clampTimelineProgress((offset - segment.start) / span);
  const routeY = segment.fromY + (segment.toY - segment.fromY) * progress;

  return {
    routeY,
    cardIndex: segment.type === "card" ? segment.cardIndex : -1,
    cardProgress: segment.type === "card" ? progress : 0,
  };
}

function getTimelineCardRoutePoint(buttonRect, rootRect, compactRoute = false, side = "right") {
  const values = [
    buttonRect?.left,
    buttonRect?.right,
    buttonRect?.top,
    buttonRect?.bottom,
    rootRect?.left,
    rootRect?.top,
    rootRect?.width,
  ];
  if (!values.every(Number.isFinite)) {
    return null;
  }

  const routeGap = 28;
  const rawX = compactRoute
    ? buttonRect.left - rootRect.left - 12
    : side === "left"
      ? buttonRect.right - rootRect.left + routeGap
      : buttonRect.left - rootRect.left - routeGap;
  const x = Math.max(12, Math.min(rootRect.width - 12, rawX));
  return { x, y: (buttonRect.top + buttonRect.bottom) / 2 - rootRect.top };
}

function getTimelineRouteYForScroll(scrollY, anchorY, rootDocumentTop, startY, endY) {
  const minimum = Math.min(Number(startY) || 0, Number(endY) || 0);
  const maximum = Math.max(Number(startY) || 0, Number(endY) || 0);
  const viewportY = (Number(scrollY) || 0) + (Number(anchorY) || 0) - (Number(rootDocumentTop) || 0);
  return Math.max(minimum, Math.min(maximum, viewportY));
}

function getTimelineCardActivationY(range) {
  const entryY = Number(range?.entryY);
  const exitY = Number(range?.exitY);
  if (![entryY, exitY].every(Number.isFinite) || exitY <= entryY) {
    return null;
  }

  return entryY + (exitY - entryY) * TIMELINE_CARD_SPREAD_END;
}

function getTimelineCardMorph(range, routeY) {
  const entryY = Number(range?.entryY);
  const exitY = Number(range?.exitY);
  const currentY = Number(routeY);
  if (![entryY, exitY, currentY].every(Number.isFinite) || exitY <= entryY) {
    return {
      enter: 0,
      exit: 0,
      presence: 0,
      headOpacity: 0,
      tailOpacity: 0,
      cursorMerge: 0,
    };
  }

  const phase = clampTimelineProgress((currentY - entryY) / (exitY - entryY));
  const enter = Number(clampTimelineProgress(phase / TIMELINE_CARD_SPREAD_END).toFixed(6));
  const exit = Number(clampTimelineProgress(
    (phase - TIMELINE_CARD_EXIT_START) / (1 - TIMELINE_CARD_EXIT_START),
  ).toFixed(6));
  const enterEase = smoothTimelineProgress(enter);
  const exitEase = smoothTimelineProgress(exit);
  const tailMix = smoothTimelineProgress((phase - 0.7) / 0.12);
  const presence = enterEase * (1 - exitEase);
  const mergeIn = smoothTimelineProgress(phase / 0.14);
  const cursorExit = smoothTimelineProgress((phase - 0.93) / 0.07);

  return {
    enter,
    exit,
    presence,
    headOpacity: enterEase * (1 - tailMix),
    tailOpacity: tailMix * (1 - exitEase),
    cursorMerge: mergeIn * (1 - cursorExit),
  };
}

function getStoryActivationRect(item) {
  const button = item?.querySelector(".signal-timeline__headline-button") ?? item;
  return button?.getBoundingClientRect?.() ?? item?.getBoundingClientRect?.() ?? null;
}

function scrollStoryIntoView(item, behavior = "smooth") {
  const itemIndex = timelineLayout.items.indexOf(item);
  const activationScrollY = timelineLayout.activationScrollYs[itemIndex];
  const rect = getStoryActivationRect(item);
  if (!Number.isFinite(activationScrollY) && !rect) {
    return;
  }

  const target = Number.isFinite(activationScrollY)
    ? activationScrollY + 3
    : window.scrollY + rect.top + rect.height / 2 - getTimelineAnchor();
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  window.scrollTo({ top: Math.max(0, target), behavior: reduceMotion ? "auto" : behavior });
}

function sampleTimelineRoute(routePoints) {
  if (!routePoints.length) {
    return [];
  }
  const samples = [{ ...routePoints[0], length: 0 }];
  let length = 0;
  for (let index = 1; index < routePoints.length; index += 1) {
    const previous = routePoints[index - 1];
    const current = routePoints[index];
    const distanceY = Math.max(1, current.y - previous.y);
    const controls = {
      first: { x: previous.x, y: previous.y + distanceY * 0.42 },
      second: { x: current.x, y: current.y - distanceY * 0.42 },
    };
    const stepCount = Math.max(2, Math.ceil(distanceY / 5));
    for (let step = 1; step <= stepCount; step += 1) {
      const progress = step / stepCount;
      const inverse = 1 - progress;
      const point = {
        x: inverse ** 3 * previous.x
          + 3 * inverse ** 2 * progress * controls.first.x
          + 3 * inverse * progress ** 2 * controls.second.x
          + progress ** 3 * current.x,
        y: inverse ** 3 * previous.y
          + 3 * inverse ** 2 * progress * controls.first.y
          + 3 * inverse * progress ** 2 * controls.second.y
          + progress ** 3 * current.y,
      };
      const last = samples[samples.length - 1];
      length += Math.hypot(point.x - last.x, point.y - last.y);
      samples.push({ ...point, length });
    }
  }
  return samples;
}

function measureTimelineLayout() {
  timelineLayoutFrame = 0;
  if (!timelineRoot || !timelineRouteSvg || !timelineRoutePath || !timelineCursor) {
    return;
  }

  timelineStage?.style?.setProperty?.("--timeline-pan-y", "0px");
  const geometryRoot = timelineStage ?? timelineRoot;
  const rootRect = geometryRoot.getBoundingClientRect();
  const rootWidth = Math.max(1, rootRect.width);
  const rootHeight = Math.max(1, timelineRoot.scrollHeight || rootRect.height);
  const compactRoute = window.matchMedia?.("(max-width: 959px)")?.matches === true;
  const startRect = timelineStartAxis?.getBoundingClientRect?.();
  const start = {
    x: compactRoute ? 20 : (startRect ? startRect.left + startRect.width / 2 - rootRect.left : rootWidth / 2),
    y: startRect ? startRect.top + startRect.height / 2 - rootRect.top : 0,
  };
  const routePoints = [start];
  const visibleItems = [];
  const activationYs = [];

  timelineItems.forEach((item) => {
    if (item.hidden) {
      return;
    }
    const visibleIndex = visibleItems.length;
    item.dataset.side = visibleIndex % 2 === 0 ? "left" : "right";
    const buttonRect = getStoryActivationRect(item);
    const routePoint = buttonRect
      ? getTimelineCardRoutePoint(buttonRect, rootRect, compactRoute, item.dataset.side)
      : null;
    if (!routePoint) {
      return;
    }
    visibleItems.push(item);
    const previousY = routePoints[routePoints.length - 1].y;
    const y = Math.max(previousY + 40, routePoint.y);
    routePoints.push({ x: routePoint.x, y });
    activationYs.push(y);
  });

  const pathData = createTimelinePath(routePoints);
  timelineRouteSvg.setAttribute("viewBox", `0 0 ${formatTimelineNumber(rootWidth)} ${formatTimelineNumber(rootHeight)}`);
  timelineRouteSvg.setAttribute("preserveAspectRatio", "none");
  timelineRoutePath.setAttribute("d", pathData);
  timelineRoot.style?.removeProperty?.("--timeline-scene-height");
  timelineStage?.style?.setProperty?.("--timeline-visual-height", `${formatTimelineNumber(rootHeight)}px`);
  const sceneRect = timelineRoot.getBoundingClientRect();
  const rootDocumentTop = sceneRect.top + (window.scrollY || 0);
  const activationScrollYs = activationYs.map((activationY) => (
    rootDocumentTop + activationY - getTimelineAnchor()
  ));
  timelineLayout = {
    rootDocumentTop,
    start,
    samples: sampleTimelineRoute(routePoints),
    activationYs,
    activationScrollYs,
    cardEntryYs: activationYs,
    cardRanges: [],
    scrollMap: null,
    items: visibleItems,
    scrollRange: Math.max(1, rootHeight - start.y),
    stageHeight: Math.max(1, window.innerHeight || 1),
    visualHeight: rootHeight,
  };
  syncActiveStory();
}

function scheduleTimelineLayout() {
  if (timelineLayoutFrame || !timelineRoot) {
    return;
  }
  timelineLayoutFrame = window.requestAnimationFrame(measureTimelineLayout);
}

function setTimelineCssVariable(item, name, value) {
  item?.style?.setProperty?.(name, String(value));
}

function resetTimelineMorph(index) {
  const item = timelineLayout.items[index];
  if (!item) {
    return;
  }
  setTimelineCssVariable(item, "--card-activation", 0);
  setTimelineCssVariable(item, "--shadow-head-scale-x", 0.08);
  setTimelineCssVariable(item, "--shadow-head-scale-y", 0.22);
  setTimelineCssVariable(item, "--shadow-head-opacity", 0);
  setTimelineCssVariable(item, "--shadow-tail-scale-x", 1);
  setTimelineCssVariable(item, "--shadow-tail-scale-y", 1);
  setTimelineCssVariable(item, "--shadow-tail-opacity", 0);
  setTimelineCssVariable(item, "--shadow-tail-offset", "0px");
}

function updateTimelineMorphState(scrollState) {
  const currentIndex = Number.isInteger(scrollState?.cardIndex) ? scrollState.cardIndex : -1;
  const nextIndexes = new Set(currentIndex >= 0 ? [currentIndex] : []);

  timelineMorphIndexes.forEach((index) => {
    if (!nextIndexes.has(index)) {
      resetTimelineMorph(index);
    }
  });

  let cursorMerge = 0;
  nextIndexes.forEach((index) => {
    const item = timelineLayout.items[index];
    const range = timelineLayout.cardRanges[index];
    const routeY = range.entryY + (range.exitY - range.entryY) * scrollState.cardProgress;
    const morph = getTimelineCardMorph(range, routeY);
    setTimelineCssVariable(item, "--card-activation", formatTimelineNumber(morph.presence));
    setTimelineCssVariable(item, "--shadow-head-scale-x", formatTimelineNumber(0.08 + 0.92 * morph.enter));
    setTimelineCssVariable(item, "--shadow-head-scale-y", formatTimelineNumber(0.22 + 0.78 * morph.enter));
    setTimelineCssVariable(item, "--shadow-head-opacity", formatTimelineNumber(morph.headOpacity));
    setTimelineCssVariable(item, "--shadow-tail-scale-x", formatTimelineNumber(0.08 + 0.92 * (1 - morph.exit)));
    setTimelineCssVariable(item, "--shadow-tail-scale-y", formatTimelineNumber(0.22 + 0.78 * (1 - morph.exit)));
    setTimelineCssVariable(item, "--shadow-tail-opacity", formatTimelineNumber(morph.tailOpacity));
    setTimelineCssVariable(item, "--shadow-tail-offset", `${formatTimelineNumber(12 * morph.exit)}px`);
    cursorMerge = Math.max(cursorMerge, morph.cursorMerge);
  });

  timelineMorphIndexes = nextIndexes;
  return cursorMerge;
}

function resetDetailScroll() {
  if (detailContent) {
    detailContent.scrollTop = 0;
  }

  if (detailPanel) {
    detailPanel.scrollTop = 0;
  }
}

function renderStoryMarkup(story) {
  const labels = detailLabels[locale];
  const storyTitle = localizeStoryValue(story.title);
  const isDigest = story?.isDigest === true;
  const panelTitle = isDigest ? getTimelineStoryTitle(story) : storyTitle;
  const title = escapeHtml(panelTitle);
  const source = escapeHtml(getStorySourceLabel(story));
  const time = escapeHtml(story.time ?? "");
  const weight = `${escapeHtml(String(story.score ?? 94))}/100`;
  const summary = buildExpandedSummary(story);
  const richSummary = isDigest ? normalizeLiveRichSummary(localizeStoryArray(story.richSummary)) : [];
  const paragraphCount = Math.max(summary.length, richSummary.length);
  const summaryHtml = Array.from({ length: paragraphCount }, (_, index) =>
    richSummary[index]
      ? renderRichSummaryParagraph(richSummary[index])
      : `<p>${escapeHtml(summary[index] ?? "")}</p>`,
  )
    .filter(Boolean)
    .join("");
  const sourceHref = sanitizeStoryUrl(story.url);
  const sourceTarget = sourceHref === "#" ? "" : ' target="_blank" rel="noreferrer"';
  const libraryEntry = readLibraryState().items[String(story.id)] || { liked: false, saved: false };
  const actionButton = (label, action, icon, className) => {
    const pressed = action === "like" ? libraryEntry.liked : action === "save" ? libraryEntry.saved : false;
    const activeClass = pressed ? " is-active" : "";
    const pressedAttribute = action === "share" ? "" : ` aria-pressed="${pressed}"`;
    return `<button class="${className}${activeClass}" type="button" data-story-action="${action}" aria-label="${escapeHtml(label)}"${pressedAttribute}>${actionIcon(icon)}</button>`;
  };

  return `
    <div class="timeline-panel__hero-top">
      <span>${escapeHtml(labels.active)}</span>
      <button class="timeline-panel__close" type="button" data-signal-detail-close aria-label="${escapeHtml(labels.close)}">×</button>
    </div>
    <div class="timeline-panel__hero">
      <h2>${title}</h2>
    </div>
    <div class="timeline-panel__meta-grid">
      <div>
        <span>${escapeHtml(labels.source)}</span>
        <strong>${source}</strong>
      </div>
      <div>
        <span>${escapeHtml(labels.time)}</span>
        <strong>${time}</strong>
      </div>
      <div>
        <span>${escapeHtml(labels.weight)}</span>
        <strong>${escapeHtml(weight)}</strong>
      </div>
    </div>
    <div class="timeline-panel__body">
      ${summaryHtml}
    </div>
    <div class="timeline-panel__actions">
      <a class="timeline-panel__source" href="${escapeAttribute(sourceHref)}"${sourceTarget}>
        ${escapeHtml(labels.originalSource)}
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false">
          <path fill="none" stroke="currentColor" stroke-width="2" d="M14 3h7v7"></path>
          <path fill="none" stroke="currentColor" stroke-width="2" d="M21 3 10 14"></path>
        </svg>
      </a>
      <div class="timeline-panel__action-buttons">
        ${actionButton(labels.like, "like", "heart", "timeline-panel__icon-button")}
        ${actionButton(labels.save, "save", "bookmark", "timeline-panel__icon-button")}
        ${actionButton(labels.share, "share", "share", "timeline-panel__icon-button")}
      </div>
    </div>
    <p class="timeline-panel__action-status" data-story-action-status role="status" aria-live="polite"></p>`;
}

function updateStoryActionControls(storyId) {
  if (!detailContent?.querySelectorAll) {
    return;
  }
  const entry = readLibraryState().items[String(storyId)] || { liked: false, saved: false };
  ["like", "save"].forEach((action) => {
    const pressed = action === "like" ? entry.liked : entry.saved;
    detailContent.querySelectorAll(`[data-story-action="${action}"]`).forEach((button) => {
      button.classList.toggle("is-active", pressed);
      button.setAttribute("aria-pressed", String(pressed));
    });
  });
}

function setStoryActionStatus(key) {
  const status = detailContent?.querySelector?.("[data-story-action-status]");
  if (status) {
    status.textContent = detailLabels[locale][key] || "";
  }
}

function resetDetailPanel(options = {}) {
  if (!detailContent || !detailDefaults) {
    return;
  }

  const { preserveTimelineIndex = false } = options;
  activeStoryId = null;
  if (!preserveTimelineIndex) {
    activeTimelineIndex = -1;
  }
  detailContent.innerHTML = detailDefaults.html;
  if (detailVisual) {
    detailVisual.style.backgroundImage = detailDefaults.visual || "";
  }
  resetDetailScroll();
  detailPanel?.classList.remove("has-background-image");
  detailPanel?.classList.remove("has-story");
  detailPanel?.classList.add("signal-detail--intro");
  pageMain?.classList.remove("has-detail-open");
  updateTimelineActiveState(null);
}

function updateTimelineActiveState(activeItem) {
  pageMain?.classList.toggle("has-active-story", Boolean(activeItem));
  timelineItems.forEach((item) => {
    const button = item.querySelector(".signal-timeline__headline-button");
    const isActive = activeItem === item;
    item.classList.toggle("is-active", isActive);
    button?.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function getTimelineStoryTitle(story) {
  const title = String(localizeStoryValue(story?.title) ?? "").trim();
  if (story?.isDigest !== true) {
    return title;
  }

  const titleDate = title.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  const date = titleDate || story?.dayKey || getLocalDayKey(story?.createdAt);
  return date ? `AI Digest - ${date}` : "AI Digest";
}

function renderLiveTimelineItem(story, index) {
  const shift = ((index % 3) - 1) * 7;
  const timelineTitle = getTimelineStoryTitle(story);
  const side = index % 2 === 0 ? "left" : "right";
  return `
    <article class="signal-timeline__item" data-side="${side}" data-story-id="${escapeAttribute(story.id)}" data-timeline-index="${index}" style="--timeline-headline-size: 1.420rem; --timeline-headline-shift: ${shift}px; --timeline-importance: 0.94; --timeline-widget-width: 520px; --timeline-widget-pad-x: 19.4px; --timeline-widget-pad-y: 13.6px;">
      <button type="button" class="signal-timeline__headline-button">
        <span class="signal-timeline__headline-text">${escapeHtml(timelineTitle)}</span>
      </button>
    </article>`;
}

function renderTimelineDayMarker(label, dayKey = "") {
  return `
    <div class="signal-timeline__day-marker" data-live-day-marker="${escapeAttribute(dayKey)}" aria-hidden="true">
      <span class="signal-timeline__day-pill">${escapeHtml(label)}</span>
    </div>`;
}

function insertLiveTimelineStories(stories, startIndex = 0, options = {}) {
  if (!timelineItemsContainer || !stories.length) {
    return;
  }

  const dayMarker = timelineItemsContainer.querySelector(".signal-timeline__day-marker");
  const sentinel = timelineItemsContainer.querySelector(".signal-timeline__sentinel");
  const earlierGate = timelineItemsContainer.querySelector(".signal-timeline__earlier-gate");
  const markerHtml =
    options.dayLabel || options.dayKey ? renderTimelineDayMarker(options.dayLabel, options.dayKey) : "";
  const html = `${markerHtml}${stories.map((story, index) => renderLiveTimelineItem(story, startIndex + index)).join("")}`;

  if (sentinel) {
    sentinel.insertAdjacentHTML("beforebegin", html);
  } else if (earlierGate) {
    earlierGate.insertAdjacentHTML("beforebegin", html);
  } else if (dayMarker) {
    dayMarker.insertAdjacentHTML("afterend", html);
  } else {
    timelineItemsContainer.insertAdjacentHTML("afterbegin", html);
  }
}

function updateLoadEarlierButton(hasEarlierStories) {
  if (!loadEarlierButton) {
    return;
  }

  loadEarlierButton.hidden = !hasEarlierStories;
  loadEarlierButton.disabled = !hasEarlierStories;
  if (!hasEarlierStories) {
    loadEarlierButton.textContent = labelMap[locale].reveal;
  }
  loadEarlierButton.setAttribute("aria-disabled", hasEarlierStories ? "false" : "true");
  loadEarlierButton.setAttribute("tabindex", hasEarlierStories ? "0" : "-1");
}

function refreshTimelineStoryBindings() {
  storyMap = new Map(storyData.map((story) => [String(story.id), story]));
  timelineItems = Array.from(timelineItemsContainer.querySelectorAll(".signal-timeline__item"));
  bindTimelineItemEvents();
  initTimelineReveal();
  scheduleTimelineLayout();
}

function replaceTimelineStories(todayStories, olderStoryGroups = []) {
  if (!timelineItemsContainer || (!todayStories.length && !olderStoryGroups.length)) {
    return;
  }

  timelineItemsContainer.querySelectorAll(".signal-timeline__item").forEach((item) => item.remove());
  timelineItemsContainer.querySelectorAll("[data-live-day-marker]").forEach((item) => item.remove());
  insertLiveTimelineStories(todayStories);

  storyData = [...todayStories];
  earlierLiveStoryGroups = olderStoryGroups.map((group) => [...group]);
  refreshTimelineStoryBindings();
  updateLoadEarlierButton(earlierLiveStoryGroups.length > 0);
  if (!timelineRoot) {
    const firstItem = timelineItems[0];
    const firstStory = firstItem ? storyMap.get(String(firstItem.dataset.storyId)) : null;
    if (firstStory && firstItem) {
      applyStoryToDetail(firstStory, firstItem, { behavior: "auto" });
      return;
    }
  }
  resetDetailPanel();
  scheduleTimelineLayout();
}

function applyStoryToDetail(story, item, options = {}) {
  if (!detailContent || !detailPanel) {
    return;
  }

  const { scrollIntoView = false, behavior = "smooth" } = options;
  const storyId = String(story.id);
  const isNewStory = activeStoryId !== storyId;
  activeStoryId = storyId;
  if (detailVisual) {
    detailVisual.style.backgroundImage = "";
  }
  detailPanel.classList.remove("has-background-image");
  if (isNewStory || detailContent.innerHTML === detailDefaults?.html) {
    detailContent.innerHTML = renderStoryMarkup(story);
  }
  resetDetailScroll();
  detailPanel.classList.remove("signal-detail--intro");
  detailPanel.classList.add("has-story");
  pageMain?.classList.add("has-detail-open");
  updateTimelineActiveState(item);
  if (scrollIntoView) {
    scrollStoryIntoView(item, behavior);
  }
}

function syncActiveStory() {
  activeUpdateFrame = 0;
  if (!timelineCursor || !timelineLayout.samples.length || !timelineLayout.start) {
    return;
  }

  const scrollY = window.scrollY || 0;
  const lastSample = timelineLayout.samples[timelineLayout.samples.length - 1];
  const routeY = getTimelineRouteYForScroll(
    scrollY,
    getTimelineAnchor(),
    timelineLayout.rootDocumentTop,
    timelineLayout.start.y,
    lastSample.y,
  );
  const point = findTimelinePointForY(timelineLayout.samples, routeY) ?? timelineLayout.start;
  timelineStage?.style?.setProperty?.("--timeline-pan-y", "0px");
  const cursorSize = window.matchMedia?.("(max-width: 780px)")?.matches === true ? 18 : 22;
  timelineCursor.style.opacity = "1";
  timelineCursor.style.transform = `translate3d(${formatTimelineNumber(point.x - cursorSize / 2)}px, ${formatTimelineNumber(point.y - cursorSize / 2)}px, 0)`;

  const nextIndex = findActiveTimelineIndex(timelineLayout.activationYs, routeY);
  if (nextIndex === activeTimelineIndex) {
    return;
  }
  activeTimelineIndex = nextIndex;

  if (nextIndex < 0) {
    resetDetailPanel({ preserveTimelineIndex: true });
    return;
  }

  const activeItem = timelineLayout.items[nextIndex];
  const story = activeItem ? storyMap.get(String(activeItem.dataset.storyId)) : null;
  if (story && activeItem) {
    applyStoryToDetail(story, activeItem);
  }
}

function scheduleActiveStorySync() {
  if (activeUpdateFrame) {
    return;
  }

  activeUpdateFrame = window.requestAnimationFrame(syncActiveStory);
}

function pickPalette(value) {
  const current = document.documentElement.dataset.palette;
  let target = String(value);
  if (target === "2") {
    target = current === "2" ? "6" : "2";
  } else if (target === "0") {
    target = current === "0" ? "7" : "0";
  } else if (target === "4") {
    target = current === "4" ? "5" : "4";
  }
  setPalette(target);
}

function setPalette(palette) {
  const nextPalette = paletteOrder.includes(String(palette)) ? String(palette) : "2";
  const nextTheme = paletteThemeMap[nextPalette] || "light";
  document.documentElement.dataset.palette = nextPalette;
  document.documentElement.dataset.theme = nextTheme;
  if (document.body) {
    document.body.dataset.palette = nextPalette;
    document.body.dataset.theme = nextTheme;
  }
  const storage = safeStorage();
  if (storage) {
    storage.setItem(storageKeys.theme, nextPalette);
    storage.setItem(legacyStorageKeys.theme, nextPalette);
  }

  themeButtons.forEach((button) => {
    const label = button.querySelector("[data-palette-label]");
    const sample = button.querySelector(".palette-rail__sample, .palette-toggle__sample");
    if (label) {
      label.textContent = labelMap[locale].palette;
    }
    if (sample) {
      sample.style.setProperty("--swatch-bg", paletteSwatches[nextPalette].bg);
      sample.style.setProperty("--swatch-fg", paletteSwatches[nextPalette].fg);
    }
    button.title = `${labelMap[locale].palette}: ${themeLabels[nextPalette] || themeLabels["2"]}`;
  });

  themeOptions.forEach((option) => {
    const isActive = option.dataset.paletteOption === nextPalette || (option.dataset.paletteOption === "2" && nextPalette === "6") || (option.dataset.paletteOption === "0" && nextPalette === "7") || (option.dataset.paletteOption === "4" && nextPalette === "5");
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  });

  window.dispatchEvent(new CustomEvent("alomat:palettechange", { detail: { palette: nextPalette } }));
}

function initTheme() {
  const storage = safeStorage();
  const savedPalette =
    storage?.getItem(storageKeys.theme) ??
    storage?.getItem(legacyStorageKeys.theme) ??
    document.documentElement.dataset.palette;
  const palette = paletteOrder.includes(savedPalette) ? savedPalette : "2";
  if (storage && savedPalette && !storage.getItem(storageKeys.theme)) {
    storage.setItem(storageKeys.theme, palette);
  }
  setPalette(palette);

  const closeMenus = (exceptPicker = null) => {
    themePickers.forEach((picker) => {
      if (picker === exceptPicker) return;
      const menu = picker.querySelector("[data-palette-menu]");
      const button = picker.querySelector("[data-palette-toggle]");
      picker.classList.remove("is-open");
      menu?.setAttribute("aria-hidden", "true");
      button?.setAttribute("aria-expanded", "false");
    });
  };

  themePickers.forEach((picker) => {
    const button = picker.querySelector("[data-palette-toggle]");
    const menu = picker.querySelector("[data-palette-menu]");
    button?.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = picker.classList.contains("is-open");
      closeMenus(picker);
      if (isOpen) {
        picker.classList.remove("is-open");
        menu?.setAttribute("aria-hidden", "true");
        button.setAttribute("aria-expanded", "false");
      } else {
        picker.classList.add("is-open");
        menu?.setAttribute("aria-hidden", "false");
        button.setAttribute("aria-expanded", "true");
      }
    });
  });

  themeOptions.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      pickPalette(option.dataset.paletteOption);
      closeMenus();
    });
  });

  document.addEventListener(
    "click",
    (event) => {
      const option = event.target.closest?.("[data-palette-option]");
      if (!option) return;
      event.preventDefault();
      event.stopPropagation();
      pickPalette(option.dataset.paletteOption);
      closeMenus();
    },
    true,
  );

  document.addEventListener("click", () => closeMenus());
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenus();
    }
  });
}

function createSortMenuController({ root, button, label, menu, options, eventTarget = document }) {
  if (!root || !button || !label || !menu || !options?.length) {
    return null;
  }

  const setOpen = (isOpen) => {
    root.classList.toggle("is-open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    menu.hidden = !isOpen;
    menu.setAttribute?.("aria-hidden", String(!isOpen));
  };
  const close = () => setOpen(false);
  const select = (option) => {
    const value = option?.dataset?.signalSortOption;
    if (!value) return;
    const nextLabel = option.dataset.signalSortLabel || option.textContent.trim();
    button.dataset.signalSortValue = value;
    label.textContent = nextLabel;
    options.forEach((entry) => {
      const isSelected = entry === option;
      entry.classList.toggle("is-selected", isSelected);
      entry.setAttribute("aria-selected", String(isSelected));
    });
    close();
  };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(button.getAttribute("aria-expanded") !== "true");
  });
  options.forEach((option) => {
    option.addEventListener("click", (event) => {
      event.stopPropagation();
      select(option);
    });
  });
  eventTarget.addEventListener("click", (event) => {
    if (!root.contains(event.target)) {
      close();
    }
  });
  eventTarget.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      button.focus?.();
    }
  });

  close();
  return { close, select, setOpen };
}

function initSortMenu() {
  createSortMenuController({
    root: signalSortRoot,
    button: signalSortButton,
    label: signalSortLabel,
    menu: signalSortMenu,
    options: signalSortOptions,
  });
}

function updateNameDisplay(name) {
  if (!nameDisplay) return;
  const trimmed = name.trim();
  if (!trimmed) {
    nameDisplay.textContent = {
      uz: "Saqlash, yoqtirish va kutubxonangizni sinxronlash uchun bir ism qoldiring.",
      en: "Leave a name so saves, likes, and your library stay in sync.",
      tr: "Kayıtları, beğenileri ve kütüphanenizi eşitlemek için bir ad bırakın.",
    }[locale];
    return;
  }

  nameDisplay.textContent = labelMap[locale].hint(trimmed);
}

function normalizeAuthEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isLikelyEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeNamePart(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function isProfileStepActive() {
  return Boolean(nameProfileStep && !nameProfileStep.hidden);
}

function setNameAuthStep(step) {
  const isProfile = step === "profile";
  if (nameEmailStep) {
    nameEmailStep.hidden = isProfile;
  }
  if (nameProfileStep) {
    nameProfileStep.hidden = !isProfile;
  }
  if (nameSubmitLabel) {
    nameSubmitLabel.textContent = isProfile ? labelMap[locale].nameSubmit : labelMap[locale].requestSubmit;
  }
  if (isProfile) {
    nameFirstInput?.focus({ preventScroll: true });
  } else {
    nameInput?.focus({ preventScroll: true });
  }
}

function updateReaderIdentity(fullName) {
  const normalized = normalizeNamePart(fullName);
  if (!normalized) {
    return;
  }
  if (heroTitle) {
    heroTitle.textContent = labelMap[locale].heroGreeting(normalized);
  }
  if (heroBody) {
    heroBody.textContent = labelMap[locale].heroBody;
  }
  if (nameDisplay) {
    nameDisplay.textContent = labelMap[locale].hint(normalized);
  }
  if (readerGateAction) {
    readerGateAction.hidden = true;
    readerGateAction.setAttribute("aria-hidden", "true");
    readerGateAction.setAttribute("tabindex", "-1");
  }
}

async function saveReaderProfile(profile) {
  const response = await fetch(buildApiUrl("/api/readers"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(profile),
  });
  if (!response.ok) {
    throw new Error("reader profile save failed");
  }
  return response.json().catch(() => ({}));
}

function setNameAuthStatus(message, state = "info") {
  if (!nameAuthStatus) {
    return;
  }
  nameAuthStatus.hidden = !message;
  nameAuthStatus.textContent = message;
  nameAuthStatus.dataset.state = state;
}

function setNameAuthLoading(isLoading) {
  authRequestInFlight = isLoading;
  if (nameAuthSubmit) {
    nameAuthSubmit.disabled = isLoading;
  }
  if (nameInput) {
    nameInput.disabled = isLoading;
  }
  if (nameFirstInput) {
    nameFirstInput.disabled = isLoading;
  }
  if (nameLastInput) {
    nameLastInput.disabled = isLoading;
  }
  if (nameCodeInput) {
    nameCodeInput.disabled = isLoading;
  }
}

function resetNameAuthCodeStep() {
  if (nameCodeInput) {
    nameCodeInput.value = "";
    nameCodeInput.hidden = true;
  }
  if (nameCodeField) {
    nameCodeField.hidden = true;
  }
  if (nameSubmitLabel) {
    nameSubmitLabel.textContent = isProfileStepActive() ? labelMap[locale].nameSubmit : labelMap[locale].requestSubmit;
  }
  setNameAuthStatus("");
}

function initNameForm() {
  const storage = safeStorage();
  const savedName = storage?.getItem(storageKeys.name) ?? storage?.getItem(legacyStorageKeys.name);
  const savedEmail = storage?.getItem(storageKeys.email);
  if (savedEmail && nameInput) {
    nameInput.value = savedEmail;
  }
  if (savedName && !savedName.includes("@")) {
    updateReaderIdentity(savedName);
    if (storage && !storage.getItem(storageKeys.name)) {
      storage.setItem(storageKeys.name, savedName);
      storage.removeItem(legacyStorageKeys.name);
    }
  } else if (savedName?.includes("@")) {
    storage?.setItem(storageKeys.email, savedName);
    storage?.removeItem(storageKeys.name);
    storage?.removeItem(legacyStorageKeys.name);
    if (nameInput) {
      nameInput.value = savedName;
    }
  }

  nameForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (authRequestInFlight) {
      return;
    }

    if (isProfileStepActive()) {
      const firstName = normalizeNamePart(nameFirstInput?.value);
      const lastName = normalizeNamePart(nameLastInput?.value);
      if (!firstName || !lastName) {
        setNameAuthStatus(labelMap[locale].invalidName, "error");
        return;
      }

      const fullName = `${firstName} ${lastName}`;
      const email = normalizeAuthEmail(storage?.getItem(storageKeys.email) || nameInput?.value);
      if (!isLikelyEmail(email)) {
        setNameAuthStep("email");
        setNameAuthStatus(labelMap[locale].invalidEmail, "error");
        return;
      }

      setNameAuthLoading(true);
      try {
        await saveReaderProfile({ email, first_name: firstName, last_name: lastName });
      } catch {
        setNameAuthLoading(false);
        setNameAuthStatus(labelMap[locale].saveFailed, "error");
        return;
      }

      storage?.setItem(storageKeys.name, fullName);
      storage?.removeItem(legacyStorageKeys.name);
      updateReaderIdentity(fullName);
      setNameAuthLoading(false);
      closeNameModal();
      return;
    }

    const email = normalizeAuthEmail(nameInput?.value);
    if (!isLikelyEmail(email)) {
      setNameAuthStatus(labelMap[locale].invalidEmail, "error");
      return;
    }

    setNameAuthLoading(true);
    try {
      await saveReaderProfile({ email });
    } catch {
      setNameAuthLoading(false);
      setNameAuthStatus(labelMap[locale].saveFailed, "error");
      return;
    }

    storage?.setItem(storageKeys.email, email);
    storage?.removeItem(legacyStorageKeys.name);
    if (nameInput) {
      nameInput.value = email;
    }
    setNameAuthStep("profile");
    resetNameAuthCodeStep();
    setNameAuthStatus(labelMap[locale].savedEmail, "success");
    setNameAuthLoading(false);
  });

  nameInput?.addEventListener("input", () => {
    resetNameAuthCodeStep();
  });
}

function openNameModal() {
  if (!nameModal || !nameInput) {
    return;
  }

  resetDetailPanel();
  nameModal.hidden = false;
  nameModal.classList.add("is-open");
  document.documentElement.classList.add("modal-open");
  readerGateAction?.setAttribute("aria-expanded", "true");
  if (!nameInput.value) {
    nameInput.value = safeStorage()?.getItem(storageKeys.email) ?? "";
  }
  setNameAuthStep(nameInput.value ? "profile" : "email");
}

function closeNameModal() {
  if (!nameModal) {
    return;
  }

  resetNameAuthCodeStep();
  nameModal.classList.remove("is-open");
  nameModal.hidden = true;
  document.documentElement.classList.remove("modal-open");
  readerGateAction?.setAttribute("aria-expanded", "false");
}

function initReaderGateAction() {
  if (nameModal && nameModal.parentElement !== document.body) {
    document.body.appendChild(nameModal);
  }

  readerGateAction?.addEventListener("click", () => {
    openNameModal();
  });

  libraryGateActions.forEach((action) => {
    action.addEventListener("click", (event) => {
      if (safeStorage()?.getItem(storageKeys.name)) {
        return;
      }
      event.preventDefault();
      openNameModal();
    });
  });

  nameModalClose?.addEventListener("click", () => {
    closeNameModal();
  });

  nameModal?.addEventListener("click", (event) => {
    if (event.target === nameModal) {
      closeNameModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nameModal && !nameModal.hidden) {
      closeNameModal();
    }
  });
}

function initLoadEarlier() {
  loadEarlierButton?.addEventListener("click", () => {
    if (earlierLiveStoryGroups.length) {
      const nextStories = earlierLiveStoryGroups.shift() || [];
      const dayKey = nextStories[0]?.dayKey || "";
      insertLiveTimelineStories(nextStories, storyData.length, {
        dayKey,
        dayLabel: formatTimelineDayLabel(dayKey),
      });
      storyData = [...storyData, ...nextStories];
      refreshTimelineStoryBindings();
      updateLoadEarlierButton(earlierLiveStoryGroups.length > 0);
    } else {
      const hiddenCards = document.querySelectorAll('[data-older="true"]');
      hiddenCards.forEach((card) => {
        card.hidden = false;
        card.classList.add("is-visible");
      });
    }
    if (!earlierLiveStoryGroups.length) {
      loadEarlierButton.disabled = true;
      loadEarlierButton.textContent = labelMap[locale].reveal;
      loadEarlierButton.setAttribute("aria-disabled", "true");
      loadEarlierButton.setAttribute("tabindex", "-1");
    }
    scheduleTimelineLayout();
  });
}

function initTimelineReveal() {
  if (!timelineItems.length) {
    return;
  }

  timelineRevealObserver?.disconnect();
  timelineRevealObserver = null;

  if (!("IntersectionObserver" in window)) {
    timelineItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  timelineRevealObserver = new IntersectionObserver(
    (entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.2,
    },
  );

  timelineItems.forEach((item) => timelineRevealObserver?.observe(item));
}

function bindTimelineItemEvents() {
  timelineItems.forEach((item) => {
    if (item.dataset.timelineBound === "true") {
      return;
    }
    item.dataset.timelineBound = "true";
    const openStory = () => {
      const story = storyMap.get(String(item.dataset.storyId));
      if (!story) {
        return;
      }
      if (timelineLayout.samples.length) {
        scrollStoryIntoView(item);
        return;
      }
      applyStoryToDetail(story, item, { scrollIntoView: true });
    };
    item.addEventListener("click", (event) => {
      if (event.target.closest(".signal-timeline__headline-button")) {
        return;
      }
      openStory();
    });
    const button = item.querySelector(".signal-timeline__headline-button");
    button?.addEventListener("click", openStory);
  });
}

function initTimelineRoute() {
  if (!timelineRoot || !timelineItemsContainer || !timelineCursor) {
    return;
  }

  if (typeof ResizeObserver !== "undefined") {
    timelineResizeObserver?.disconnect();
    timelineResizeObserver = new ResizeObserver(scheduleTimelineLayout);
    timelineResizeObserver.observe(timelineItemsContainer);
    if (timelineStartAxis) {
      timelineResizeObserver.observe(timelineStartAxis);
    }
  }

  document.fonts?.ready?.then(scheduleTimelineLayout).catch(() => {});
  scheduleTimelineLayout();
}

function initTimelineStories() {
  if (!detailPanel || !detailContent || !storyMap.size) {
    return;
  }

  detailPanel.addEventListener("click", async (event) => {
    const actionButton = event.target.closest?.("[data-story-action]");
    if (actionButton) {
      event.preventDefault();
      const story = storyMap.get(String(activeStoryId));
      if (!story) {
        return;
      }
      const action = actionButton.dataset.storyAction;
      if (action === "share") {
        const result = await shareStory(story);
        setStoryActionStatus(result === "shared" ? "shared" : result === "copied" ? "copied" : "shareFailed");
        return;
      }
      const entry = toggleLibraryAction(story, action);
      updateStoryActionControls(story.id);
      const active = action === "like" ? entry?.liked === true : entry?.saved === true;
      setStoryActionStatus(action === "like" ? (active ? "liked" : "unliked") : active ? "saved" : "unsaved");
      return;
    }

    const closeButton = event.target.closest("[data-signal-detail-close]");
    if (!closeButton) {
      return;
    }

    event.preventDefault();
    resetDetailPanel({ preserveTimelineIndex: true });
  });

  bindTimelineItemEvents();

  window.addEventListener(
    "scroll",
    scheduleActiveStorySync,
    { passive: true },
  );
  window.addEventListener("resize", scheduleTimelineLayout);
}

async function loadLiveSignals(now = new Date()) {
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
    const nextStories = signals
      .filter((signal) => hasLocalizedSignalContent(signal))
      .map(normalizeLiveSignal)
      .filter(isPublishableSignal);
    if (!nextStories.length) {
      return;
    }

    const { todayStories, earlierStoryGroups } = partitionStoriesByToday(nextStories, now);
    liveTimelineTodayKey = getLocalDayKey(now);
    updateSignalTopbarStatus(todayStories, nextStories);
    replaceTimelineStories(todayStories, earlierStoryGroups);
  } catch {
    // Keep the static fallback timeline.
  }
}

initTheme();
initSortMenu();
initReaderGateAction();
initNameForm();
initTimelineReveal();
initLoadEarlier();
initTimelineRoute();
initTimelineStories();
initLibrary();
loadLiveSignals();

globalThis.__ALOMAT_APP_TEST__ = {
  sanitizeStoryUrl,
  sanitizeStoryImage,
  getSiteLabelFromUrl,
  getLocalDayKey,
  partitionStoriesByToday,
  createBackgroundImageValue,
  isPublishableSignal,
  loadLiveSignals,
  normalizeLiveSignal,
  localizeStoryArray,
  readLibraryState,
  toggleLibraryAction,
  getLibraryEntries,
  getLibraryCounts,
  renderLibraryEntriesMarkup,
  renderLibraryFromStorage,
  renderLiveTimelineItem,
  createTimelinePath,
  findTimelinePointForY,
  findActiveTimelineIndex,
  getTimelineSceneProgress,
  getTimelineCardRoutePoint,
  getTimelineRouteYForScroll,
  createTimelineScrollMap,
  getTimelineScrollState,
  getTimelineCardActivationY,
  getTimelineCardMorph,
  renderStoryMarkup,
  shareStory,
  createSortMenuController,
};
