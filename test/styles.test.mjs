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
