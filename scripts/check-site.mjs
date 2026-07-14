import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");
const distRoot = path.join(projectRoot, "dist");
const failures = [];

function fail(message) {
  failures.push(message);
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function stripUrlNoise(value) {
  return value.split("#")[0].split("?")[0];
}

function readText(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function flatLocaleRoute(localeKey, pageKey) {
  if (pageKey === "home") {
    return localeKey === "uz" ? "index.html" : `${localeKey}.html`;
  }
  return localeKey === "uz" ? `${pageKey}.html` : `${localeKey}-${pageKey}.html`;
}

function describeLocaleRoute(relativePath) {
  const normalizedPath = relativePath.split(path.sep).join("/");
  const flatMatch = /^(?:(en|tr)-)?(about|lineup)\.html$/.exec(normalizedPath);
  if (flatMatch) {
    return { localeKey: flatMatch[1] ?? "uz", pageKey: flatMatch[2], nestedPath: null, normalizedPath };
  }
  const flatHomeMatch = /^(?:(en|tr)\.)?html$/.exec(normalizedPath);
  if (normalizedPath === "index.html" || flatHomeMatch) {
    return { localeKey: flatHomeMatch?.[1] ?? "uz", pageKey: "home", nestedPath: null, normalizedPath };
  }

  const segments = normalizedPath.split("/");
  const localeKey = ["en", "tr"].includes(segments[0]) ? segments.shift() : "uz";
  const nestedPath = segments.join("/");
  const pageKey =
    nestedPath === "index.html"
      ? "home"
      : nestedPath === "about/index.html"
        ? "about"
        : nestedPath === "lineup/index.html"
          ? "lineup"
          : null;
  return { localeKey, pageKey, nestedPath, normalizedPath };
}

function equivalentLocaleHrefs(relativePath) {
  const route = describeLocaleRoute(relativePath);
  const hrefs = Object.fromEntries(
    ["en", "uz", "tr"].map((localeKey) => {
      let target;
      if (localeKey === route.localeKey) {
        target = route.normalizedPath;
      } else if (route.pageKey) {
        target = flatLocaleRoute(localeKey, route.pageKey);
      } else {
        target = localeKey === "uz" ? route.nestedPath : `${localeKey}/${route.nestedPath}`;
      }
      return [localeKey, path.posix.relative(path.posix.dirname(route.normalizedPath), target)];
    }),
  );
  return { ...route, hrefs };
}

function attributeValue(attributes, name) {
  return new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attributes)?.[1];
}

if (!fs.existsSync(distRoot)) {
  fail("dist directory is missing. Run the build before checking the site.");
} else {
  const files = walk(distRoot);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));

  if (htmlFiles.length < 38) {
    fail(`expected at least 38 generated HTML files, found ${htmlFiles.length}`);
  }

  const requiredTurkishPages = [
    "tr.html",
    "tr/index.html",
    "tr-about.html",
    "tr/about/index.html",
    "tr-lineup.html",
    "tr/lineup/index.html",
    "tr/library/index.html",
    "tr/relay/index.html",
    "tr/contact/index.html",
    "tr/sponsor/index.html",
    "tr/privacy/index.html",
    "tr/lineup/senol-dak/aida-yangi-temir-parda-fable-5-taqiqi-kimni-himoya-qiladi/index.html",
    "tr/lineup/oktay-dak/internet-endi-malumot-bermaydi-diqqatni-yutadi/index.html",
  ];

  for (const fallbackPage of [
    "en.html",
    "about.html",
    "lineup.html",
    "en-about.html",
    "en-lineup.html",
    ...requiredTurkishPages,
  ]) {
    if (!fs.existsSync(path.join(distRoot, fallbackPage))) {
      fail(`${fallbackPage} must exist as a generated locale page`);
    }
  }

  const homeHtmlPath = path.join(distRoot, "index.html");
  if (fs.existsSync(homeHtmlPath)) {
    const homeHtml = readText(homeHtmlPath);
    if (!homeHtml.includes('href="about.html"')) {
      fail("home Manifesto link must use about.html for Cloudflare upload reliability");
    }
    if (!homeHtml.includes('href="lineup.html"')) {
      fail("home Lineup link must use lineup.html for Cloudflare upload reliability");
    }
    if (!homeHtml.includes('href="en.html"')) {
      fail("home EN link must use en.html for Cloudflare upload reliability");
    }
    if (!homeHtml.includes('href="tr.html"')) {
      fail("home TR link must use tr.html for Cloudflare upload reliability");
    }
  }

  for (const file of htmlFiles) {
    const html = readText(file);
    const htmlWithoutInlineAssets = html
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, "");
    const localRefs = htmlWithoutInlineAssets.matchAll(/(?:href|src)="([^"]+)"/g);
    const relativeName = path.relative(distRoot, file);
    const expectedRoute = equivalentLocaleHrefs(relativeName);
    const documentLocaleMatch = /<html lang="([^"]+)" data-locale="([^"]+)"/.exec(htmlWithoutInlineAssets);
    const languageSwitch = /<div class="language-switch"[\s\S]*?<\/div>/.exec(htmlWithoutInlineAssets)?.[0] ?? "";
    const languageSwitchAttributes = /<div class="language-switch"([^>]*)>/.exec(languageSwitch)?.[1] ?? "";
    const localeLinks = Array.from(languageSwitch.matchAll(/<a\b([^>]*)>(EN|UZ|TR)<\/a>/g));
    const alternateLocales = Array.from(
      htmlWithoutInlineAssets.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)" \/>/g),
    );

    if (!documentLocaleMatch) {
      fail(`${relativeName} must declare matching html lang and data-locale values`);
    } else {
      const [, htmlLang, documentLocale] = documentLocaleMatch;
      if (htmlLang !== documentLocale) {
        fail(`${relativeName} html lang ${htmlLang} must match data-locale ${documentLocale}`);
      }
      if (documentLocale !== expectedRoute.localeKey) {
        fail(`${relativeName} document locale ${documentLocale} must match route locale ${expectedRoute.localeKey}`);
      }
      const expectedLabel = { en: "Language", uz: "Til", tr: "Dil" }[documentLocale];
      if (attributeValue(languageSwitchAttributes, "aria-label") !== expectedLabel) {
        fail(`${relativeName} language switch must use the ${documentLocale} label ${expectedLabel}`);
      }
    }

    if ((languageSwitch.match(/<a\b/g) ?? []).length !== 3 || localeLinks.map((match) => match[2]).join("/") !== "EN/UZ/TR") {
      fail(`${relativeName} must render exactly three locale anchors in EN / UZ / TR order`);
    }

    for (const [index, localeKey] of ["en", "uz", "tr"].entries()) {
      const attributes = localeLinks[index]?.[1] ?? "";
      const href = attributeValue(attributes, "href");
      const classes = new Set((attributeValue(attributes, "class") ?? "").split(/\s+/));
      const isDocumentLocale = localeKey === expectedRoute.localeKey;
      if (href !== expectedRoute.hrefs[localeKey]) {
        fail(`${relativeName} ${localeKey.toUpperCase()} locale href must be ${expectedRoute.hrefs[localeKey]}, found ${href ?? "none"}`);
      }
      if (isDocumentLocale) {
        if (!classes.has("is-active") || classes.has("is-inactive")) {
          fail(`${relativeName} ${localeKey.toUpperCase()} locale anchor alone must be active`);
        }
        if (attributeValue(attributes, "aria-current") !== "page") {
          fail(`${relativeName} ${localeKey.toUpperCase()} locale anchor alone must expose aria-current=page`);
        }
      } else {
        if (classes.has("is-active") || !classes.has("is-inactive")) {
          fail(`${relativeName} ${localeKey.toUpperCase()} locale anchor must be inactive`);
        }
        if (attributeValue(attributes, "aria-current") !== undefined) {
          fail(`${relativeName} ${localeKey.toUpperCase()} inactive locale anchor must not expose aria-current`);
        }
      }
    }
    if (/disabled|aria-disabled/.test(languageSwitch)) {
      fail(`${relativeName} locale anchors must not use disabled semantics`);
    }

    const expectedAlternates = [
      ["uz", expectedRoute.hrefs.uz],
      ["en", expectedRoute.hrefs.en],
      ["tr", expectedRoute.hrefs.tr],
    ];
    if (
      alternateLocales.length !== expectedAlternates.length
      || alternateLocales.some(
        (match, index) => match[1] !== expectedAlternates[index][0] || match[2] !== expectedAlternates[index][1],
      )
    ) {
      fail(`${relativeName} must emit exact equivalent uz, en, and tr hreflang hrefs`);
    }

    if (!html.includes("<style data-alomat-styles>")) {
      fail(`${path.relative(distRoot, file)} must inline the site styles for Cloudflare upload reliability`);
    }
    if (!html.includes("<script data-alomat-app>")) {
      fail(`${path.relative(distRoot, file)} must inline the site script for Cloudflare upload reliability`);
    }
    if (/rel="stylesheet"\s+href="[^"]*assets\/styles\.css/.test(html)) {
      fail(`${path.relative(distRoot, file)} must not depend on an external stylesheet`);
    }
    if (/<script\s+defer\s+src="[^"]*assets\/app\.js/.test(html)) {
      fail(`${path.relative(distRoot, file)} must not depend on an external app script`);
    }

    for (const [, rawRef] of localRefs) {
      if (
        !rawRef ||
        rawRef.startsWith("http") ||
        rawRef.startsWith("data:") ||
        rawRef.startsWith("mailto:") ||
        rawRef.startsWith("#")
      ) {
        continue;
      }

      const cleanRef = stripUrlNoise(rawRef);
      const target = cleanRef.startsWith("/")
        ? path.join(distRoot, cleanRef)
        : path.resolve(path.dirname(file), cleanRef);

      if (!fs.existsSync(target) && !fs.existsSync(path.join(target, "index.html"))) {
        fail(`${path.relative(distRoot, file)} references missing local file: ${rawRef}`);
      }
    }
  }
}

