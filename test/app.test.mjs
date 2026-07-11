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

function createTimelineEnvironment(stories) {
  const state = {
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
    getFirstItem() {
      return state.items[0] ?? null;
    },
    getItems() {
      return [...state.items];
    },
  };
}

function createAppEnvironment({ stories, fetchImpl }) {
  const timeline = createTimelineEnvironment(stories);
  const storyDataElement = { textContent: JSON.stringify(stories) };
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
    lang: "en",
    dataset: {},
    classList: createClassList(),
  };
  const body = {
    dataset: {},
    classList: createClassList(),
    appendChild() {},
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
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
    Intl,
  };

  return {
    detailContent,
    detailPanel,
    detailVisual,
    loadEarlierButton,
    pageMain,
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
  const { environment, helpers, cleanup } = await loadAppModule({ stories: fallbackStories });
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

    assert.match(requestedUrl, /[?&]limit=50\b/);
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
  const { environment, helpers, cleanup } = await loadAppModule({ stories: fallbackStories });
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
    assert.equal(environment.loadEarlierButton.disabled, false);

    environment.loadEarlierButton.click();

    assert.deepEqual(environment.timeline.getTitles(), [
      "Today signal",
      "Yesterday signal",
      "Second yesterday signal",
      "Two days ago signal",
    ]);
    assert.equal(environment.loadEarlierButton.disabled, true);
  } finally {
    cleanup();
  }
});
