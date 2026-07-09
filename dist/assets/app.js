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
const nameDisplay = document.querySelector("[data-name-display]");
const readerGateAction = document.querySelector(".signal-reader-gate__action");
const nameModal = document.querySelector("[data-name-modal]");
const nameModalClose = document.querySelector("[data-name-modal-close]");
const libraryGateActions = Array.from(document.querySelectorAll("[data-library-gate]"));
const loadEarlierButton = document.querySelector("[data-load-earlier]");
const timelineItems = Array.from(document.querySelectorAll(".signal-timeline__item"));
const storyDataElement = document.querySelector("[data-signal-stories]");
const detailPanel = document.querySelector("[data-signal-detail]");
const detailContent = detailPanel?.querySelector("[data-signal-detail-content]");
const detailVisual = detailPanel?.querySelector("[data-signal-detail-visual]");
const pageMain = document.querySelector(".page-home");
const storyData = parseStoryData();
const storyMap = new Map(storyData.map((story) => [String(story.id), story]));
const detailDefaults = captureDetailDefaults();
let activeStoryId = null;
let activeUpdateFrame = 0;
let timelineArmed = false;
let timelineClosed = false;
let lastScrollY = window.scrollY || 0;

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
  },
  en: {
    palette: "Palette",
    save: "Saved",
    greeting: (name) => `Hello, ${name}. Your name is saved.`,
    hint: (name) => `Hello, ${name}. Saves and likes are tied to this name.`,
    reveal: "Earlier days revealed",
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
    weight: "OG'IRLIK",
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
  const sourceHref = escapeHtml(story.url ?? "#");
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
      <a class="timeline-panel__source" href="${sourceHref}"${sourceTarget}>
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
      const background = story.image ? `url("${story.image}")` : "";
      detailVisual.style.backgroundImage = background;
      detailPanel.classList.toggle("has-background-image", Boolean(background));
    }
  }
  resetDetailScroll();
  detailPanel.classList.remove("signal-detail--intro");
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

  nameForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = nameInput?.value?.trim();
    if (!value) {
      updateNameDisplay("");
      return;
    }

    storage?.setItem(storageKeys.name, value);
    storage?.removeItem(legacyStorageKeys.name);
    updateNameDisplay(value);
    if (nameDisplay) {
      nameDisplay.textContent = labelMap[locale].greeting(value);
    }
    if (nameInput) {
      nameInput.blur();
    }
    closeNameModal();
  });

  nameInput?.addEventListener("input", () => {
    updateNameDisplay(nameInput.value);
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
    const hiddenCards = document.querySelectorAll('[data-older="true"]');
    hiddenCards.forEach((card) => {
      card.hidden = false;
      card.classList.add("is-visible");
    });
    loadEarlierButton.disabled = true;
    loadEarlierButton.textContent = labelMap[locale].reveal;
    scheduleActiveStorySync();
  });
}

function initTimelineReveal() {
  if (!timelineItems.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    timelineItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
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

  timelineItems.forEach((item) => observer.observe(item));
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

  timelineItems.forEach((item) => {
    const activateItem = () => {
      const story = storyMap.get(String(item.dataset.storyId));
      if (!story) {
        return;
      }

      applyStoryToDetail(story, item, { scrollIntoView: true });
    };

    item.addEventListener("click", activateItem);
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateItem();
      }
    });
  });

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

initTheme();
initReaderGateAction();
initNameForm();
initTimelineReveal();
initLoadEarlier();
initTimelineStories();