for (const relativePath of ["build.mjs", "app.js", "styles.css"]) {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`${relativePath} is missing`);
    continue;
  }

  const contents = readText(fullPath);
  if (contents.includes("https://example.com")) {
    fail(`${relativePath} still contains https://example.com`);
  }
  if (contents.includes('"/logo.png"') || contents.includes("'/logo.png'")) {
    fail(`${relativePath} still references /logo.png`);
  }
}

const stylesPath = path.join(projectRoot, "styles.css");
if (fs.existsSync(stylesPath)) {
  const styles = readText(stylesPath);
  const htmlBlock = /^html\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const bodyBlock = /body\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";
  if (!htmlBlock.includes("scrollbar-width: none;")) {
    fail("html must hide Firefox scrollbars");
  }
  if (!htmlBlock.includes("overflow-x: hidden;")) {
    fail("html must prevent horizontal overflow");
  }
  if (!htmlBlock.includes("-ms-overflow-style: none;")) {
    fail("html must hide legacy Microsoft scrollbars");
  }
  if (!/html::-webkit-scrollbar\s*\{[\s\S]*?width:\s*0;[\s\S]*?height:\s*0;[\s\S]*?\}/.test(styles)) {
    fail("html must hide WebKit scrollbars");
  }
  if (!bodyBlock.includes("background-attachment: fixed;")) {
    fail("body background gradient must stay fixed while scrolling");
  }
  if (/\.skip-link\s*\{[^}]*left:\s*-999px/s.test(styles)) {
    fail("skip-link hidden state must not create horizontal page overflow");
  }
  if (!/@media\s*\(max-width:\s*780px\)[\s\S]*\.topbar--home\s*\{[\s\S]*grid-template-columns:\s*1fr/s.test(styles)) {
    fail("home topbar must collapse to one column on mobile screens");
  }
  const frostedTopbarBackground = "background: color-mix(in srgb, var(--bg-start) 92%, transparent);";
  const topbarHomeBlock = /\.topbar--home\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";
  const lightHomeTopbarBlock =
    /html:root:is\(\[data-page="home"\], \[data-page="library"\], \[data-page="about"\], \[data-page="lineup"\], \[data-page="lineup-article"\]\)\[data-palette="2"\]\[data-theme="light"\] \.topbar,[\s\S]*?html:root:is\(\[data-page="home"\], \[data-page="library"\], \[data-page="about"\], \[data-page="lineup"\], \[data-page="lineup-article"\]\)\[data-palette="2"\]\[data-theme="light"\] \.topbar--home\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const themedHomeTopbarBlock =
    /html:root:is\(\[data-page="home"\], \[data-page="library"\], \[data-page="about"\], \[data-page="lineup"\], \[data-page="lineup-article"\]\)\[data-theme\] \.topbar,[\s\S]*?html:root:is\(\[data-page="home"\], \[data-page="library"\], \[data-page="about"\], \[data-page="lineup"\], \[data-page="lineup-article"\]\)\[data-theme\] \.topbar--home\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";

  if (!topbarHomeBlock.includes(frostedTopbarBackground)) {
    fail("base home topbar must use the frosted background fill");
  }
  if (!lightHomeTopbarBlock.includes(frostedTopbarBackground)) {
    fail("light home topbar override must use the frosted background fill");
  }
  if (!themedHomeTopbarBlock.includes(frostedTopbarBackground)) {
    fail("themed home topbar override must use the frosted background fill");
  }
  if (/\.topbar--home\s*\{[^}]*backdrop-filter:\s*none/s.test(styles)) {
    fail("home topbar must keep blur enabled for the frosted glass effect");
  }

  const timelineHeadlineButtonBlock =
    /^\.signal-timeline__headline-button\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const timelineHeadlineButtonImageBlock =
    /^\.signal-timeline__headline-button::after\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const activeTimelineHeadlineButtonImageBlock =
    /^\.signal-timeline__item\.is-active \.signal-timeline__headline-button::after\s*\{[\s\S]*?\n\}/m.exec(
      styles,
    )?.[0] ?? "";
  const timelineHeadlineTextBlock =
    /^\.signal-timeline__headline-text\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const orangeNavBulletBlock =
    /^html\[data-palette="4"\] \.nav__item--dot \.nav__bullet,[\s\S]*?\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const signalAccentBlock = /^\.signal\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  if (!signalAccentBlock.includes("color: var(--accent);")) {
    fail("inline signal accents must use the current palette accent color");
  }
  if (!orangeNavBulletBlock.includes("color: var(--text);")) {
    fail("orange palette nav dot bullets must use white text");
  }
  if (!timelineHeadlineButtonBlock.includes("border: 0.8px solid color-mix(in srgb, var(--text) 6%, transparent);")) {
    fail("timeline headline cards must use palette-aware borders");
  }
  if (!timelineHeadlineButtonBlock.includes("background: color-mix(in srgb, var(--bg) 97%, var(--text) 3%);")) {
    fail("timeline headline cards must use palette-aware backgrounds");
  }
  if (!timelineHeadlineButtonBlock.includes("box-shadow: 0 10px 30px color-mix(in srgb, var(--text) 5%, transparent);")) {
    fail("timeline headline cards must use palette-aware shadows");
  }
  if (!timelineHeadlineButtonImageBlock.includes("display: none;")) {
    fail("timeline headline story image layer must stay disabled");
  }
  if (!timelineHeadlineButtonImageBlock.includes("background-image: none;")) {
    fail("timeline headline cards must not render story images");
  }
  if (!timelineHeadlineButtonImageBlock.includes("opacity: 0;")) {
    fail("timeline headline story image layer must stay transparent");
  }
  if (!activeTimelineHeadlineButtonImageBlock.includes("opacity: 0;")) {
    fail("active timeline headline cards must not reveal story images");
  }
  if (!timelineHeadlineTextBlock.includes("color: var(--text-strong);")) {
    fail("timeline headline text must use the current palette text color");
  }

  const timelineCursorBlock = /^\.signal-timeline__cursor\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const loadEarlierBlock = /^\.signal-timeline__load-earlier\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const siteFooterTopBlock = /^\.site-footer__top\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const socialChipBlock = /^\.social-chip\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const timelinePanelButtonBlock = /^\.timeline-panel__icon-button\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const timelinePanelSourceBlock = /^\.timeline-panel__source\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const signalDetailBlock = /^\.signal-detail\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const signalDetailStoryContentBlock = /^\.signal-detail\.has-story \.signal-detail__content\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const timelinePanelTitleBlock = /^\.timeline-panel__hero h2\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const timelinePanelMetaBlock = /^\.timeline-panel__meta-grid\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const timelinePanelBodyBlock = /^\.timeline-panel__body\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const timelinePanelActionsBlock = /^\.timeline-panel__actions\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const timelinePanelIconButtonBlocks = Array.from(
    styles.matchAll(/^\.timeline-panel__icon-button\s*\{[\s\S]*?\n\}/gm),
    (match) => match[0],
  );
  const darkOrangePaletteBlock = /^body\[data-palette="0"\]\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const darkMonochromePaletteBlock = /^body\[data-palette="6"\]\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const orangePaletteBlock = /^body\[data-palette="4"\]\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const lightOrangeTextPaletteBlock = /^body\[data-palette="5"\]\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const orangeDarkTextPaletteBlock = /^body\[data-palette="7"\]\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const darkNameBackdropBlock =
    /html\[data-page="home"\]\[data-palette="0"\] \.name-auth-backdrop,[\s\S]*?html\[data-page="home"\]\[data-palette="6"\] \.name-auth-backdrop\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const darkNameModalBlock =
    /html\[data-page="home"\]\[data-palette="0"\] \.name-auth-modal,[\s\S]*?html\[data-page="home"\]\[data-palette="6"\] \.name-auth-modal\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const lineupAuthorCardBackgrounds = Array.from(
    styles.matchAll(/(?:^|})\s*([^{}]*\.lineup-author-card[^{}]*)\{([^{}]*)\}/gm),
  ).flatMap((match) => match[2].match(/background:[^;]+;/g) ?? []);
  const orangeLineupCardBlock =
    /html\[data-page="lineup"\]\[data-palette="4"\] \.lineup-card,\s*\nhtml\[data-page="lineup"\]\[data-palette="7"\] \.lineup-card\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeSignalDetailBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\]\[data-theme\] \.signal-detail,[\s\S]*?html:root\[data-page="home"\]\[data-palette="7"\]\[data-theme\] \.signal-detail\.has-story\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeTimelinePanelControlsBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.timeline-panel__icon-button,[\s\S]*?html:root\[data-page="home"\]\[data-palette="7"\] \.timeline-panel__source\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeTimelinePanelTextBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.timeline-panel__hero h2,[\s\S]*?html:root\[data-page="home"\]\[data-palette="7"\] \.signal-detail h2\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeTimelinePanelMutedTextBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.timeline-panel__meta-grid span,[\s\S]*?html:root\[data-page="home"\]\[data-palette="7"\] \.timeline-panel__lens span\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const darkMonochromeTimelinePanelTextBlock =
    /html\[data-palette="6"\] \.timeline-panel__hero h2,[\s\S]*?html\[data-palette="6"\] \.signal-detail__summary p\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const darkMonochromeTimelinePanelMutedTextBlock =
    /html\[data-palette="6"\] \.timeline-panel__meta-grid span,[\s\S]*?html\[data-palette="6"\] \.timeline-panel__lens span\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const homeDarkMonochromeTimelinePanelBodyBlock =
    /html\[data-page="home"\]\[data-palette="6"\] \.timeline-panel__body,[\s\S]*?html\[data-page="home"\]\[data-palette="6"\] \.timeline-panel__body p\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeTextTimelinePanelTextBlock =
    /html\[data-palette="5"\] \.timeline-panel__hero h2,[\s\S]*?html\[data-palette="0"\] \.signal-detail__summary p\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeTextTimelinePanelMutedTextBlock =
    /html\[data-palette="5"\] \.timeline-panel__meta-grid span,[\s\S]*?html\[data-palette="0"\] \.timeline-panel__lens span\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const homeOrangeTextTimelinePanelBodyBlock =
    /html\[data-page="home"\]\[data-palette="5"\] \.timeline-panel__body,[\s\S]*?html\[data-page="home"\]\[data-palette="0"\] \.timeline-panel__body p\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeSignalDetailActionBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.signal-detail__action,[\s\S]*?html:root\[data-page="home"\]\[data-palette="7"\] \.signal-detail__action\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeNameModalTextBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.name-auth-modal__kicker,[\s\S]*?html:root\[data-page="home"\]\[data-palette="4"\] \.name-auth-input\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeNameModalBlock =
    /html\[data-page="home"\]\[data-palette="4"\] \.name-auth-modal,[\s\S]*?html\[data-page="home"\]\[data-palette="7"\] \.name-auth-modal\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";
  const orangeNameBackdropBlock =
    /html\[data-page="home"\]\[data-palette="4"\] \.name-auth-backdrop,[\s\S]*?html\[data-page="home"\]\[data-palette="7"\] \.name-auth-backdrop\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";
  const orangeNameInputBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.name-auth-input,[\s\S]*?html:root\[data-page="home"\]\[data-palette="7"\] \.name-auth-input\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";
  const themedHomeSocialChipBlock =
    /html:root:is\(\[data-page="home"\], \[data-page="library"\], \[data-page="about"\], \[data-page="lineup"\]\)\[data-palette\]\[data-theme\] \.social-chip\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";
  const themedHomePanelControlsBlock =
    /html:root\[data-page="home"\]\[data-palette\]\[data-theme\] \.signal-detail__action,[\s\S]*?html:root\[data-page="home"\]\[data-palette\]\[data-theme\] \.timeline-panel__source\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const mobileDetailActionsBlock =
    /\.signal-detail \.timeline-panel__actions,\s*\n\s*\.signal-detail__actions--intro\s*\{[\s\S]*?\n\s*\}/.exec(styles)?.[0] ?? "";
  const paletteFourSelectorGroups = Array.from(styles.matchAll(/(^|})\s*([^{}]*\[data-palette="4"\][^{}]*)\s*\{/g))
    .map((match) => match[2].trim())
    .filter((selectorGroup) => !selectorGroup.includes(":root[data-palette=\"4\"]") && !selectorGroup.includes("body[data-palette=\"4\"]"));

  if (!darkOrangePaletteBlock.includes("--text: #ff4d32;")) {
    fail("dark orange palette must keep orange text");
  }
  if (!darkOrangePaletteBlock.includes("--muted: rgba(255, 77, 50, 0.72);")) {
    fail("dark orange palette muted text must stay orange");
  }
  if (!darkOrangePaletteBlock.includes("--border: rgba(255, 77, 50, 0.18);")) {
    fail("dark orange palette border must stay orange");
  }
  if (!darkMonochromePaletteBlock.includes("--text: #f2f3f5;")) {
    fail("dark monochrome palette must use white text");
  }
  if (!darkMonochromePaletteBlock.includes("--accent: #ff4d32;")) {
    fail("dark monochrome palette must keep orange accent");
  }
  if (!darkMonochromePaletteBlock.includes("--surface-soft: rgba(255, 255, 255, 0.06);")) {
    fail("dark monochrome palette must use neutral soft surfaces");
  }
  if (!darkNameBackdropBlock.includes("background: rgba(0, 0, 0, 0.58);")) {
    fail("dark palettes must share the dark name modal backdrop");
  }
  if (!darkNameModalBlock.includes("background: color-mix(in srgb, var(--bg-end) 92%, transparent);")) {
    fail("dark palettes must share the dark name modal surface");
  }
  if (!orangePaletteBlock.includes("--text: #fff5f0;")) {
    fail("orange palette must use white text");
  }
  if (!orangePaletteBlock.includes("--muted: rgba(255, 245, 240, 0.72);")) {
    fail("orange palette muted text must stay light");
  }
  if (!orangePaletteBlock.includes("--border: rgba(255, 255, 255, 0.2);")) {
    fail("orange palette borders must stay light");
  }
  if (!lightOrangeTextPaletteBlock.includes("--bg: #efeff2;")) {
    fail("light orange-text palette must use the pale background");
  }
  if (!lightOrangeTextPaletteBlock.includes("--text: #ff4d32;")) {
    fail("light orange-text palette must use orange text");
  }
  if (!lightOrangeTextPaletteBlock.includes("--muted: rgba(255, 77, 50, 0.72);")) {
    fail("light orange-text palette muted text must stay orange");
  }
  if (!lightOrangeTextPaletteBlock.includes("--border: rgba(255, 77, 50, 0.18);")) {
    fail("light orange-text palette borders must stay orange");
  }
  if (!orangeDarkTextPaletteBlock.includes("--bg: #ff4d32;")) {
    fail("dark-text orange palette must use the signal orange background");
  }
  if (!orangeDarkTextPaletteBlock.includes("--text: #05070d;")) {
    fail("dark-text orange palette must use dark text");
  }
  if (!orangeDarkTextPaletteBlock.includes("--muted: rgba(5, 7, 13, 0.72);")) {
    fail("dark-text orange palette muted text must stay dark");
  }
  if (!orangeDarkTextPaletteBlock.includes("--border: rgba(5, 7, 13, 0.2);")) {
    fail("dark-text orange palette borders must stay dark");
  }
  for (const selectorGroup of paletteFourSelectorGroups) {
    if (!selectorGroup.includes('[data-palette="7"]')) {
      fail(`palette 4 selector group must also include palette 7: ${selectorGroup.split("\n")[0]}`);
    }
  }
  if (!timelineCursorBlock.includes("background: #05070d;")) {
    fail("timeline cursor must remain black across palettes");
  }
  if (!timelineCursorBlock.includes("border: 2px solid color-mix(in srgb, var(--bg) 88%, transparent);")) {
    fail("timeline cursor must use a palette-aware border");
  }
  if (!timelineCursorBlock.includes("0 0 0 5px color-mix(in srgb, var(--bg) 86%, transparent)")) {
    fail("timeline cursor must use a palette-aware inner ring");
  }
  if (!timelineCursorBlock.includes("0 0 0 6px color-mix(in srgb, var(--text) 28%, transparent)")) {
    fail("timeline cursor must use a palette-aware outer ring");
  }
  if (!loadEarlierBlock.includes("background: color-mix(in srgb, var(--bg) 62%, transparent);")) {
    fail("timeline load-earlier button must use a palette-aware background");
  }
  if (!orangeSignalDetailBlock.includes("color-mix(in srgb, var(--accent-soft) 45%, transparent), transparent 48%")) {
    fail("orange home signal detail must use the requested orange accent wash");
  }
  if (!orangeSignalDetailBlock.includes("color-mix(in srgb, var(--bg-start) 90%, transparent) 0%")) {
    fail("orange home signal detail must start from the orange palette");
  }
  if (!orangeSignalDetailBlock.includes("color-mix(in srgb, var(--bg-end) 92%, transparent) 100%")) {
    fail("orange home signal detail must end in the orange palette");
  }
  if (!siteFooterTopBlock.includes("background: color-mix(in srgb, var(--bg) 72%, transparent);")) {
    fail("footer discovery card must use a palette-aware background");
  }
  if (!siteFooterTopBlock.includes("box-shadow: 0 18px 42px color-mix(in srgb, var(--text) 5%, transparent);")) {
    fail("footer discovery card must use a palette-aware shadow");
  }
  if (!socialChipBlock.includes("background: color-mix(in srgb, var(--bg) 62%, transparent);")) {
    fail("footer social chips must use palette-aware backgrounds");
  }
  if (!socialChipBlock.includes("box-shadow: 0 10px 18px color-mix(in srgb, var(--text) 4%, transparent);")) {
    fail("footer social chips must use palette-aware shadows");
  }
  if (!themedHomeSocialChipBlock.includes("background: color-mix(in srgb, var(--bg) 62%, transparent);")) {
    fail("home themed social chips must use palette-aware backgrounds");
  }
  if (!orangeLineupCardBlock.includes("background: color-mix(in srgb, var(--bg) 70%, transparent);")) {
    fail("orange lineup cards must use a palette-aware surface");
  }
  if (!lineupAuthorCardBackgrounds.includes("background: transparent;")) {
    fail("lineup article author card must reveal the page background");
  }
  if (lineupAuthorCardBackgrounds.some((background) => background !== "background: transparent;")) {
    fail("lineup article author card must not use a separate surface color");
  }
  if (!orangeTimelinePanelControlsBlock.includes("background: color-mix(in srgb, var(--text) 12%, transparent);")) {
    fail("orange timeline panel controls must use translucent white backgrounds");
  }
  if (!orangeTimelinePanelControlsBlock.includes("border-color: color-mix(in srgb, var(--text) 34%, transparent);")) {
    fail("orange timeline panel controls must use white borders");
  }
  if (!orangeTimelinePanelControlsBlock.includes("color: var(--text);")) {
    fail("orange timeline panel controls must use white text");
  }
  if (!orangeTimelinePanelTextBlock.includes("color: var(--text);")) {
    fail("orange timeline panel main text must be white");
  }
  if (!orangeTimelinePanelMutedTextBlock.includes("color: color-mix(in srgb, var(--text) 66%, transparent);")) {
    fail("orange timeline panel muted text must use translucent white");
  }
  if (!darkMonochromeTimelinePanelTextBlock.includes("color: var(--text);")) {
    fail("dark monochrome timeline panel text must use palette text");
  }
  if (darkMonochromeTimelinePanelTextBlock.includes('html[data-palette="5"]')) {
    fail("dark monochrome timeline panel text block must stay palette-6 only");
  }
  if (
    !darkMonochromeTimelinePanelMutedTextBlock.includes(
      "color: color-mix(in srgb, var(--text) 66%, transparent);",
    )
  ) {
    fail("dark monochrome timeline panel muted text must use translucent palette text");
  }
  if (darkMonochromeTimelinePanelMutedTextBlock.includes('html[data-palette="5"]')) {
    fail("dark monochrome timeline panel muted text block must stay palette-6 only");
  }
  if (!homeDarkMonochromeTimelinePanelBodyBlock.includes("color: var(--text);")) {
    fail("home dark monochrome timeline body text must override inline dark text");
  }
  if (homeDarkMonochromeTimelinePanelBodyBlock.includes('html[data-page="home"][data-palette="5"]')) {
    fail("home dark monochrome timeline body block must stay palette-6 only");
  }
  if (!orangeTextTimelinePanelTextBlock.includes("color: var(--text);")) {
    fail("palette 5 and 0 timeline panel text must use palette text");
  }
  if (!orangeTextTimelinePanelTextBlock.includes('html[data-palette="0"] .timeline-panel__hero h2')) {
    fail("palette 0 timeline panel text must share the orange text override");
  }
  if (
    !orangeTextTimelinePanelMutedTextBlock.includes(
      "color: color-mix(in srgb, var(--text) 66%, transparent);",
    )
  ) {
    fail("palette 5 and 0 timeline panel muted text must use translucent palette text");
  }
  if (!orangeTextTimelinePanelMutedTextBlock.includes('html[data-palette="0"] .timeline-panel__meta-grid span')) {
    fail("palette 0 timeline panel muted text must share the orange text override");
  }
  if (!homeOrangeTextTimelinePanelBodyBlock.includes("color: var(--text);")) {
    fail("home palette 5 and 0 timeline body text must override inline dark text");
  }
  if (!homeOrangeTextTimelinePanelBodyBlock.includes('html[data-page="home"][data-palette="0"] .timeline-panel__body')) {
    fail("home palette 0 timeline body text must share the orange text override");
  }
  if (!orangeSignalDetailActionBlock.includes("background: color-mix(in srgb, var(--text) 10%, transparent);")) {
    fail("orange signal detail action must use a translucent white background");
  }
  if (!orangeSignalDetailActionBlock.includes("border-color: color-mix(in srgb, var(--text) 30%, transparent);")) {
    fail("orange signal detail action must use a white border");
  }
  if (!orangeSignalDetailActionBlock.includes("color: var(--text);")) {
    fail("orange signal detail action must use white text");
  }
  if (!orangeNameModalBlock.includes("border-color: color-mix(in srgb, var(--text) 24%, transparent);")) {
    fail("orange name modal must use a brighter white border");
  }
  if (!orangeNameModalBlock.includes("background: color-mix(in srgb, var(--bg-start) 95%, transparent);")) {
    fail("orange name modal must use an orange surface");
  }
  if (!orangeNameBackdropBlock.includes("background: rgba(5, 7, 13, 0.5);")) {
    fail("orange name modal backdrop must use a dark scrim");
  }
  if (orangeNameModalTextBlock.includes("color: #12141a;")) {
    fail("orange name modal text must not be forced dark");
  }
  if (!orangeNameInputBlock.includes("background: color-mix(in srgb, var(--text) 10%, transparent);")) {
    fail("orange name modal input must use a translucent white background");
  }
  if (!orangeNameInputBlock.includes("border-color: color-mix(in srgb, var(--text) 45%, transparent);")) {
    fail("orange name modal input must use a white border");
  }
  if (!orangeNameInputBlock.includes("color: var(--text);")) {
    fail("orange name modal input must use white text");
  }
  if (!timelinePanelButtonBlock.includes("border: 1px solid color-mix(in srgb, var(--text) 13%, transparent);")) {
    fail("timeline panel icon buttons must use palette-aware borders");
  }
  if (!timelinePanelButtonBlock.includes("background: color-mix(in srgb, var(--surface-strong) 82%, transparent);")) {
    fail("timeline panel icon buttons must use palette-aware backgrounds");
  }
  if (!timelinePanelButtonBlock.includes("color: var(--text);")) {
    fail("timeline panel icon buttons must use palette text");
  }
  if (!timelinePanelButtonBlock.includes("box-shadow: 0 10px 18px color-mix(in srgb, var(--text) 4%, transparent);")) {
    fail("timeline panel icon buttons must use palette-aware shadows");
  }
  if (!timelinePanelSourceBlock.includes("border: 1px solid color-mix(in srgb, var(--text) 13%, transparent);")) {
    fail("timeline panel source button must use a palette-aware border");
  }
  if (!timelinePanelSourceBlock.includes("background: color-mix(in srgb, var(--surface-strong) 82%, transparent);")) {
    fail("timeline panel source button must use a palette-aware background");
  }
  if (!timelinePanelSourceBlock.includes("color: var(--text);")) {
    fail("timeline panel source button must use palette text");
  }
  if (!themedHomePanelControlsBlock.includes("background: transparent;")) {
    fail("home detail panel controls must reveal the detail panel surface");
  }
  if (themedHomePanelControlsBlock.includes("background: color-mix(in srgb, var(--bg)")) {
    fail("home detail panel controls must not reuse the page background");
  }
  if (!mobileDetailActionsBlock.includes("background: transparent;")) {
    fail("mobile detail actions must reveal the detail panel surface");
  }
  if (mobileDetailActionsBlock.includes("background: color-mix(in srgb, var(--bg)")) {
    fail("mobile detail actions must not reuse the page background");
  }
  if (!signalDetailBlock.includes("width: var(--home-detail-width, 420px);")) {
    fail("desktop signal detail panel must use the responsive reading width token");
  }
  if (!signalDetailBlock.includes("height: var(--home-detail-height, min(946px, calc(100vh - 128px)));")) {
    fail("desktop signal detail panel must use the responsive viewport height token");
  }
  if (!signalDetailStoryContentBlock.includes("grid-template-rows: auto auto auto minmax(0, 1fr) auto auto;")) {
    fail("story detail content must reserve a flexible row for the explanation");
  }
  if (!signalDetailStoryContentBlock.includes("overflow-y: hidden;")) {
    fail("story detail content must keep scrolling inside the explanation row");
  }
  if (!timelinePanelTitleBlock.includes("margin: 6px 0 0;")) {
    fail("detail title must sit close to the active signal label");
  }
  if (!timelinePanelTitleBlock.includes("font-size: 1.18rem;")) {
    fail("detail title must use the compact reference-inspired size");
  }
  if (!timelinePanelMetaBlock.includes("margin: 8px 0 0;")) {
    fail("detail metadata must sit close to the title");
  }
  if (!timelinePanelBodyBlock.includes("min-height: 0;")) {
    fail("detail explanation must be allowed to shrink inside the panel grid");
  }
  if (!timelinePanelBodyBlock.includes("max-height: none;")) {
    fail("detail explanation height must be controlled by the panel grid");
  }
  if (!timelinePanelBodyBlock.includes("scrollbar-width: thin;")) {
    fail("detail explanation must use a panel-appropriate thin scrollbar");
  }
  if (!timelinePanelActionsBlock.includes("margin-top: 8px;")) {
    fail("detail action row must use compact spacing");
  }
  if (
    !timelinePanelIconButtonBlocks.some(
      (block) => block.includes("width: 36px;") && block.includes("height: 36px;"),
    )
  ) {
    fail("detail action icon buttons must use the compact 36px size");
  }
  if (!styles.includes("--home-rail-left: clamp(") || !styles.includes("--home-detail-width: clamp(")) {
    fail("home timeline and detail panel must expose responsive layout tokens");
  }
  if (!timelineHeadlineButtonBlock.includes("left: var(--home-card-left")) {
    fail("desktop timeline cards must use the responsive home card position");
  }
  if (!timelineHeadlineButtonBlock.includes("--timeline-widget-width, 500px")) {
    fail("desktop timeline cards must use the responsive home card width token");
  }
  if (!signalDetailBlock.includes("width: var(--home-detail-width")) {
    fail("home signal detail panel must use the responsive reading width token");
  }
  if (
    !styles.includes(
      ".signal-detail.has-story .signal-detail__content {\n    display: flex;\n    overflow-y: auto;\n  }",
    )
  ) {
    fail("mobile story detail content must return to a scrollable vertical flow");
  }
  if (!styles.includes("transform: translateY(calc(100% + 28px));")) {
    fail("mobile detail panel must hide below the viewport when closed");
  }
  if (
    !styles.includes(
      ".page-home.has-detail-open .signal-detail {\n    max-height: 62vh;\n    transform: translateY(0);\n    pointer-events: auto;\n  }",
    )
  ) {
    fail("mobile detail panel must slide back into view when a story is open");
  }
  if (
    !styles.includes(
      ".signal-detail.has-story .timeline-panel__close {\n    display: grid;\n    z-index: 4;\n  }",
    )
  ) {
    fail("mobile story sheet must expose a tappable close button");
  }
}

