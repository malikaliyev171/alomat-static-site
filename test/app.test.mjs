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
    classList: createClassList(),
    addEventListener() {},
    removeEventListener() {},
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
    addEventListener() {},
    removeEventListener() {},
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
    scrollTo() {},
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
    timeline,
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

test("client helpers keep valid http and https urls unchanged", async () => {
  const { helpers, cleanup } = await loadAppModule();
  try {
    assert.equal(helpers.sanitizeStoryUrl("https://example.com/source"), "https://example.com/source");
    assert.equal(helpers.sanitizeStoryImage("http://cdn.example.com/image.jpg"), "http://cdn.example.com/image.jpg");
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
    assert.deepEqual(helpers.getLibraryEntries(storage)[0].story.summary, ["Stored summary"]);
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

test("detail action markup uses like, save, and share SVG controls without download", async () => {
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
    assert.doesNotMatch(markup, /data-story-action="download"/);
    assert.doesNotMatch(markup, /Download|Yuklash/);
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
    assert.match(environment.detailContent.innerHTML, /Live Source/);
    assert.equal(environment.detailPanel.classList.contains("has-story"), true);
    assert.equal(environment.pageMain.classList.contains("has-detail-open"), true);
    assert.equal(environment.timeline.getFirstItem()?.__button.getAttribute("aria-current"), "true");
  } finally {
    cleanup();
  }
});

test("live summary text hides visible links in the detail panel", async () => {
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

    assert.deepEqual(signal.summary, [
      "Sayt orqali ochildi.",
      "Tadqiqot e'lon qilindi.",
      "Markdown manba matni qoladi.",
    ]);
    assert.equal(signal.url, "https://example.com/news?utm=telegram");
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
