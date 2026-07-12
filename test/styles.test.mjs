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
    /html:root:is\(\[data-page="home"\], \[data-page="library"\]\).*\.topbar--home/,
  );
  assert.match(
    styles,
    /html:root:is\(\[data-page="home"\], \[data-page="library"\]\).*\.site-footer__top/,
  );
  assert.match(
    styles,
    /html:root:is\(\[data-page="home"\], \[data-page="library"\]\)\[data-palette="2"\]\[data-theme="light"\] body::before/,
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
});