const buildPath = path.join(projectRoot, "build.mjs");
if (fs.existsSync(buildPath)) {
  const build = readText(buildPath);
  if (!build.includes("data-signal-timeline-items")) {
    fail("home timeline must expose a container hook for live signal replacement");
  }
  if (!build.includes("data-signal-status-time") || !build.includes("data-signal-status-count")) {
    fail("home topbar must expose status hooks for the latest signal time and today's count");
  }
  if (!build.includes("data-name-auth-status")) {
    fail("name auth modal must expose a status hook for local email save feedback");
  }
  if (!build.includes("__ALOMAT_SIGNALS_API_BASE__")) {
    fail("build output must expose the configurable signals API base URL");
  }
  if (!build.includes("width: var(--home-detail-width, 420px);")) {
    fail("home signal detail inline width must use the responsive reading width token");
  }
  if (!build.includes("height: var(--home-detail-height, min(946px, calc(100vh - 128px)));")) {
    fail("home signal detail inline height must use the responsive viewport fit token");
  }
  if (!build.includes("data-timeline-route-svg") || !build.includes("data-timeline-cursor")) {
    fail("home timeline must render one SVG route and one scroll cursor");
  }
  if (build.includes('class="signal-timeline__node"')) {
    fail("home timeline must not render one node per card");
  }
  if (
    !build.includes(
      'html[data-page="home"] .signal-detail.has-story .signal-detail__content {\n          display: flex;\n          overflow-y: auto;\n        }',
    )
  ) {
    fail("home mobile inline styles must keep story content scrollable");
  }
  if (!build.includes("transform: translateY(calc(100% + 28px));")) {
    fail("home mobile inline styles must hide the closed detail sheet");
  }
  if (
    !build.includes(
      "html[data-page=\"home\"] .page-home.has-detail-open .signal-detail {\n          max-height: 62vh;\n          transform: translateY(0);\n          pointer-events: auto;\n        }",
    )
  ) {
    fail("home mobile inline styles must reveal the sheet when a story is open");
  }
  if (!build.includes('allowed=["0","2","4","5","6","7"]')) {
    fail("theme boot script must allow derived palettes");
  }
  if (!build.includes('{0:"dark",2:"light",4:"signal",5:"light",6:"dark",7:"signal"}')) {
    fail("theme boot script must map derived palettes to their themes");
  }
}

