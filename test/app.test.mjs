import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function createClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) {
      names.forEach((name) => values.add(name));
    },
    remove(...names) {
      names.forEach((name) => values.delete(name));
    },
    toggle(name, force) {
      if (force === true) {
        values.add(name);
        return true;
      }
      if (force === false) {
        values.delete(name);
        return false;
      }
      if (values.has(name)) {
        values.delete(name);
        return false;
      }
      values.add(name);
      return true;
    },
    contains(name) {
      return values.has(name);
    },
  };
}

function createElementStub() {
  return {
    hidden: false,
    dataset: {},
    style: {},
    innerHTML: "",
    textContent: "",
    value: "",
    classList: createClassList(),
    appendChild() {},
    addEventListener() {},
    removeEventListener() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    setAttribute() {},
    getAttribute() {
      return null;
    },
    blur() {},
    focus() {},
    closest() {
      return null;
    },
    getBoundingClientRect() {
      return { top: 0, bottom: 24, height: 24 };
    },
  };
}

function decodeHtml(value) {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}

function createTimelineItem({ storyId, title }) {
  const button = {
    attributes: {},
    listeners: {},
    classList: createClassList(),
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    removeEventListener(type) {
      delete this.listeners[type];
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    querySelector() {
      return null;
    },
    closest() {
      return null;
    },
    click() {
      this.listeners.click?.({ preventDefault() {}, target: this });
    },
  };
  const node = {
    getBoundingClientRect() {
      return { top: 0, bottom: 24, height: 24 };
    },
  };

  return {
    hidden: false,
    dataset: {
      storyId: String(storyId),
    },
    title,
    classList: createClassList(),
    addEventListener() {},
    removeEventListener() {},
    querySelector(selector) {
      if (selector === ".signal-timeline__headline-button") {
        return button;
      }
      if (selector === ".signal-timeline__node") {
        return node;
      }
      return null;
    },
    getBoundingClientRect() {
      return { top: 0, bottom: 24, height: 24 };
    },
    remove() {},
    __button: button,
  };
}

function parseTimelineItemsFromHtml(html) {
  const matches = Array.from(
    html.matchAll(
      /data-story-id="([^"]+)"[\s\S]*?<span class="signal-timeline__headline-text">([\s\S]*?)<\/span>/g,
    ),
  );

  return matches.map(([, storyId, title]) =>
    createTimelineItem({
      storyId: decodeHtml(storyId),
      title: decodeHtml(title).trim(),
    }),
  );
}

function parseDayLabelsFromHtml(html) {
  return Array.from(html.matchAll(/<span class="signal-timeline__day-pill">([\s\S]*?)<\/span>/g), ([, label]) =>
    decodeHtml(label).trim(),
  );
}

function createTimelineEnvironment(stories) {
  const state = {
    dayLabels: [],
    items: stories.map((story) => createTimelineItem({ storyId: story.id, title: story.title.en })),
  };

  function detach(item) {
    state.items = state.items.filter((entry) => entry !== item);
  }

  state.items.forEach((item) => {
    item.remove = () => detach(item);
  });

  const container = {
    querySelector(selector) {
      if (selector === ".signal-timeline__sentinel") {
        return sentinel;
      }
      if (selector === ".signal-timeline__earlier-gate") {
        return earlierGate;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ".signal-timeline__item") {
        return [...state.items];
      }
      return [];
    },
    insertAdjacentHTML(position, html) {
      state.dayLabels.push(...parseDayLabelsFromHtml(html));
      const nextItems = parseTimelineItemsFromHtml(html);
      nextItems.forEach((item) => {
        item.remove = () => detach(item);
      });
      state.items = position === "afterbegin" ? [...nextItems, ...state.items] : [...state.items, ...nextItems];
    },
  };

  const sentinel = {
    insertAdjacentHTML(position, html) {
      container.insertAdjacentHTML(position, html);
    },
  };
  const earlierGate = {
    insertAdjacentHTML(position, html) {
      container.insertAdjacentHTML(position, html);
    },
  };

  return {
    container,
    getTitles() {
      return state.items.map((item) => item.title);
    },
    getDayLabels() {
      return [...state.dayLabels];
    },
    getFirstItem() {
      return state.items[0] ?? null;
    },
    getItems() {
      return [...state.items];
    },
  };
}

