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
  const bodyBlock = /body\s*\{[\s\S]*?\n\}/.exec(styles)?.[0] ?? "";
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
  const timelineHeadlineTextBlock =
    /^\.signal-timeline__headline-text\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  if (!timelineHeadlineButtonBlock.includes("border: 0.8px solid color-mix(in srgb, var(--text) 6%, transparent);")) {
    fail("timeline headline cards must use palette-aware borders");
  }
  if (!timelineHeadlineButtonBlock.includes("background: color-mix(in srgb, var(--bg) 62%, transparent);")) {
    fail("timeline headline cards must use palette-aware backgrounds");
  }
  if (!timelineHeadlineButtonBlock.includes("box-shadow: 0 10px 30px color-mix(in srgb, var(--text) 5%, transparent);")) {
    fail("timeline headline cards must use palette-aware shadows");
  }
  if (!timelineHeadlineTextBlock.includes("color: var(--text-strong);")) {
    fail("timeline headline text must use the current palette text color");
  }

  const timelineNodeBlock = /^\.signal-timeline__node\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const loadEarlierBlock = /^\.signal-timeline__load-earlier\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const siteFooterTopBlock = /^\.site-footer__top\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const socialChipBlock = /^\.social-chip\s*\{[\s\S]*?\n\}/m.exec(styles)?.[0] ?? "";
  const orangeLineupCardBlock =
    /html\[data-page="lineup"\]\[data-palette="4"\] \.lineup-card,[\s\S]*?html\[data-page="lineup-article"\]\[data-palette="4"\] \.lineup-author-card\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";
  const orangeSignalDetailBlock =
    /html:root\[data-page="home"\]\[data-palette="4"\]\[data-theme\] \.signal-detail,[\s\S]*?html:root\[data-page="home"\]\[data-palette="4"\]\[data-theme\] \.signal-detail\.has-story\s*\{[\s\S]*?\n\}/.exec(
      styles,
    )?.[0] ?? "";

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
  if (!orangeSignalDetailBlock.includes("color-mix(in srgb, var(--surface-strong) 95%, transparent) 0%")) {
    fail("orange home signal detail must keep a light surface top");
  }
  if (!orangeSignalDetailBlock.includes("color-mix(in srgb, var(--surface) 93%, transparent) 100%")) {
    fail("orange home signal detail must keep a light surface bottom");
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
  if (!orangeLineupCardBlock.includes("background: color-mix(in srgb, var(--bg) 70%, transparent);")) {
    fail("orange lineup cards and author cards must use a palette-aware surface");
  }
}

const appPath = path.join(projectRoot, "app.js");
if (fs.existsSync(appPath)) {
  const app = fs.readFileSync(appPath, "utf8");
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