const appPath = path.join(projectRoot, "app.js");
if (fs.existsSync(appPath)) {
  const app = readText(appPath);
  if (!app.includes("function loadLiveSignals(")) {
    fail("app.js must load live signals from the API");
  }
  if (!app.includes("function replaceTimelineStories(")) {
    fail("app.js must replace fallback timeline cards with live cards");
  }
  if (app.includes("/api/auth/request-code") || app.includes("/api/auth/verify-code")) {
    fail("app.js must store reader details without requesting auth codes");
  }
  if (!app.includes("Mail saqlap qolindi")) {
    fail("app.js must show the local email saved confirmation");
  }
  if (!app.includes("storyMap = new Map(storyData.map((story) => [String(story.id), story]));")) {
    fail("live timeline replacement must rebuild the detail-panel story map");
  }
  if (!app.includes("bindTimelineItemEvents();")) {
    fail("live timeline replacement must bind click events for right-panel updates");
  }
  if (!app.includes('const paletteOrder = ["0", "2", "4", "5", "6", "7"];')) {
    fail("app palette order must include derived palettes");
  }
  if (!app.includes('6: "dark"')) {
    fail("app palette theme map must include dark monochrome");
  }
  if (!app.includes('7: "signal"')) {
    fail("app palette theme map must include dark-text orange");
  }
  if (!app.includes('5: "light"')) {
    fail("app palette theme map must include light orange-text");
  }
  if (!app.includes('6: { bg: "#05070d", fg: "#efeff2" }')) {
    fail("app palette swatches must include dark monochrome");
  }
  if (!app.includes('7: { bg: "#ff4d32", fg: "#05070d" }')) {
    fail("app palette swatches must include dark-text orange");
  }
  if (!app.includes('5: { bg: "#efeff2", fg: "#ff4d32" }')) {
    fail("app palette swatches must include light orange-text");
  }
  const themeLabelsBlock = /const themeLabels = \{[\s\S]*?\}\[locale\];/.exec(app)?.[0] ?? "";
  if (!/uz: \{[^}]*5: "3\. palet"[^}]*7: "1\. palet"/.test(themeLabelsBlock)) {
    fail("app Uzbek palette labels must include both derived signal palettes");
  }
  if (!/en: \{[^}]*5: "Palette 3"[^}]*7: "Palette 1"/.test(themeLabelsBlock)) {
    fail("app English palette labels must include both derived signal palettes");
  }
  if (!/tr: \{[^}]*5: "Palet 3"[^}]*7: "Palet 1"/.test(themeLabelsBlock)) {
    fail("app Turkish palette labels must include both derived signal palettes");
  }
  if (!/function pickPalette\(value\)\s*\{[\s\S]*?target = current === "2" \? "6" : "2";[\s\S]*?setPalette\(target\);[\s\S]*?\}/.test(app)) {
    fail("monochrome swatch must toggle between light and dark monochrome");
  }
  if (!/function pickPalette\(value\)\s*\{[\s\S]*?target = current === "0" \? "7" : "0";[\s\S]*?setPalette\(target\);[\s\S]*?\}/.test(app)) {
    fail("black-orange swatch must toggle between dark and dark-text signal");
  }
  if (!/function pickPalette\(value\)\s*\{[\s\S]*?target = current === "4" \? "5" : "4";[\s\S]*?setPalette\(target\);[\s\S]*?\}/.test(app)) {
    fail("orange swatch must toggle between signal and light orange-text");
  }
  if (!app.includes('themeLabels[nextPalette] || themeLabels["2"]')) {
    fail("palette button titles must fall back for derived palettes");
  }
  if (!app.includes('option.dataset.paletteOption === nextPalette || (option.dataset.paletteOption === "2" && nextPalette === "6") || (option.dataset.paletteOption === "0" && nextPalette === "7") || (option.dataset.paletteOption === "4" && nextPalette === "5")')) {
    fail("derived palettes must keep their source swatches active");
  }
  if (app.includes("setPalette(option.dataset.paletteOption);")) {
    fail("palette option handlers must route through pickPalette");
  }
  if (!app.includes('detailPanel.classList.add("has-story");')) {
    fail("opening a timeline story must enable the story detail layout");
  }
  if (!app.includes('detailPanel?.classList.remove("has-story");')) {
    fail("resetting the detail panel must restore the intro layout");
  }
  if (!/function openNameModal\(\)\s*\{[\s\S]*?resetDetailPanel\(\);\s*\n\s*nameModal\.hidden = false;/.test(app)) {
    fail("opening the name modal must reset the detail panel before showing the modal");
  }
}

const previewServerPath = path.join(projectRoot, "preview-server.cjs");
if (!fs.existsSync(previewServerPath)) {
  fail("preview-server.cjs is missing");
} else {
  const previewServer = readText(previewServerPath);
  if (!previewServer.includes("process.env.PORT")) {
    fail("preview-server.cjs must support PORT so preview can avoid occupied ports");
  }
}

for (const relativePath of [
  "worker/src/index.js",
  "worker/src/signals.js",
  "worker/migrations/0001_create_signals.sql",
  "worker/migrations/0002_create_auth_codes.sql",
  "worker/wrangler.toml",
]) {
  if (!fs.existsSync(path.join(projectRoot, relativePath))) {
    fail(`${relativePath} is missing`);
  }
}

if (failures.length) {
  console.error("Site readiness check failed:");
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exitCode = 1;
} else {
  console.log("Site readiness check passed.");
}
