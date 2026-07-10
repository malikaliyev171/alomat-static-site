import assert from "node:assert/strict";
import test from "node:test";

function createElementStub() {
  return {
    hidden: false,
    dataset: {},
    style: {},
    innerHTML: "",
    textContent: "",
    value: "",
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false;
      },
    },
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
  };
}

let appImportNonce = 0;
let cachedAppHelpers;

async function loadAppHelpers() {
  if (cachedAppHelpers) {
    return cachedAppHelpers;
  }

  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousFetch = globalThis.fetch;
  const previousCustomEvent = globalThis.CustomEvent;
  const previousLocalStorage = globalThis.localStorage;
  const previousIntl = globalThis.Intl;

  const documentElement = {
    lang: "en",
    dataset: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() {
        return false;
      },
    },
  };
  const body = {
    dataset: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
    },
    appendChild() {},
  };
  const documentStub = {
    body,
    documentElement,
    querySelector() {
      return null;
    },
    querySelectorAll() {
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
    requestAnimationFrame() {
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

  globalThis.window = windowStub;
  globalThis.document = documentStub;
  globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };
  globalThis.localStorage = windowStub.localStorage;
  globalThis.Intl = Intl;

  try {
    appImportNonce += 1;
    const moduleUrl = new URL(`../app.js?test=${appImportNonce}`, import.meta.url);
    await import(moduleUrl);
    cachedAppHelpers = globalThis.__ALOMAT_APP_TEST__;
    return cachedAppHelpers;
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.fetch = previousFetch;
    globalThis.CustomEvent = previousCustomEvent;
    globalThis.localStorage = previousLocalStorage;
    globalThis.Intl = previousIntl;
    delete globalThis.__ALOMAT_APP_TEST__;
  }
}

test("client helpers keep valid http and https urls unchanged", async () => {
  const helpers = await loadAppHelpers();

  assert.equal(helpers.sanitizeStoryUrl("https://example.com/source"), "https://example.com/source");
  assert.equal(helpers.sanitizeStoryImage("http://cdn.example.com/image.jpg"), "http://cdn.example.com/image.jpg");
});

test("client helpers fall back for unsafe href and image values", async () => {
  const helpers = await loadAppHelpers();

  assert.equal(helpers.sanitizeStoryUrl("javascript:alert(1)"), "#");
  assert.equal(helpers.sanitizeStoryUrl("\u0000https://example.com/source"), "#");
  assert.equal(
    helpers.sanitizeStoryImage('https://example.com/image.jpg") ; background-image:url(javascript:alert(1))'),
    "https://safe.example/fallback.png",
  );
  assert.equal(helpers.sanitizeStoryImage("data:image/svg+xml,<svg></svg>"), "https://safe.example/fallback.png");
});

test("client background-image helper never returns raw unsafe css", async () => {
  const helpers = await loadAppHelpers();

  assert.equal(
    helpers.createBackgroundImageValue('https://example.com/image.jpg") ; background-image:url(javascript:alert(1))'),
    'url("https://safe.example/fallback.png")',
  );
  assert.equal(helpers.createBackgroundImageValue("javascript:alert(1)"), 'url("https://safe.example/fallback.png")');
});
