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

const locale = document.documentElement.lang === "en" ? "en" : "uz";
const themePickers = Array.from(document.querySelectorAll("[data-palette-picker]"));
const themeButtons = Array.from(document.querySelectorAll("[data-palette-toggle]"));
const themeOptions = Array.from(document.querySelectorAll("[data-palette-option]"));
const nameForm = document.querySelector("[data-name-form]");
const nameInput = document.querySelector("[data-name-input]");
const nameCodeField = document.querySelector("[data-name-code-field]");
const nameCodeInput = document.querySelector("[data-name-code-input]");
const nameAuthStatus = document.querySelector("[data-name-auth-status]");
const nameAuthSubmit = document.querySelector("[data-name-auth-submit]");
const nameSubmitLabel = document.querySelector("[data-name-submit-label]");
const nameDisplay = document.querySelector("[data-name-display]");
const readerGateAction = document.querySelector(".signal-reader-gate__action");
const nameModal = document.querySelector("[data-name-modal]");
const nameModalClose = document.querySelector("[data-name-modal-close]");
const libraryGateActions = Array.from(document.querySelectorAll("[data-library-gate]"));
const loadEarlierButton = document.querySelector("[data-load-earlier]");
const signalStatusTime = document.querySelector("[data-signal-status-time]");
const signalStatusCount = document.querySelector("[data-signal-status-count]");
let timelineItems = Array.from(document.querySelectorAll(".signal-timeline__item"));
const storyDataElement = document.querySelector("[data-signal-stories]");
const detailPanel = document.querySelector("[data-signal-detail]");
const detailContent = detailPanel?.querySelector("[data-signal-detail-content]");
const detailVisual = detailPanel?.querySelector("[data-signal-detail-visual]");
const pageMain = document.querySelector(".page-home");
let storyData = parseStoryData();
let storyMap = new Map(storyData.map((story) => [String(story.id), story]));
const timelineItemsContainer = document.querySelector("[data-signal-timeline-items]");
const detailDefaults = captureDetailDefaults();
let activeStoryId = null;
let activeUpdateFrame = 0;
let timelineArmed = false;
let timelineClosed = false;
let lastScrollY = window.scrollY || 0;
let timelineRevealObserver = null;
let earlierLiveStoryGroups = [];
let liveTimelineTodayKey = getLocalDayKey(new Date());
let authRequestInFlight = false;

document.documentElement.classList.add("js-ready");

const storageKeys = {
  theme: "alomat-palette",
  name: "alomat-name",
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
    reveal: "Oldingi kunlar ochildi",
    savedEmail: "Mail saqlap qolindi",
    requestSubmit: "Mailni saqlash",
    invalidEmail: "Iltimos, to'g'ri e-pochta kiriting.",
  },
  en: {
    palette: "Palette",
    save: "Saved",
    greeting: (name) => `Hello, ${name}. Your name is saved.`,
    hint: (name) => `Hello, ${name}. Saves and likes are tied to this name.`,
    reveal: "Earlier days revealed",
    savedEmail: "Mail saqlap qolindi",
    requestSubmit: "Save email",
    invalidEmail: "Please enter a valid email.",
  },
};

const themeLabels = {
  0: locale === "en" ? "Palette 1" : "1. palet",
  2: locale === "en" ? "Palette 2" : "2. palet",
  4: locale === "en" ? "Palette 3" : "3. palet",
  5: locale === "en" ? "Palette 3" : "3. palet",
  7: locale === "en" ? "Palette 1" : "1. palet",
};

const detailLabels = {
  uz: {
    active: "FAOL SIGNAL",
    close: "Panelni yopish",
    source: "MANBA",
    time: "VAQT",
    weight: "DOLZARBLIGI",
    aiLens: "AI LINZASI",
    askAi: "AI so'rash",
    originalSource: "ASL MANBA",
    save: "Saqlash",
    share: "Ulashish",
    download: "Yuklash",
  },
  en: {
    active: "ACTIVE SIGNAL",
    close: "Close panel",
    source: "SOURCE",
    time: "TIME",
    weight: "WEIGHT",
    aiLens: "AI LENS",
    askAi: "Ask AI",
    originalSource: "ORIGINAL SOURCE",
    save: "Save",
    share: "Share",
    download: "Download",
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
    return JSON.parse(storyDataElement.textContent);
  } catch {
    return [];
  }
}