function createAppEnvironment({ stories, fetchImpl, lang = "en" }) {
  const timeline = createTimelineEnvironment(stories);
  const storyDataElement = { textContent: JSON.stringify(stories) };
  const storage = new Map();
  const scrollCalls = [];
  const windowListeners = new Map();
  const createInput = () => ({
    hidden: false,
    value: "",
    disabled: false,
    addEventListener() {},
    blur() {},
    focus() {},
  });
  const nameInput = createInput();
  const firstNameInput = createInput();
  const lastNameInput = createInput();
  const emailStep = {
    hidden: false,
  };
  const profileStep = {
    hidden: true,
  };
  const nameCodeInput = createInput();
  nameCodeInput.hidden = true;
  const nameCodeField = {
    hidden: true,
  };
  const nameAuthStatus = {
    hidden: true,
    dataset: {},
    textContent: "",
    classList: createClassList(),
  };
  const nameSubmitLabel = {
    textContent: "Save email",
  };
  const nameSubmitButton = {
    disabled: false,
    querySelector(selector) {
      return selector === "[data-name-submit-label]" ? nameSubmitLabel : null;
    },
  };
  const heroTitle = {
    textContent: "Welcome, stranger.",
  };
  const heroBody = {
    textContent: "What should the line call you? Keep it saved.",
  };
  const nameDisplay = {
    textContent: "",
  };
  const readerGateAction = {
    hidden: false,
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    addEventListener() {},
  };
  const nameForm = {
    listeners: {},
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    async submit() {
      await this.listeners.submit?.({ preventDefault() {} });
    },
    querySelector(selector) {
      if (selector === "[data-name-auth-submit]") {
        return nameSubmitButton;
      }
      if (selector === "[data-name-submit-label]") {
        return nameSubmitLabel;
      }
      return null;
    },
  };
  const nameModal = {
    hidden: false,
    parentElement: null,
    classList: createClassList(),
    addEventListener() {},
  };
  const loadEarlierButton = {
    disabled: false,
    hidden: false,
    textContent: "",
    attributes: {},
    listeners: {},
    classList: createClassList(),
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    removeEventListener(type) {
      delete this.listeners[type];
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    click() {
      this.listeners.click?.({ preventDefault() {} });
    },
  };
  const detailContent = {
    innerHTML: "<p>Default detail</p>",
    scrollTop: 0,
  };
  const signalStatusTime = {
    textContent: "FAOL SIGNAL",
  };
  const signalStatusCount = {
    textContent: "10 signal",
  };
  const detailVisual = {
    style: {
      backgroundImage: 'url("https://safe.example/fallback.png")',
    },
  };
  const detailPanel = {
    classList: createClassList(["signal-detail--intro"]),
    scrollTop: 0,
    querySelector(selector) {
      if (selector === "[data-signal-detail-content]") {
        return detailContent;
      }
      if (selector === "[data-signal-detail-visual]") {
        return detailVisual;
      }
      return null;
    },
    addEventListener() {},
  };
  const pageMain = {
    classList: createClassList(),
  };
  const documentElement = {
    lang,
    dataset: {},
    classList: createClassList(),
  };
  const body = {
    dataset: {},
    classList: createClassList(),
    appendChild(node) {
      node.parentElement = this;
    },
  };
  const documentStub = {
    body,
    documentElement,
    querySelector(selector) {
      if (selector === "[data-signal-stories]") {
        return storyDataElement;
      }
      if (selector === "[data-signal-detail]") {
        return detailPanel;
      }
      if (selector === "[data-signal-timeline-items]") {
        return timeline.container;
      }
      if (selector === ".page-home") {
        return pageMain;
      }
      if (selector === "[data-load-earlier]") {
        return loadEarlierButton;
      }
      if (selector === "[data-signal-status-time]") {
        return signalStatusTime;
      }
      if (selector === "[data-signal-status-count]") {
        return signalStatusCount;
      }
      if (selector === "[data-name-form]") {
        return nameForm;
      }
      if (selector === "[data-name-input]") {
        return nameInput;
      }
      if (selector === "[data-name-first-input]") {
        return firstNameInput;
      }
      if (selector === "[data-name-last-input]") {
        return lastNameInput;
      }
      if (selector === "[data-name-email-step]") {
        return emailStep;
      }
      if (selector === "[data-name-profile-step]") {
        return profileStep;
      }
      if (selector === "[data-name-code-input]") {
        return nameCodeInput;
      }
      if (selector === "[data-name-code-field]") {
        return nameCodeField;
      }
      if (selector === "[data-name-auth-status]") {
        return nameAuthStatus;
      }
      if (selector === "[data-name-auth-submit]") {
        return nameSubmitButton;
      }
      if (selector === "[data-name-submit-label]") {
        return nameSubmitLabel;
      }
      if (selector === "[data-name-modal]") {
        return nameModal;
      }
      if (selector === "[data-name-display]") {
        return nameDisplay;
      }
      if (selector === ".signal-reader-gate__action") {
        return readerGateAction;
      }
      if (selector === "[data-hero-title]") {
        return heroTitle;
      }
      if (selector === "[data-hero-body]") {
        return heroBody;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ".signal-timeline__item") {
        return timeline.getItems();
      }
      return [];
    },
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    removeEventListener(type) {
      windowListeners.delete(type);
    },
    createElement: createElementStub,
  };
  const windowStub = {
    document: documentStub,
    __ALOMAT_SIGNAL_FALLBACK_IMAGE__: "https://safe.example/fallback.png",
    __ALOMAT_SIGNALS_API_BASE__: "",
    scrollY: 0,
    innerHeight: 900,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    matchMedia() {
      return { matches: false, addEventListener() {}, removeEventListener() {} };
    },
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    cancelAnimationFrame() {},
    scrollTo(options) {
      scrollCalls.push(options);
      if (Number.isFinite(options?.top)) {
        this.scrollY = options.top;
      }
    },
    localStorage: {
      getItem(key) {
        return storage.get(key) ?? null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
    Intl,
  };

  return {
    detailContent,
    detailPanel,
    detailVisual,
    emailStep,
    firstNameInput,
    heroBody,
    heroTitle,
    loadEarlierButton,
    nameAuthStatus,
    nameCodeField,
    nameCodeInput,
    nameDisplay,
    nameForm,
    nameInput,
    nameModal,
    lastNameInput,
    profileStep,
    readerGateAction,
    nameSubmitButton,
    nameSubmitLabel,
    pageMain,
    signalStatusCount,
    signalStatusTime,
    scrollCalls,
    timeline,
    windowListeners,
    globals: {
      window: windowStub,
      document: documentStub,
      fetch: fetchImpl,
      CustomEvent: class CustomEvent {
        constructor(type, init = {}) {
          this.type = type;
          this.detail = init.detail;
        }
      },
      localStorage: windowStub.localStorage,
      Intl,
      IntersectionObserver: class IntersectionObserver {
        observe() {}
        disconnect() {}
      },
    },
  };
}

let appImportNonce = 0;
const appSource = readFileSync(new URL("../app.js", import.meta.url), "utf8");

async function loadAppModule(options = {}) {
  const previousGlobals = {
    window: globalThis.window,
    document: globalThis.document,
    fetch: globalThis.fetch,
    CustomEvent: globalThis.CustomEvent,
    localStorage: globalThis.localStorage,
    Intl: globalThis.Intl,
    IntersectionObserver: globalThis.IntersectionObserver,
  };

  const environment = createAppEnvironment({
    stories: options.stories ?? [],
    fetchImpl: options.fetchImpl ?? (async () => ({ ok: false, json: async () => ({}) })),
    lang: options.lang ?? "en",
  });

  Object.assign(globalThis, environment.globals);

  appImportNonce += 1;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(`${appSource}\n//# sourceURL=app-test-${appImportNonce}.mjs`).toString("base64")}`;
  await import(moduleUrl);

  return {
    environment,
    helpers: globalThis.__ALOMAT_APP_TEST__,
    cleanup() {
      delete globalThis.__ALOMAT_APP_TEST__;
      Object.assign(globalThis, previousGlobals);
    },
  };
}

function createTrilingualLiveSignal(overrides = {}) {
  return {
    id: 601,
    title: "O'zbekcha jonli signal",
    title_en: "English live signal",
    title_tr: "Turkce canli sinyal",
    summary: ["O'zbekcha tafsilot."],
    summary_en: ["English detail."],
    summary_tr: ["Turkce ayrinti."],
    rich_summary: [],
    rich_summary_en: [],
    rich_summary_tr: [],
    source: "Live Source",
    created_at: "2026-07-13T09:00:00Z",
    url: "https://example.com/live",
    ...overrides,
  };
}

test("client helpers keep valid http and https urls unchanged", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    assert.equal(helpers.sanitizeStoryUrl("https://example.com/source"), "https://example.com/source");
    assert.equal(helpers.sanitizeStoryImage("http://cdn.example.com/image.jpg"), "http://cdn.example.com/image.jpg");
  } finally {
    cleanup();
  }
});

test("source labels use uppercase site names without domain suffixes", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    assert.equal(helpers.getSiteLabelFromUrl("https://marktechpost.com/article"), "MARKTECHPOST");
    assert.equal(helpers.getSiteLabelFromUrl("https://info.arxiv.org/about"), "ARXIV");
    assert.equal(helpers.getSiteLabelFromUrl("https://terrytao.wordpress.com/post"), "TERRYTAO");
    assert.equal(helpers.getSiteLabelFromUrl("https://example.substack.com/p/post"), "EXAMPLE");
    assert.equal(helpers.getSiteLabelFromUrl("https://alomat.ai"), "ALOMAT");
    assert.equal(helpers.getSiteLabelFromUrl("javascript:alert(1)"), "");
  } finally {
    cleanup();
  }
});

test("client helpers reject unsafe href and image values", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    assert.equal(helpers.sanitizeStoryUrl("javascript:alert(1)"), "#");
    assert.equal(helpers.sanitizeStoryUrl("\u0000https://example.com/source"), "#");
    assert.equal(
      helpers.sanitizeStoryImage('https://example.com/image.jpg") ; background-image:url(javascript:alert(1))'),
      "",
    );
    assert.equal(helpers.sanitizeStoryImage("data:image/svg+xml,<svg></svg>"), "");
    assert.equal(helpers.sanitizeStoryImage(""), "");
  } finally {
    cleanup();
  }
});

test("client background-image helper never returns raw unsafe css", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    assert.equal(
      helpers.createBackgroundImageValue('https://example.com/image.jpg") ; background-image:url(javascript:alert(1))'),
      "",
    );
    assert.equal(helpers.createBackgroundImageValue("javascript:alert(1)"), "");
  } finally {
    cleanup();
  }
});

test("local library recovers from malformed storage and toggles like and save independently", async () => {
  const { environment, helpers, cleanup } = await loadAppModule();
  try {
    const storage = environment.globals.localStorage;
    storage.setItem("alomat-library-v1", "{broken");
    assert.deepEqual(helpers.readLibraryState(storage), { version: 1, items: {} });

    const story = {
      id: "story-1",
      title: "Stored signal",
      summary: ["Stored summary"],
      source: "Signal Source",
      time: "12:34",
      score: 91,
      url: "https://example.com/story",
    };

    helpers.toggleLibraryAction(story, "save", storage, "2026-07-12T10:00:00.000Z");
    assert.deepEqual(helpers.getLibraryEntries(storage)[0].story.summary, {
      uz: ["Stored summary"],
      en: ["Stored summary"],
      tr: ["Stored summary"],
    });
    assert.deepEqual(helpers.getLibraryCounts(helpers.getLibraryEntries(storage)), {
      liked: 0,
      saved: 1,
      total: 1,
    });

    helpers.toggleLibraryAction(story, "like", storage, "2026-07-12T10:01:00.000Z");
    assert.equal(helpers.getLibraryEntries(storage)[0].liked, true);
    assert.equal(helpers.getLibraryEntries(storage)[0].saved, true);

    helpers.toggleLibraryAction(story, "save", storage, "2026-07-12T10:02:00.000Z");
    assert.equal(helpers.getLibraryEntries(storage)[0].saved, false);

    helpers.toggleLibraryAction(story, "like", storage, "2026-07-12T10:03:00.000Z");
    assert.deepEqual(helpers.getLibraryEntries(storage), []);
  } finally {
    cleanup();
  }
});

test("local library deduplicates stories and sorts the latest action first", async () => {
  const { environment, helpers, cleanup } = await loadAppModule();
  try {
    const storage = environment.globals.localStorage;
    const first = { id: "first", title: "First", summary: ["One"], url: "https://example.com/first" };
    const second = { id: "second", title: "Second", summary: ["Two"], url: "https://example.com/second" };

    helpers.toggleLibraryAction(first, "save", storage, "2026-07-12T10:00:00.000Z");
    helpers.toggleLibraryAction(second, "like", storage, "2026-07-12T10:02:00.000Z");
    helpers.toggleLibraryAction(first, "like", storage, "2026-07-12T10:03:00.000Z");

    const entries = helpers.getLibraryEntries(storage);
    assert.deepEqual(entries.map((entry) => entry.story.id), ["first", "second"]);
    assert.deepEqual(helpers.getLibraryCounts(entries), { liked: 2, saved: 1, total: 2 });
  } finally {
    cleanup();
  }
});

test("detail action markup uses one compact source, like, save, and share row without AI", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    const markup = helpers.renderStoryMarkup({
      id: "actions-1",
      title: "Action story",
      summary: ["Summary"],
      source: "Source",
      time: "13:00",
      url: "https://example.com/action",
    });

    assert.match(markup, /data-story-action="like"/);
    assert.match(markup, /data-story-action="save"/);
    assert.match(markup, /data-story-action="share"/);
    assert.match(markup, /data-icon="heart"/);
    assert.match(markup, /data-icon="bookmark"/);
    assert.match(markup, /data-icon="share"/);
    assert.match(markup, /class="timeline-panel__source"/);
    assert.match(markup, /ORIGINAL SOURCE/);
    assert.equal((markup.match(/data-story-action="share"/g) || []).length, 1);
    assert.doesNotMatch(markup, /timeline-panel__footer/);
    assert.doesNotMatch(markup, /timeline-panel__lens/);
    assert.doesNotMatch(markup, /AI LENS|Ask AI|AI so'rash|AI LINZASI/);
    assert.doesNotMatch(markup, /data-story-action="download"/);
    assert.doesNotMatch(markup, /Download|Yuklash/);
  } finally {
    cleanup();
  }
});

test("detail markup renders safe rich-summary links on their original words", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    const markup = helpers.renderStoryMarkup({
      id: "digest-1",
      title: "AI digest",
      isDigest: true,
      summary: ["OpenAI va Anthropic yangiliklari."],
      richSummary: [
        {
          segments: [
            { text: "OpenAI", url: "https://openai.com/news" },
            { text: " va " },
            { text: "Anthropic", url: "javascript:alert(1)" },
            { text: " yangiliklari." },
          ],
        },
      ],
      source: "AI digest",
      time: "13:00",
      url: "https://example.com/digest",
    });

    assert.match(
      markup,
      /<a class="timeline-panel__inline-link" href="https:\/\/openai\.com\/news" target="_blank" rel="noreferrer noopener">OpenAI<\/a>/,
    );
    assert.match(markup, /Anthropic/);
    assert.doesNotMatch(markup, /javascript:alert/);
    assert.match(markup, /class="timeline-panel__source"/);
    assert.match(markup, /<span>SOURCE<\/span>\s*<strong>ALOMAT<\/strong>/);
  } finally {
    cleanup();
  }
});

test("normal news ignores rich-summary links and renders its plain summary", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    const markup = helpers.renderStoryMarkup({
      id: "news-1",
      title: "OpenAI yangi modelini taqdim etdi",
      summary: ["OpenAI yangi modelini taqdim etdi."],
      richSummary: [
        {
          segments: [
            { text: "OpenAI", url: "https://openai.com/news" },
            { text: " yangi modelini taqdim etdi." },
          ],
        },
      ],
      source: "Telegram bot",
      time: "14:00",
      url: "https://www.reuters.com/world/news",
    });

    assert.doesNotMatch(markup, /timeline-panel__inline-link/);
    assert.match(markup, /<p>OpenAI yangi modelini taqdim etdi\.<\/p>/);
    assert.match(markup, /<span>SOURCE<\/span>\s*<strong>REUTERS<\/strong>/);
    assert.doesNotMatch(markup, /<strong>Telegram bot<\/strong>/);
  } finally {
    cleanup();
  }
});

test("share action falls back to copying the sanitized story URL", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    let copied = "";
    const result = await helpers.shareStory(
      { title: "Shared signal", url: "https://example.com/shared" },
      {
        clipboard: {
          async writeText(value) {
            copied = value;
          },
        },
      },
    );

    assert.equal(result, "copied");
    assert.equal(copied, "https://example.com/shared");
  } finally {
    cleanup();
  }
});

test("library entry renderer outputs one story with liked and saved states", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    const markup = helpers.renderLibraryEntriesMarkup([
      {
        story: {
          id: "library-1",
          title: "Library signal",
          summary: ["Library summary"],
          source: "Library Source",
          time: "14:20",
          url: "https://example.com/library",
        },
        liked: true,
        saved: true,
        updatedAt: "2026-07-12T14:21:00.000Z",
      },
    ]);

    assert.match(markup, /Library signal/);
    assert.match(markup, /Library summary/);
    assert.match(markup, /Library Source/);
    assert.match(markup, /Liked/);
    assert.match(markup, /Saved/);
    assert.equal((markup.match(/class="library-signal-row"/g) || []).length, 1);
  } finally {
    cleanup();
  }
});

test("local library snapshots retain and render every localized story variant", async () => {
  const { environment, helpers, cleanup } = await loadAppModule({ lang: "tr" });
  try {
    const storage = environment.globals.localStorage;
    const story = helpers.normalizeLiveSignal(
      createTrilingualLiveSignal({
        title: "AI Digest - 2026-07-13 Ozbekcha",
        title_en: "AI Digest - 2026-07-13 English",
        title_tr: "AI Digest - 2026-07-13 Turkce",
        rich_summary: [{ segments: [{ text: "Ozbekcha", url: "https://example.com/uz" }] }],
        rich_summary_en: [{ segments: [{ text: "English", url: "https://example.com/en" }] }],
        rich_summary_tr: [{ segments: [{ text: "Turkce", url: "https://example.com/tr" }] }],
      }),
      0,
    );

    helpers.toggleLibraryAction(story, "save", storage, "2026-07-13T10:00:00.000Z");
    const [entry] = helpers.getLibraryEntries(storage);

    assert.deepEqual(entry.story.title, {
      uz: "AI Digest - 2026-07-13 Ozbekcha",
      en: "AI Digest - 2026-07-13 English",
      tr: "AI Digest - 2026-07-13 Turkce",
    });
    assert.deepEqual(entry.story.summary, {
      uz: ["O'zbekcha tafsilot."],
      en: ["English detail."],
      tr: ["Turkce ayrinti."],
    });
    assert.equal(entry.story.richSummary.tr[0].segments[0].url, "https://example.com/tr");

    const markup = helpers.renderLibraryEntriesMarkup([entry]);
    assert.match(markup, /AI Digest - 2026-07-13 Turkce/);
    assert.match(markup, /Turkce ayrinti\./);
    assert.match(markup, /Kaydedildi/);
    assert.doesNotMatch(markup, /English detail|O&#39;zbekcha tafsilot/);
  } finally {
    cleanup();
  }
});

test("titled live records without a summary array do not replace the fallback timeline", async () => {
  const fallbackStories = [
    {
      id: "fallback-1",
      title: { en: "Fallback story" },
      summary: { en: ["Static summary"] },
      source: "Fallback Source",
      time: "09:00",
      url: "https://example.com/fallback",
      image: "https://example.com/fallback.png",
    },
  ];
  const { environment, helpers, cleanup } = await loadAppModule({ stories: fallbackStories });
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        signals: [
          {
            id: 101,
            title: "Live title only",
            summary: [],
            source: "Broken Feed",
            created_at: "2026-07-10T10:30:00Z",
          },
        ],
      }),
    });

    await helpers.loadLiveSignals();

    assert.deepEqual(environment.timeline.getTitles(), ["Fallback story"]);
    assert.equal(environment.detailContent.innerHTML, "<p>Default detail</p>");
    assert.equal(environment.detailPanel.classList.contains("has-story"), false);
  } finally {
    cleanup();
  }
});

test("malformed live summary arrays preserve the fallback timeline", async () => {
  const fallbackStories = [
    {
      id: "fallback-1",
      title: { en: "Fallback story" },
      summary: { en: ["Static summary"] },
      source: "Fallback Source",
      time: "09:00",
      url: "https://example.com/fallback",
      image: "https://example.com/fallback.png",
    },
  ];
  const { environment, helpers, cleanup } = await loadAppModule({ stories: fallbackStories, lang: "uz" });
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        signals: [
          {
            id: 301,
            title: "Null summary",
            summary: [null],
            source: "Broken Feed",
            created_at: "2026-07-10T10:30:00Z",
          },
          {
            id: 302,
            title: "Object summary",
            summary: [{}],
            source: "Broken Feed",
            created_at: "2026-07-10T10:35:00Z",
          },
        ],
      }),
    });

    await helpers.loadLiveSignals();

    assert.deepEqual(environment.timeline.getTitles(), ["Fallback story"]);
    assert.equal(environment.detailContent.innerHTML, "<p>Default detail</p>");
    assert.equal(environment.detailPanel.classList.contains("has-story"), false);
  } finally {
    cleanup();
  }
});

test("bot operational error messages do not replace the fallback timeline", async () => {
  const fallbackStories = [
    {
      id: "fallback-1",
      title: { en: "Fallback story" },
      summary: { en: ["Static summary"] },
      source: "Fallback Source",
      time: "09:00",
      url: "https://example.com/fallback",
      image: "https://example.com/fallback.png",
    },
  ];
  const { environment, helpers, cleanup } = await loadAppModule({ stories: fallbackStories });
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        signals: [
          {
            id: 30,
            title: "Manba matni taqdim etilmaganligi sababli post yozib bo'lmadi. Iltimos, maqolaning to'liq matnini yuboring.",
            summary: [
              "Manba matni taqdim etilmaganligi sababli post yozib bo'lmadi. Iltimos, maqolaning to'liq matnini yuboring.",
            ],
            source: "Telegram bot",
            url: "https://example.com/source",
            created_at: "2026-07-11T08:45:24.610Z",
          },
        ],
      }),
    });

    await helpers.loadLiveSignals();

    assert.equal(helpers.isPublishableSignal(helpers.normalizeLiveSignal({
      title: "Manba matni taqdim etilmaganligi sababli post yozib bo'lmadi.",
      summary: ["Iltimos, maqolaning to'liq matnini yuboring."],
      source: "Telegram bot",
    }, 0)), false);
    assert.deepEqual(environment.timeline.getTitles(), ["Fallback story"]);
    assert.equal(environment.detailPanel.classList.contains("has-story"), false);
  } finally {
    cleanup();
  }
});

test("valid live records replace demo cards and hydrate the detail panel", async () => {
  const fallbackStories = [
    {
      id: "fallback-1",
      title: { en: "Fallback story" },
      summary: { en: ["Static summary"] },
      source: "Fallback Source",
      time: "09:00",
      url: "https://example.com/fallback",
      image: "https://example.com/fallback.png",
    },
  ];
  const { environment, helpers, cleanup } = await loadAppModule({ stories: fallbackStories });
  try {
    let requestedUrl = "";
    globalThis.fetch = async (url) => {
      requestedUrl = String(url);
      return {
        ok: true,
        json: async () => ({
          signals: [
            {
              id: 202,
              title: "Live signal",
              summary: ["Live summary paragraph."],
              source: "Live Source",
              created_at: "2026-07-11T10:30:00Z",
              url: "https://example.com/live",
              image: "https://example.com/live.png",
            },
          ],
        }),
      };
    };

    await helpers.loadLiveSignals(new Date("2026-07-11T12:00:00Z"));

    assert.match(requestedUrl, /[?&]limit=200\b/);
    assert.deepEqual(environment.timeline.getTitles(), ["Live signal"]);
    assert.match(environment.detailContent.innerHTML, /Live signal/);
    assert.match(environment.detailContent.innerHTML, /Live summary paragraph\./);
    assert.match(environment.detailContent.innerHTML, /<strong>EXAMPLE<\/strong>/);
    assert.doesNotMatch(environment.detailContent.innerHTML, /<strong>Live Source<\/strong>/);
    assert.equal(environment.detailPanel.classList.contains("has-story"), true);
    assert.equal(environment.pageMain.classList.contains("has-detail-open"), true);
    assert.equal(environment.timeline.getFirstItem()?.__button.getAttribute("aria-current"), "true");
  } finally {
    cleanup();
  }
});

test("the same live API record renders its English translation", async () => {
  const { environment, helpers, cleanup } = await loadAppModule({ lang: "en" });
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ signals: [createTrilingualLiveSignal()] }),
    });

    await helpers.loadLiveSignals(new Date("2026-07-13T12:00:00Z"));

    assert.deepEqual(environment.timeline.getTitles(), ["English live signal"]);
    assert.match(environment.detailContent.innerHTML, /English live signal/);
    assert.match(environment.detailContent.innerHTML, /English detail\./);
    assert.doesNotMatch(environment.detailContent.innerHTML, /O&#39;zbekcha tafsilot|Turkce ayrinti/);
  } finally {
    cleanup();
  }
});

test("the same live API record renders its Turkish translation and labels", async () => {
  const { environment, helpers, cleanup } = await loadAppModule({ lang: "tr" });
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ signals: [createTrilingualLiveSignal()] }),
    });

    await helpers.loadLiveSignals(new Date("2026-07-13T12:00:00Z"));

    assert.deepEqual(environment.timeline.getTitles(), ["Turkce canli sinyal"]);
    assert.match(environment.detailContent.innerHTML, /Turkce canli sinyal/);
    assert.match(environment.detailContent.innerHTML, /Turkce ayrinti\./);
    assert.match(environment.detailContent.innerHTML, /AKTIF SINYAL|AKTİF SİNYAL/);
    assert.match(environment.detailContent.innerHTML, /ORIJINAL KAYNAK|ORİJİNAL KAYNAK/);
    assert.doesNotMatch(environment.detailContent.innerHTML, /English detail|O&#39;zbekcha tafsilot/);
  } finally {
    cleanup();
  }
});

test("missing Turkish live fields fall back to canonical Uzbek text", async () => {
  const { environment, helpers, cleanup } = await loadAppModule({ lang: "tr" });
  try {
    const record = createTrilingualLiveSignal({
      title_tr: "",
      summary_tr: [],
      rich_summary_tr: [],
    });
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        signals: [record],
      }),
    });

    await helpers.loadLiveSignals(new Date("2026-07-13T12:00:00Z"));

    const normalized = helpers.normalizeLiveSignal(record, 0);
    assert.equal(normalized.title.tr, normalized.title.uz);
    assert.deepEqual(normalized.summary.tr, normalized.summary.uz);
    assert.deepEqual(environment.timeline.getTitles(), ["O'zbekcha jonli signal"]);
    assert.match(environment.detailContent.innerHTML, /O&#39;zbekcha jonli signal/);
    assert.match(environment.detailContent.innerHTML, /O&#39;zbekcha tafsilot\./);
  } finally {
    cleanup();
  }
});

test("unknown document locales use canonical Uzbek live text", async () => {
  const { environment, helpers, cleanup } = await loadAppModule({ lang: "de" });
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ signals: [createTrilingualLiveSignal()] }),
    });

    await helpers.loadLiveSignals(new Date("2026-07-13T12:00:00Z"));

    assert.deepEqual(environment.timeline.getTitles(), ["O'zbekcha jonli signal"]);
    assert.match(environment.detailContent.innerHTML, /O&#39;zbekcha tafsilot\./);
  } finally {
    cleanup();
  }
});

test("Turkish translated Digest keeps compact rendering and localized linked segments", async () => {
  const { environment, helpers, cleanup } = await loadAppModule({ lang: "tr" });
  try {
    const record = createTrilingualLiveSignal({
      title: "AI Digest - 2026-07-13 Ozbekcha",
      title_en: "AI Digest - 2026-07-13 English",
      title_tr: "Yapay Zeka Özeti",
      summary_tr: ["OpenAI Turkce bir guncelleme yayimladi."],
      rich_summary_tr: [
        {
          segments: [
            { text: "OpenAI", url: "https://openai.com/tr-news" },
            { text: " Turkce bir guncelleme yayimladi." },
          ],
        },
      ],
    });
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ signals: [record] }),
    });

    const normalized = helpers.normalizeLiveSignal(record, 0);
    assert.equal(normalized.isDigest, true);
    helpers.toggleLibraryAction(normalized, "save", environment.globals.localStorage);
    assert.equal(helpers.getLibraryEntries(environment.globals.localStorage)[0].story.isDigest, true);

    await helpers.loadLiveSignals(new Date("2026-07-13T12:00:00Z"));

    assert.deepEqual(environment.timeline.getTitles(), ["AI Digest - 2026-07-13"]);
    assert.match(environment.detailContent.innerHTML, /<h2>AI Digest - 2026-07-13<\/h2>/);
    assert.match(environment.detailContent.innerHTML, /<span>KAYNAK<\/span>\s*<strong>ALOMAT<\/strong>/);
    assert.match(environment.detailContent.innerHTML, />OpenAI<\/a> Turkce bir guncelleme yayimladi\./);
    assert.match(
      environment.detailContent.innerHTML,
      /<a class="timeline-panel__inline-link" href="https:\/\/openai\.com\/tr-news"[^>]*>OpenAI<\/a>/,
    );
  } finally {
    cleanup();
  }
});

test("AI Digest uses a compact dated timeline title and keeps linked detail text", async () => {
  const fallbackStories = [
    {
      id: "fallback-1",
      title: { en: "Fallback story" },
      summary: { en: ["Static summary"] },
      source: "Fallback Source",
      time: "09:00",
      url: "https://example.com/fallback",
    },
  ];
  const { environment, helpers, cleanup } = await loadAppModule({ stories: fallbackStories, lang: "uz" });
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        signals: [
          {
            id: 203,
            title: "📑 AI Digest — 2026-07-13 Terry Tao zamonaviy kodlash agentlari haqida yozdi.",
            summary: ["Terry Tao zamonaviy kodlash agentlari haqida yozdi."],
            rich_summary: [
              {
                segments: [
                  { text: "Terry Tao", url: "https://terrytao.wordpress.com/post" },
                  { text: " zamonaviy kodlash agentlari haqida yozdi." },
                ],
              },
            ],
            source: "Telegram bot",
            created_at: "2026-07-13T09:00:39.325Z",
            url: "https://terrytao.wordpress.com/post",
          },
        ],
      }),
    });

    await helpers.loadLiveSignals(new Date("2026-07-13T12:00:00Z"));

    assert.deepEqual(environment.timeline.getTitles(), ["AI Digest - 2026-07-13"]);
    assert.match(environment.detailContent.innerHTML, /<h2>AI Digest - 2026-07-13<\/h2>/);
    assert.doesNotMatch(environment.detailContent.innerHTML, /<h2>[^<]*Terry Tao/);
    assert.match(environment.detailContent.innerHTML, /Terry Tao zamonaviy kodlash agentlari haqida yozdi/);
    assert.match(
      environment.detailContent.innerHTML,
      /<a class="timeline-panel__inline-link" href="https:\/\/terrytao\.wordpress\.com\/post"[^>]*>Terry Tao<\/a>/,
    );
    assert.match(environment.detailContent.innerHTML, /<strong>ALOMAT<\/strong>/);
  } finally {
    cleanup();
  }
});

test("live summary text hides visible links without replacing the bot source URL", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    const signal = helpers.normalizeLiveSignal(
      {
        id: 302,
        title: "Linked signal",
        summary: [
          "Batafsil: https://example.com/news?utm=telegram",
          "Kanal: t.me/alomat",
          "Sayt www.example.org/path orqali ochildi.",
          "Tadqiqot (https://arxiv.org/abs/2607.07859) e'lon qilindi.",
          "Markdown [manba](https://example.com/source) matni qoladi.",
        ],
        url: "https://wrong.example/about",
      },
      0,
    );

    const expectedSummary = [
      "Sayt orqali ochildi.",
      "Tadqiqot e'lon qilindi.",
      "Markdown manba matni qoladi.",
    ];
    assert.deepEqual(signal.summary, {
      uz: expectedSummary,
      en: expectedSummary,
      tr: expectedSummary,
    });
    assert.equal(signal.url, "https://wrong.example/about");
  } finally {
    cleanup();
  }
});

test("live signal falls back to a visible summary link when the bot source URL is missing", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    const signal = helpers.normalizeLiveSignal(
      {
        id: 305,
        title: "Linked signal",
        summary: ["Haber tafsilotlari: https://example.com/news?utm=telegram"],
      },
      0,
    );

    assert.equal(signal.url, "https://example.com/news?utm=telegram");
  } finally {
    cleanup();
  }
});

test("live signal normalization keeps structured rich-summary links", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    const signal = helpers.normalizeLiveSignal(
      {
        id: 303,
        title: "AI digest",
        summary: ["OpenAI yangiligi."],
        rich_summary: [
          {
            segments: [
              { text: "OpenAI", url: "https://openai.com/news" },
              { text: " yangiligi." },
            ],
          },
        ],
      },
      0,
    );

    const expectedRichSummary = [
      {
        segments: [
          { text: "OpenAI", url: "https://openai.com/news" },
          { text: " yangiligi." },
        ],
      },
    ];
    assert.deepEqual(signal.richSummary, {
      uz: expectedRichSummary,
      en: expectedRichSummary,
      tr: expectedRichSummary,
    });
  } finally {
    cleanup();
  }
});

test("live signal normalization drops rich-summary links from normal news", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    const signal = helpers.normalizeLiveSignal(
      {
        id: 304,
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
      0,
    );

    assert.deepEqual(signal.richSummary, { uz: [], en: [], tr: [] });
  } finally {
    cleanup();
  }
});

test("imageless live records do not use fallback backgrounds", async () => {
  const fallbackStories = [
    {
      id: "fallback-1",
      title: { en: "Fallback story" },
      summary: { en: ["Static summary"] },
      source: "Fallback Source",
      time: "09:00",
      url: "https://example.com/fallback",
      image: "https://example.com/fallback.png",
    },
  ];
  const { environment, helpers, cleanup } = await loadAppModule({ stories: fallbackStories });
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        signals: [
          {
            id: 303,
            title: "Imageless signal",
            summary: ["Live summary paragraph."],
            source: "Live Source",
            created_at: "2026-07-11T10:30:00Z",
            url: "https://example.com/live",
          },
        ],
      }),
    });

    await helpers.loadLiveSignals(new Date("2026-07-11T12:00:00Z"));

    assert.equal(helpers.normalizeLiveSignal({ title: "No image", summary: ["Text"] }, 0).image, "");
    assert.equal(environment.detailVisual.style.backgroundImage, "");
    assert.equal(environment.detailPanel.classList.contains("has-background-image"), false);
  } finally {
    cleanup();
  }
});

test("timeline card clicks scroll smoothly without letting scroll sync replace the selection", async () => {
  const stories = [
    {
      id: "with-image",
      title: { en: "Story with image" },
      summary: { en: ["Image summary"] },
      source: "Image Source",
      time: "10:00",
      url: "https://example.com/with-image",
      image: "https://example.com/story.png",
    },
    {
      id: "without-image",
      title: { en: "Story without image" },
      summary: { en: ["Plain summary"] },
      source: "Plain Source",
      time: "10:05",
      url: "https://example.com/without-image",
      image: "",
    },
  ];
  const { environment, cleanup } = await loadAppModule({ stories });
  try {
    const [imageItem, plainItem] = environment.timeline.getItems();

    imageItem.__button.click();
    assert.match(environment.detailContent.innerHTML, /Story with image/);
    assert.equal(environment.detailVisual.style.backgroundImage, "");
    assert.equal(environment.detailPanel.classList.contains("has-background-image"), false);
    assert.equal(environment.scrollCalls.length, 1);
    assert.equal(environment.scrollCalls[0]?.behavior, "smooth");

    plainItem.__button.click();
    environment.windowListeners.get("scroll")?.();
    assert.match(environment.detailContent.innerHTML, /Story without image/);
    assert.equal(environment.detailVisual.style.backgroundImage, "");
    assert.equal(environment.detailPanel.classList.contains("has-background-image"), false);
    assert.equal(environment.scrollCalls.length, 2);
    assert.equal(environment.scrollCalls[1]?.behavior, "smooth");
  } finally {
    cleanup();
  }
});

test("live timeline markup ignores supplied story images", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    const markup = helpers.renderLiveTimelineItem(
      {
        id: "image-story",
        title: "Image story",
        image: "https://example.com/story.png",
      },
      0,
    );

    assert.doesNotMatch(markup, /signal-story-image|story\.png|image-opacity/);
  } finally {
    cleanup();
  }
});

test("live records show today's cards first and reveal one older day per load earlier click", async () => {
  const fallbackStories = [
    {
      id: "fallback-1",
      title: { en: "Fallback story" },
      summary: { en: ["Static summary"] },
      source: "Fallback Source",
      time: "09:00",
      url: "https://example.com/fallback",
      image: "https://example.com/fallback.png",
    },
  ];
  const { environment, helpers, cleanup } = await loadAppModule({ stories: fallbackStories, lang: "uz" });
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        signals: [
          {
            id: 401,
            title: "Today signal",
            summary: ["Today summary paragraph."],
            source: "Live Source",
            created_at: "2026-07-11T10:30:00Z",
          },
          {
            id: 402,
            title: "Yesterday signal",
            summary: ["Yesterday summary paragraph."],
            source: "Live Source",
            created_at: "2026-07-10T20:30:00Z",
          },
          {
            id: 403,
            title: "Two days ago signal",
            summary: ["Two days ago summary paragraph."],
            source: "Live Source",
            created_at: "2026-07-09T20:30:00Z",
          },
          {
            id: 404,
            title: "Second yesterday signal",
            summary: ["Second yesterday summary paragraph."],
            source: "Live Source",
            created_at: "2026-07-10T18:30:00Z",
          },
        ],
      }),
    });

    await helpers.loadLiveSignals(new Date("2026-07-11T12:00:00Z"));

    assert.deepEqual(environment.timeline.getTitles(), ["Today signal"]);
    assert.equal(environment.loadEarlierButton.disabled, false);
    assert.equal(environment.loadEarlierButton.hidden, false);

    environment.loadEarlierButton.click();

    assert.deepEqual(environment.timeline.getTitles(), ["Today signal", "Yesterday signal", "Second yesterday signal"]);
    assert.deepEqual(environment.timeline.getDayLabels(), ["Kecha"]);
    assert.equal(environment.loadEarlierButton.disabled, false);

    environment.loadEarlierButton.click();

    assert.deepEqual(environment.timeline.getTitles(), [
      "Today signal",
      "Yesterday signal",
      "Second yesterday signal",
      "Two days ago signal",
    ]);
    assert.deepEqual(environment.timeline.getDayLabels(), ["Kecha", "2 kun oldin"]);
    assert.equal(environment.loadEarlierButton.disabled, true);
  } finally {
    cleanup();
  }
});

test("live records update the topbar latest time and today count", async () => {
  const fallbackStories = [
    {
      id: "fallback-1",
      title: { en: "Fallback story" },
      summary: { en: ["Static summary"] },
      source: "Fallback Source",
      time: "09:00",
      url: "https://example.com/fallback",
      image: "https://example.com/fallback.png",
    },
  ];
  const { environment, helpers, cleanup } = await loadAppModule({ stories: fallbackStories, lang: "uz" });
  try {
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({
        signals: [
          {
            id: 501,
            title: "Morning signal",
            summary: ["Morning summary paragraph."],
            source: "Live Source",
            created_at: "2026-07-11T08:15:00",
          },
          {
            id: 502,
            title: "Latest signal",
            summary: ["Latest summary paragraph."],
            source: "Live Source",
            created_at: "2026-07-11T12:45:00",
          },
          {
            id: 503,
            title: "Older signal",
            summary: ["Older summary paragraph."],
            source: "Live Source",
            created_at: "2026-07-10T20:30:00",
          },
        ],
      }),
    });

    await helpers.loadLiveSignals(new Date("2026-07-11T14:00:00"));

    assert.equal(environment.signalStatusTime.textContent, "12:45");
    assert.equal(environment.signalStatusCount.textContent, "2 signal");
  } finally {
    cleanup();
  }
});

test("name auth form stores reader details without sending email", async () => {
  const requests = [];
  const { environment, cleanup } = await loadAppModule({
    fetchImpl: async (url, init = {}) => {
      requests.push({ url: String(url), init });
      return { ok: true, json: async () => ({ ok: true }) };
    },
    lang: "en",
  });
  try {
    globalThis.window.__ALOMAT_SIGNALS_API_BASE__ = "https://alomat.ai";
    requests.length = 0;

    environment.nameInput.value = " Malik@example.COM ";
    await environment.nameForm.submit();

    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://alomat.ai/api/readers");
    assert.deepEqual(JSON.parse(requests[0].init.body), { email: "malik@example.com" });
    assert.equal(environment.emailStep.hidden, true);
    assert.equal(environment.profileStep.hidden, false);
    assert.equal(environment.nameCodeField.hidden, true);
    assert.equal(environment.nameCodeInput.hidden, true);
    assert.equal(environment.nameSubmitLabel.textContent, "Save name");
    assert.equal(globalThis.localStorage.getItem("alomat-email"), "malik@example.com");
    assert.equal(environment.nameModal.hidden, false);
    assert.equal(environment.nameAuthStatus.textContent, "Mail saqlap qolindi");

    environment.firstNameInput.value = " Malik ";
    environment.lastNameInput.value = " Aliyev ";
    await environment.nameForm.submit();

    assert.equal(requests.length, 2);
    assert.equal(requests[1].url, "https://alomat.ai/api/readers");
    assert.deepEqual(JSON.parse(requests[1].init.body), {
      email: "malik@example.com",
      first_name: "Malik",
      last_name: "Aliyev",
    });
    assert.equal(globalThis.localStorage.getItem("alomat-name"), "Malik Aliyev");
    assert.equal(environment.nameModal.hidden, true);
    assert.equal(environment.readerGateAction.hidden, true);
    assert.equal(environment.heroTitle.textContent, "Welcome, Malik Aliyev.");
    assert.equal(
      environment.heroBody.textContent,
      "The day's most important shifts sit on one line with time, source, and relevance. Open a signal and see why it matters fast.",
    );
  } finally {
    cleanup();
  }
});
