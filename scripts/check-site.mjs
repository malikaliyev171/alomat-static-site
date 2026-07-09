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

if (!fs.existsSync(distRoot)) {
  fail("dist directory is missing. Run the build before checking the site.");
} else {
  const files = walk(distRoot);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));

  if (htmlFiles.length < 20) {
    fail(`expected at least 20 generated HTML files, found ${htmlFiles.length}`);
  }

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const localRefs = html.matchAll(/(?:href|src)="([^"]+)"/g);

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

  const contents = fs.readFileSync(fullPath, "utf8");
  if (contents.includes("https://example.com")) {
    fail(`${relativePath} still contains https://example.com`);
  }
  if (contents.includes('"/logo.png"') || contents.includes("'/logo.png'")) {
    fail(`${relativePath} still references /logo.png`);
  }
}

const stylesPath = path.join(projectRoot, "styles.css");
if (fs.existsSync(stylesPath)) {
  const styles = fs.readFileSync(stylesPath, "utf8");
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
    /html:root\[data-page="home"\]\[data-palette="2"\]\[data-theme="light"\] \.topbar,[\s\S]*?html:root\[data-page="home"\]\[data-palette="2"\]\[data-theme="light"\] \.topbar--home\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const themedHomeTopbarBlock =
    /html:root\[data-page="home"\]\[data-theme\] \.topbar,[\s\S]*?html:root\[data-page="home"\]\[data-theme\] \.topbar--home\s*\{[\s\S]*?\n\}/.exec(
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
    /^html\[data-palette="4"\] \.nav__item--dot \.nav__bullet\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
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
  if (!timelineHeadlineButtonBlock.includes("background: color-mix(in srgb, var(--bg) 62%, transparent);")) {
    fail("timeline headline cards must use palette-aware backgrounds");
  }
  if (!timelineHeadlineButtonBlock.includes("box-shadow: 0 10px 30px color-mix(in srgb, var(--text) 5%, transparent);")) {
    fail("timeline headline cards must use palette-aware shadows");
  }
  if (!timelineHeadlineButtonImageBlock.includes('content: "";')) {
    fail("timeline headline cards must render a story image layer");
  }
  if (!timelineHeadlineButtonImageBlock.includes("background-image: var(--signal-story-image);")) {
    fail("timeline headline story image layer must use the story image variable");
  }
  if (!timelineHeadlineButtonImageBlock.includes("opacity: var(--timeline-widget-image-opacity, 0);")) {
    fail("timeline headline story image layer must use the inactive image opacity token");
  }
  if (!timelineHeadlineButtonImageBlock.includes("z-index: 0;")) {
    fail("timeline headline story image layer must sit behind the text");
  }
  if (!activeTimelineHeadlineButtonImageBlock.includes("opacity: var(--timeline-widget-active-image-opacity, 0);")) {
    fail("active timeline headline cards must reveal the story image layer");
  }
  if (!timelineHeadlineTextBlock.includes("color: var(--text-strong);")) {
    fail("timeline headline text must use the current palette text color");
  }

  const timelineNodeBlock = /^\.signal-timeline__node\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const loadEarlierBlock = /^\.signal-timeline__load-earlier\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const siteFooterTopBlock = /^\.site-footer__top\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const socialChipBlock = /^\.social-chip\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const timelinePanelButtonBlock =
    /^\.timeline-panel__lens-button,\s*\n\.timeline-panel__icon-button\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const timelinePanelSourceBlock = /^\.timeline-panel__source\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const darkOrangePaletteBlock = /^body\[data-palette="0"\]\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const darkMonochromePaletteBlock = /^body\[data-palette="6"\]\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const orangePaletteBlock = /^body\[data-palette="4"\]\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const darkNameBackdropBlock =
    /html\[data-page="home"\]\[data-palette="0"\] \.name-auth-backdrop,[\s\S]*?html\[data-page="home"\]\[data-palette="6"\] \.name-auth-backdrop\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const darkNameModalBlock =
    /html\[data-page="home"\]\[data-palette="0"\] \.name-auth-modal,[\s\S]*?html\[data-page="home"\]\[data-palette="6"\] \.name-auth-modal\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeLineupCardBlock =
    /html\[data-page="lineup"\]\[data-palette="4"\] \.lineup-card,[\s\S]*?html\[data-page="lineup-article"\]\[data-palette="4"\] \.lineup-author-card\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeSignalDetailBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\]\[data-theme\] \.signal-detail,[\s\S]*?html:root\[data-page="home"\]\[data-palette="4"\]\[data-theme\] \.signal-detail\.has-story\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeTimelinePanelControlsBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.timeline-panel__lens-button,[\s\S]*?html:root\[data-page="home"\]\[data-palette="4"\] \.timeline-panel__source\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeTimelinePanelTextBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.timeline-panel__hero h2,[\s\S]*?html:root\[data-page="home"\]\[data-palette="4"\] \.signal-detail h2\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeTimelinePanelMutedTextBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.timeline-panel__meta-grid span,[\s\S]*?html:root\[data-page="home"\]\[data-palette="4"\] \.timeline-panel__lens span\s*\{[\s\S]*?\n\}/.exec(
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
  const orangeSignalDetailActionBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.signal-detail__action\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeNameModalTextBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.name-auth-modal__kicker,[\s\S]*?html:root\[data-page="home"\]\[data-palette="4"\] \.name-auth-input\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeNameModalBlock =
    /html\[data-page="home"\]\[data-palette="4"\] \.name-auth-modal\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";
  const orangeNameBackdropBlock =
    /html\[data-page="home"\]\[data-palette="4"\] \.name-auth-backdrop\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";
  const orangeNameInputBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\] \.name-auth-input\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";
  const themedHomeSocialChipBlock =
    /html:root\[data-page="home"\]\[data-palette\]\[data-theme\] \.social-chip\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";

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
  if (!timelineNodeBlock.includes("background: color-mix(in srgb, var(--text) 90%, transparent);")) {
    fail("timeline nodes must use the active palette text color");
  }
  if (!timelineNodeBlock.includes("border: 0.8px solid color-mix(in srgb, var(--bg) 80%, transparent);")) {
    fail("timeline nodes must use palette-aware borders");
  }
  if (!timelineNodeBlock.includes("0 0 0 8px color-mix(in srgb, var(--bg) 80%, transparent)")) {
    fail("timeline nodes must use palette-aware outer rings");
  }
  if (!timelineNodeBlock.includes("0 0 34px color-mix(in srgb, var(--text) 22%, transparent)")) {
    fail("timeline nodes must use palette-aware glow");
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
    fail("orange lineup cards and author cards must use a palette-aware surface");
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
    fail("dark monochrome timeline panel text must use white text");
  }
  if (
    !darkMonochromeTimelinePanelMutedTextBlock.includes(
      "color: color-mix(in srgb, var(--text) 66%, transparent);",
    )
  ) {
    fail("dark monochrome timeline panel muted text must use translucent white");
  }
  if (!homeDarkMonochromeTimelinePanelBodyBlock.includes("color: var(--text);")) {
    fail("home dark monochrome timeline body text must override inline dark text");
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
}

const buildPath = path.join(projectRoot, "build.mjs");
if (fs.existsSync(buildPath)) {
  const build = fs.readFileSync(buildPath, "utf8");
  if (build.includes("height: min(926px, calc(100vh - 118px));")) {
    fail("home signal detail inline height must leave bottom breathing room");
  }
  if (!build.includes("height: min(926px, calc(100vh - 154px));")) {
    fail("home signal detail inline height must use the 154px viewport offset");
  }
  if (!build.includes('allowed=["0","2","4","6"]')) {
    fail("theme boot script must allow the dark monochrome palette");
  }
  if (!build.includes('{0:"dark",2:"light",4:"signal",6:"dark"}')) {
    fail("theme boot script must map dark monochrome to dark theme");
  }
}

const appPath = path.join(projectRoot, "app.js");
if (fs.existsSync(appPath)) {
  const app = fs.readFileSync(appPath, "utf8");
  if (!app.includes('const paletteOrder = ["0", "2", "4", "6"];')) {
    fail("app palette order must include dark monochrome");
  }
  if (!app.includes('6: "dark"')) {
    fail("app palette theme map must include dark monochrome");
  }
  if (!app.includes('6: { bg: "#05070d", fg: "#efeff2" }')) {
    fail("app palette swatches must include dark monochrome");
  }
  if (!/function pickPalette\(value\)\s*\{[\s\S]*?target = current === "2" \? "6" : "2";[\s\S]*?setPalette\(target\);[\s\S]*?\}/.test(app)) {
    fail("monochrome swatch must toggle between light and dark monochrome");
  }
  if (!app.includes('themeLabels[nextPalette] || themeLabels["2"]')) {
    fail("palette button titles must fall back for derived palettes");
  }
  if (!app.includes('option.dataset.paletteOption === nextPalette || (option.dataset.paletteOption === "2" && nextPalette === "6")')) {
    fail("monochrome swatch must stay active for dark monochrome");
  }
  if (app.includes("setPalette(option.dataset.paletteOption);")) {
    fail("palette option handlers must route through pickPalette");
  }
  if (
    !/function openNameModal\(\)\s*\{[\s\S]*?resetDetailPanel\(\);\s*\n\s*timelineClosed = false;\s*\n\s*nameModal\.hidden = false;/.test(
      app,
    )
  ) {
    fail("opening the name modal must re-arm timeline scroll effects after resetting the detail panel");
  }
}

const previewServerPath = path.join(projectRoot, "preview-server.cjs");
if (!fs.existsSync(previewServerPath)) {
  fail("preview-server.cjs is missing");
} else {
  const previewServer = fs.readFileSync(previewServerPath, "utf8");
  if (!previewServer.includes("process.env.PORT")) {
    fail("preview-server.cjs must support PORT so preview can avoid occupied ports");
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