function getSignalsApiUrl() {
  const base = String(window.__ALOMAT_SIGNALS_API_BASE__ || "").trim();
  const path = "/api/signals?limit=50";
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
  const text = normalizeOperationalText([story?.title, ...(Array.isArray(story?.summary) ? story.summary : [])].join(" "));
  return (
    text.includes("manba matni taqdim etilmagan") ||
    text.includes("post yozib bo'lmadi") ||
    text.includes("maqolaning to'liq matnini yuboring") ||
    text.includes("source text was not provided") ||
    text.includes("could not write the post")
  );
}

function isPublishableSignal(story) {
  return Boolean(story?.title && Array.isArray(story.summary) && story.summary.length && !isBotOperationalMessage(story));
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

function normalizeLiveSignal(signal, index) {
  const id = signal.id ?? signal.external_id ?? `live-${index}`;
  const createdAt = typeof signal.created_at === "string" ? signal.created_at : "";
  const summary = normalizeLiveSignalSummary(signal.summary);
  const sourceUrl = firstVisibleLinkFromSummary(signal.summary) || signal.url;

  return {
    id: `live-${id}`,
    title: String(signal.title || "").trim(),
    source: String(signal.source || "").trim(),
    createdAt,
    dayKey: getLocalDayKey(createdAt),
    time: formatSignalTime(createdAt),
    score: Number.isFinite(signal.score) ? signal.score : 94,
    url: sanitizeStoryUrl(sourceUrl),
    image: sanitizeStoryImage(signal.image),
    category: String(signal.category || "general").trim(),
    summary,
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
    return locale === "en" ? "Today" : "Bugun";
  }
  if (distance === 1) {
    return locale === "en" ? "Yesterday" : "Kecha";
  }
  return locale === "en" ? `${distance} days ago` : `${distance} kun oldin`;
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

function formatSignalCount(count) {
  if (locale === "en") {
    return `${count} ${count === 1 ? "signal" : "signals"}`;
  }
  return `${count} signal`;
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

  return value?.[locale] ?? value?.en ?? value?.uz ?? "";
}

function buildExpandedSummary(story) {
  const title = localizeStoryValue(story.title);
  const source = story.source ?? (locale === "en" ? "the original source" : "asl manba");
  const time = story.time ?? (locale === "en" ? "today" : "bugun");
  const category = story.category ?? "signal";
  const summary = Array.isArray(story.summary) ? [...story.summary] : [];
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

  summary.push(
    `Bu signal muhim, chunki "${title}" faqat bitta sarlavha emas; u ${category} yo'nalishida qarorlar qanday qabul qilinayotgani, qanday moliyalashtirilayotgani va ommaga qanday tushuntirilayotganini ko'rsatadi. ${time} vaqti voqeani bugungi kun ritmiga bog'laydi, ${source} esa nima o'zgargani va nimasi hali ochiq qolayotganini baholash uchun birinchi kontekstni beradi.`,
    `O'quvchi uchun asosiy nuqta keyingi ta'sirlarni kuzatish: qaysi jamoalar, bozorlar, foydalanuvchilar yoki regulyatorlar bunga javob beradi. Foydali signal faqat nima bo'lganini aytmaydi; u keyin nimaga qarash kerakligini ham aniqlaydi. Shu sababli karta mavzuni uzun feedga aylantirmasdan, tushunarli kontekst bilan ushlab turadi.`,
  );
  return summary;
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

function getStoryNodeRect(item) {
  const node = item?.querySelector(".signal-timeline__node") ?? item;
  return node?.getBoundingClientRect?.() ?? null;
}

function scrollStoryIntoView(item, behavior = "smooth") {
  const rect = getStoryNodeRect(item);
  if (!rect) {
    return;
  }

  const target = window.scrollY + rect.top + rect.height / 2 - getTimelineAnchor();
  window.scrollTo({ top: Math.max(0, target), behavior });
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
  const title = escapeHtml(localizeStoryValue(story.title));
  const source = escapeHtml(story.source ?? "");
  const time = escapeHtml(story.time ?? "");
  const weight = `${escapeHtml(String(story.score ?? 94))}/100`;
  const summary = buildExpandedSummary(story);
  const summaryHtml = summary
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join("");
  const sourceHref = sanitizeStoryUrl(story.url);
  const sourceTarget = sourceHref === "#" ? "" : ' target="_blank" rel="noreferrer"';
  const imageButton = (label, symbol) =>
    `<button class="timeline-panel__lens-button" type="button" aria-label="${escapeHtml(label)}">${symbol}</button>`;
  const actionButton = (label, symbol) =>
    `<button class="timeline-panel__icon-button" type="button" aria-label="${escapeHtml(label)}">${symbol}</button>`;

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
      <div class="timeline-panel__lens">
        <span>${escapeHtml(labels.aiLens)}</span>
        <strong>${escapeHtml(labels.askAi)}</strong>
      </div>
      <div class="timeline-panel__lens-buttons">
        ${imageButton(labels.askAi, "AI")}
        ${imageButton(labels.save, "★")}
        ${imageButton(labels.share, "↗")}
      </div>
    </div>
    <div class="timeline-panel__footer">
      <a class="timeline-panel__source" href="${escapeAttribute(sourceHref)}"${sourceTarget}>
        ${escapeHtml(labels.originalSource)}
        <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false">
          <path fill="none" stroke="currentColor" stroke-width="2" d="M14 3h7v7"></path>
          <path fill="none" stroke="currentColor" stroke-width="2" d="M21 3 10 14"></path>
        </svg>
      </a>
      <div class="timeline-panel__share">
        ${actionButton(labels.save, "♥")}
        ${actionButton(labels.share, "↔")}
        ${actionButton(labels.download, "⇩")}
      </div>
    </div>`;
}

function resetDetailPanel() {
  if (!detailContent || !detailDefaults) {
    return;
  }

  activeStoryId = null;
  timelineArmed = false;
  timelineClosed = true;
  lastScrollY = window.scrollY || 0;
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

function renderLiveTimelineItem(story, index) {
  const shift = ((index % 3) - 1) * 7;
  const storyImage = getStoryImageUrl(story);
  const storyImageStyle = storyImage ? ` --signal-story-image: url(&quot;${escapeAttribute(storyImage)}&quot;);` : "";
  return `
    <article class="signal-timeline__item" data-side="left" data-story-id="${escapeAttribute(story.id)}" data-timeline-index="${index}" style="--timeline-headline-size: 1.420rem; --timeline-headline-shift: ${shift}px; --timeline-node-size: 20.3px; --timeline-importance: 0.94;${storyImageStyle} --timeline-widget-image-opacity: 0.055; --timeline-widget-active-image-opacity: 0.32; --timeline-widget-width: 520px; --timeline-widget-pad-x: 19.4px; --timeline-widget-pad-y: 13.6px;">
      <div class="signal-timeline__node" aria-hidden="true"></div>
      <button type="button" class="signal-timeline__headline-button">
        <span class="signal-timeline__headline-text">${escapeHtml(story.title)}</span>
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
  const firstItem = timelineItems[0];
  const firstStory = firstItem ? storyMap.get(String(firstItem.dataset.storyId)) : null;
  if (firstStory && firstItem) {
    applyStoryToDetail(firstStory, firstItem, { behavior: "auto" });
    return;
  }

  resetDetailPanel();
}

function applyStoryToDetail(story, item, options = {}) {
  if (!detailContent || !detailPanel) {
    return;
  }

  const { scrollIntoView = false, behavior = "smooth" } = options;
  const storyId = String(story.id);
  const isNewStory = activeStoryId !== storyId;
  timelineArmed = true;
  timelineClosed = false;
  activeStoryId = storyId;
  if (isNewStory || detailContent.innerHTML === detailDefaults?.html) {
    detailContent.innerHTML = renderStoryMarkup(story);
    if (detailVisual) {
      const background = createBackgroundImageValue(getStoryImageUrl(story));
      detailVisual.style.backgroundImage = background;
      detailPanel.classList.toggle("has-background-image", Boolean(background));
    }
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

function findBestVisibleStoryItem() {
  const viewportAnchor = getTimelineAnchor();
  let bestItem = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  timelineItems.forEach((item) => {
    if (item.hidden) {
      return;
    }

    const story = storyMap.get(String(item.dataset.storyId));
    if (!story) {
      return;
    }

    const rect = getStoryNodeRect(item) ?? item.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      return;
    }

    const distance = Math.abs(rect.top + rect.height / 2 - viewportAnchor);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestItem = item;
    }
  });

  return bestItem;
}

function syncActiveStory() {
  activeUpdateFrame = 0;
  if (!timelineArmed || timelineClosed) {
    lastScrollY = window.scrollY || 0;
    return;
  }

  const activeItem = findBestVisibleStoryItem();
  if (!activeItem) {
    lastScrollY = window.scrollY || 0;
    return;
  }

  const story = storyMap.get(String(activeItem.dataset.storyId));
  if (!story) {
    lastScrollY = window.scrollY || 0;
    return;
  }

  applyStoryToDetail(story, activeItem);
  lastScrollY = window.scrollY || 0;
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

function updateNameDisplay(name) {
  if (!nameDisplay) return;
  const trimmed = name.trim();
  if (!trimmed) {
    nameDisplay.textContent =
      locale === "en"
        ? "Leave a name so saves, likes, and your library stay in sync."
        : "Saqlash, yoqtirish va kutubxonangizni sinxronlash uchun bir ism qoldiring.";
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
    nameSubmitLabel.textContent = labelMap[locale].requestSubmit;
  }
  setNameAuthStatus("");
}

function initNameForm() {
  const storage = safeStorage();
  const savedName = storage?.getItem(storageKeys.name) ?? storage?.getItem(legacyStorageKeys.name);
  if (savedName && nameInput) {
    nameInput.value = savedName;
    updateNameDisplay(savedName);
    if (storage && !storage.getItem(storageKeys.name)) {
      storage.setItem(storageKeys.name, savedName);
      storage.removeItem(legacyStorageKeys.name);
    }
  }

  nameForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (authRequestInFlight) {
      return;
    }

    const email = normalizeAuthEmail(nameInput?.value);
    if (!isLikelyEmail(email)) {
      updateNameDisplay("");
      setNameAuthStatus(labelMap[locale].invalidEmail, "error");
      return;
    }

    setNameAuthLoading(true);
    storage?.setItem(storageKeys.name, email);
    storage?.removeItem(legacyStorageKeys.name);
    updateNameDisplay(email);
    if (nameDisplay) {
      nameDisplay.textContent = labelMap[locale].greeting(email);
    }
    if (nameInput) {
      nameInput.value = email;
      nameInput.blur();
    }
    resetNameAuthCodeStep();
    setNameAuthStatus(labelMap[locale].savedEmail, "success");
    setNameAuthLoading(false);
  });

  nameInput?.addEventListener("input", () => {
    updateNameDisplay(nameInput.value);
    resetNameAuthCodeStep();
  });
}

function openNameModal() {
  if (!nameModal || !nameInput) {
    return;
  }

  resetDetailPanel();
  timelineClosed = false;
  nameModal.hidden = false;
  nameModal.classList.add("is-open");
  document.documentElement.classList.add("modal-open");
  readerGateAction?.setAttribute("aria-expanded", "true");
  nameInput.focus({ preventScroll: true });
  if (!nameInput.value) {
    nameInput.value = safeStorage()?.getItem(storageKeys.name) ?? safeStorage()?.getItem(legacyStorageKeys.name) ?? "";
  }
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
    scheduleActiveStorySync();
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
    item.addEventListener("click", (event) => {
      if (event.target.closest(".signal-timeline__headline-button")) {
        return;
      }
      const story = storyMap.get(String(item.dataset.storyId));
      if (!story) {
        return;
      }
      applyStoryToDetail(story, item, { scrollIntoView: true });
    });
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

function initTimelineStories() {
  if (!detailPanel || !detailContent || !storyMap.size) {
    return;
  }

  detailPanel.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-signal-detail-close]");
    if (!closeButton) {
      return;
    }

    event.preventDefault();
    resetDetailPanel();
  });

  bindTimelineItemEvents();

  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY || 0;
      const scrollingDownPastGate =
        Number.isFinite(lastScrollY) &&
        currentScrollY > lastScrollY &&
        currentScrollY > window.innerHeight * 0.4;

      lastScrollY = currentScrollY;

      if (!timelineArmed && !timelineClosed && scrollingDownPastGate) {
        timelineArmed = true;
        scheduleActiveStorySync();
        return;
      }

      scheduleActiveStorySync();
    },
    { passive: true },
  );
  window.addEventListener("resize", scheduleActiveStorySync);
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
initReaderGateAction();
initNameForm();
initTimelineReveal();
initLoadEarlier();
initTimelineStories();
loadLiveSignals();

globalThis.__ALOMAT_APP_TEST__ = {
  sanitizeStoryUrl,
  sanitizeStoryImage,
  getLocalDayKey,
  partitionStoriesByToday,
  createBackgroundImageValue,
  isPublishableSignal,
  loadLiveSignals,
  normalizeLiveSignal,
};
