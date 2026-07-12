import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), "..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function cssBlock(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}\\s*\\{[\\s\\S]*?\\n\\}`, "m").exec(source)?.[0] ?? "";
}

test("home timeline and detail panel use responsive layout tokens", () => {
  const styles = readProjectFile("styles.css");
  const build = readProjectFile("build.mjs");

  assert.match(styles, /--home-rail-left:\s*clamp\(/);
  assert.match(styles, /--home-card-left:\s*clamp\(/);
  assert.match(styles, /--home-detail-width:\s*clamp\(/);

  assert.match(cssBlock(styles, ".signal-timeline__line"), /left:\s*var\(--home-rail-left[,)]/);
  assert.match(cssBlock(styles, ".signal-timeline__node"), /left:\s*var\(--home-node-left[,)]/);
  assert.match(cssBlock(styles, ".signal-timeline__headline-button"), /left:\s*var\(--home-card-left[,)]/);
  assert.match(cssBlock(styles, ".signal-detail"), /width:\s*var\(--home-detail-width[,)]/);

  assert.doesNotMatch(build, /html\[data-page="home"\] \.signal-timeline__line\s*\{[\s\S]*?left:\s*160\.69px;/);
  assert.doesNotMatch(build, /html\[data-page="home"\] \.signal-timeline__headline-button\s*\{[\s\S]*?width:\s*min\(100%, 500px\);/);
  assert.doesNotMatch(build, /html\[data-page="home"\] \.signal-detail\s*\{[\s\S]*?width:\s*420px;/);
});

test("auth code controls keep hidden elements hidden despite field display styles", () => {
  const styles = readProjectFile("styles.css");

  assert.match(styles, /\.name-auth-field\[hidden\][\s\S]*display:\s*none;/);
  assert.match(styles, /\.name-auth-input\[hidden\][\s\S]*display:\s*none;/);
});

test("body typography uses Noto Sans for Uzbek modifier-letter characters", () => {
  const styles = readProjectFile("styles.css");

  assert.match(styles, /family=Noto\+Sans:wght@400;500;600;700;800/);
  assert.match(styles, /--font-body:\s*"Noto Sans",\s*system-ui,\s*sans-serif;/);
  assert.doesNotMatch(styles, /--font-body:[^;]*Nunito/);
});

test("library page uses the home signal archive layout instead of generic cards", () => {
  const build = readProjectFile("dist/library/index.html");
  const styles = readProjectFile("styles.css");

  assert.match(build, /topbar topbar--home/);
  assert.match(build, /class="page-shell page-shell--home"/);
  assert.match(build, /class="library-shell"/);
  assert.match(build, /data-library-list/);
  assert.match(build, /data-library-empty/);
  assert.match(build, /data-library-count="saved"/);
  assert.match(build, /data-library-count="liked"/);
  assert.match(build, /data-library-count="total"/);
  assert.doesNotMatch(build, />128</);
  assert.doesNotMatch(build, /Bugun saqlangan/);
  assert.doesNotMatch(build, /class="metric-grid"/);
  assert.doesNotMatch(build, /class="content-grid content-grid--library"/);
  assert.doesNotMatch(build, /class="library-memory__action"/);
  assert.match(
    styles,
    /html:root:is\(\[data-page="home"\], \[data-page="library"\], \[data-page="about"\], \[data-page="lineup"\], \[data-page="lineup-article"\]\).*\.topbar--home/,
  );
  assert.match(
    styles,
    /html:root:is\(\[data-page="home"\], \[data-page="library"\], \[data-page="about"\], \[data-page="lineup"\]\).*\.site-footer__top/,
  );
  assert.match(
    styles,
    /html:root:is\(\[data-page="home"\], \[data-page="library"\], \[data-page="about"\], \[data-page="lineup"\], \[data-page="lineup-article"\]\)\[data-palette="2"\]\[data-theme="light"\] body::before/,
  );
  assert.match(
    styles,
    /html:is\(\[data-page="home"\], \[data-page="library"\]\) body::before\s*\{[\s\S]*?opacity:\s*0\.035;/,
  );
  const libraryHeroBlocks = Array.from(
    styles.matchAll(/^\.library-hero h1\s*\{[\s\S]*?\n\}/gm),
    (match) => match[0],
  );
  assert.ok(
    libraryHeroBlocks.some((block) =>
      /font-size:\s*clamp\(2\.45rem, 2\.7vw, 2\.55rem\)/.test(block),
    ),
  );
  assert.ok(libraryHeroBlocks.some((block) => /white-space:\s*nowrap/.test(block)));
  assert.ok(libraryHeroBlocks.some((block) => /overflow-wrap:\s*normal/.test(block)));
});

test("manifesto and lineup reuse the home signal topbar without page-local headers", () => {
  const about = readProjectFile("dist/about.html");
  const lineup = readProjectFile("dist/lineup.html");

  for (const page of [about, lineup]) {
    assert.match(page, /class="topbar topbar--home"/);
  }
  assert.match(about, /aria-current="page"[^>]*>[\s\S]*?MANIFESTO/);
  assert.match(lineup, /aria-current="page"[^>]*>[\s\S]*?LINEUP/);
  assert.doesNotMatch(about, /class="static-header"/);
  assert.doesNotMatch(lineup, /class="lineup-topbar"/);
  assert.doesNotMatch(lineup, /class="lineup-topbar__brand"/);
});

test("lineup article pages keep the same signal topbar as the lineup index", () => {
  const article = readProjectFile(
    "dist/lineup/oktay-dak/internet-endi-malumot-bermaydi-diqqatni-yutadi/index.html",
  );

  assert.match(article, /class="page-shell page-shell--home"/);
  assert.match(article, /class="topbar topbar--home"/);
  assert.match(article, /aria-current="page"[^>]*>[\s\S]*?LINEUP/);
  assert.doesNotMatch(article, /class="lineup-topbar"/);
  assert.doesNotMatch(article, /class="lineup-topbar__brand"/);
});

test("manifesto and lineup use one flat palette background across the viewport", () => {
  const styles = readProjectFile("styles.css");

  assert.match(
    styles,
    /html:is\(\[data-page="about"\], \[data-page="lineup"\], \[data-page="lineup-article"\]\) body\s*\{[\s\S]*?background:\s*var\(--bg\);[\s\S]*?\}/,
  );
  assert.match(
    styles,
    /html:is\(\[data-page="about"\], \[data-page="lineup"\], \[data-page="lineup-article"\]\) body::before,[\s\S]*?body::after\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?\}/,
  );
  assert.match(
    styles,
    /html\[data-page="about"\] \.static-page,[\s\S]*?html\[data-page="lineup-article"\] \.lineup-page\s*\{[\s\S]*?background:\s*transparent;/,
  );
});

test("lineup article pages use the same flat palette background", () => {
  const styles = readProjectFile("styles.css");

  assert.match(
    styles,
    /html:is\(\[data-page="about"\], \[data-page="lineup"\], \[data-page="lineup-article"\]\) body\s*\{[\s\S]*?background:\s*var\(--bg\);[\s\S]*?\}/,
  );
  assert.match(
    styles,
    /html\[data-page="lineup-article"\] \.lineup-page\s*\{[\s\S]*?background:\s*transparent;/,
  );
});

test("lineup article topbar uses the same neutral signal chrome background", () => {
  const styles = readProjectFile("styles.css");

  assert.match(
    styles,
    /html:root:is\(\[data-page="home"\], \[data-page="library"\], \[data-page="about"\], \[data-page="lineup"\], \[data-page="lineup-article"\]\)\[data-theme\] \.topbar--home\s*\{[\s\S]*?background:\s*color-mix\(in srgb, var\(--bg-start\) 92%, transparent\);[\s\S]*?box-shadow:\s*none;/,
  );
});

test("signed-in reader sigil derives its colors from the active palette", () => {
  const styles = readProjectFile("styles.css");
  const axis = cssBlock(styles, ".signal-reader-gate__axis");
  const sigil = cssBlock(styles, ".signal-reader-gate__sigil");

  assert.match(axis, /color:\s*var\(--text\);/);
  assert.match(
    sigil,
    /background:\s*color-mix\(in srgb, var\(--bg\) 88%, var\(--surface\) 12%\);/,
  );
  assert.doesNotMatch(sigil, /rgba\(255, 255, 255|white 12%/);
});

test("story detail collapses an empty action status to enlarge the body", () => {
  const styles = readProjectFile("styles.css");

  assert.match(
    styles,
    /\.timeline-panel__action-status:empty\s*\{[\s\S]*?display:\s*none;/,
  );
  assert.match(
    cssBlock(styles, ".signal-detail.has-story .signal-detail__content"),
    /padding-bottom:\s*6px;/,
  );
});
