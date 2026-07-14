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

  assert.match(styles, /--home-row-min-height:\s*clamp\(/);
  assert.match(styles, /--home-detail-width:\s*clamp\(/);

  assert.match(cssBlock(styles, ".signal-timeline__route"), /position:\s*absolute;/);
  assert.match(cssBlock(styles, ".signal-timeline__stage"), /position:\s*relative;/);
  assert.doesNotMatch(cssBlock(styles, ".signal-timeline__stage"), /position:\s*sticky;/);
  assert.match(cssBlock(styles, ".signal-timeline__cursor"), /will-change:\s*transform;/);
  assert.match(cssBlock(styles, ".signal-detail"), /width:\s*var\(--home-detail-width[,)]/);

  assert.doesNotMatch(build, /html\[data-page="home"\] \.signal-timeline__line\s*\{[\s\S]*?left:\s*160\.69px;/);
  assert.doesNotMatch(build, /html\[data-page="home"\] \.signal-timeline__headline-button\s*\{[\s\S]*?width:\s*min\(100%, 500px\);/);
  assert.doesNotMatch(build, /html\[data-page="home"\] \.signal-detail\s*\{[\s\S]*?width:\s*420px;/);
});

test("timeline route uses one SVG cursor with alternating desktop cards and a mobile column", () => {
  const styles = readProjectFile("styles.css");

  assert.match(cssBlock(styles, ".signal-timeline__route"), /position:\s*absolute;/);
  assert.match(cssBlock(styles, ".signal-timeline__cursor"), /will-change:\s*transform;/);
  assert.match(styles, /\.signal-timeline__item\[data-side="left"\][\s\S]*grid-column:\s*1;/);
  assert.match(styles, /\.signal-timeline__item\[data-side="right"\][\s\S]*grid-column:\s*3;/);
  assert.match(styles, /@media \(max-width: 780px\)[\s\S]*\.signal-timeline__item\[data-side\] \.signal-timeline__headline-button[\s\S]*grid-column:\s*2;/);
  assert.doesNotMatch(styles, /^\.signal-timeline__node\s*\{/m);

  const passive = cssBlock(styles, ".signal-timeline__item:not(.is-active) .signal-timeline__headline-button");
  assert.match(passive, /box-shadow:\s*none;/);
  assert.match(passive, /opacity:\s*0\.5;/);
  assert.match(
    styles,
    /\.signal-timeline__item,\s*\.signal-timeline__item\.is-visible\s*\{[\s\S]*?opacity:\s*0\.5;/,
  );
  assert.doesNotMatch(styles, /--shadow-head-scale-x|--shadow-tail-scale-x/);
  const headlineBlocks = Array.from(
    styles.matchAll(/^\.signal-timeline__headline-button\s*\{[\s\S]*?\n\}/gm),
    (match) => match[0],
  );
  assert.match(headlineBlocks.at(-1) ?? "", /background:\s*color-mix\(in srgb, var\(--bg\) 72%, transparent\);/);
  assert.match(
    styles,
    /\.signal-timeline__item,\s*\.signal-timeline__item\.is-visible\s*\{[\s\S]*?transition:\s*opacity 180ms ease;/,
  );
  assert.match(
    styles,
    /grid-template-columns:\s*minmax\(0, 1fr\) clamp\(150px, 12vw, 180px\) minmax\(0, 1fr\);/,
  );
});

test("desktop timeline spreads left cards and moves the welcome gate right", () => {
  const styles = readProjectFile("styles.css");
  const rootTokens = cssBlock(styles, 'html[data-page="home"]');
  const timelineItems = Array.from(
    styles.matchAll(/^\.signal-timeline__items\s*\{[\s\S]*?\n\}/gm),
    (match) => match[0],
  ).at(-1) ?? "";
  const headlineButton = Array.from(
    styles.matchAll(/^\.signal-timeline__headline-button\s*\{[\s\S]*?\n\}/gm),
    (match) => match[0],
  ).at(-1) ?? "";

  assert.match(rootTokens, /--home-timeline-available-width:\s*calc\(/);
  assert.match(rootTokens, /--home-row-min-height:\s*clamp\(220px,\s*18vw,\s*260px\);/);
  assert.match(rootTokens, /--home-timeline-shift-left:\s*clamp\(36px,\s*4vw,\s*64px\);/);
  assert.match(
    rootTokens,
    /--home-left-card-offset:\s*clamp\(-96px,\s*calc\(355px - 28\.9vw\),\s*32px\);/,
  );
  assert.match(rootTokens, /--home-gate-shift-up:\s*clamp\(28px,\s*2\.5vw,\s*40px\);/);
  assert.match(rootTokens, /--home-gate-shift-right:\s*clamp\(72px,\s*5vw,\s*96px\);/);
  assert.match(rootTokens, /--home-gate-margin-left:\s*clamp\(32px,\s*4vw,\s*58px\);/);
  assert.match(rootTokens, /--home-timeline-max-width:\s*1140px;/);
  assert.match(rootTokens, /--home-card-max-width:\s*clamp\(360px,[^;]+500px\);/);
  assert.match(
    styles,
    /@media \(min-width: 960px\)[\s\S]*?\.signal-timeline--home\s*\{[\s\S]*?margin-left:\s*calc\(var\(--home-timeline-shift-left,\s*0px\) \* -1\);[\s\S]*?\.signal-reader-gate\s*\{[\s\S]*?translateX\(var\(--home-gate-shift-right,\s*0px\)\)[\s\S]*?translateY\(calc\(var\(--home-gate-shift-up,\s*0px\) \* -1\)\);[\s\S]*?html\[data-page="home"\] \.signal-timeline__item\[data-side="left"\] \.signal-timeline__headline-button,[\s\S]*?translateX\(var\(--home-left-card-offset,\s*0px\)\);/,
  );
  assert.match(
    styles,
    /html\[data-page="home"\] \.signal-timeline__item\[data-side="left"\] \.signal-timeline__headline-button,[\s\S]*?html\[data-page="home"\] \.page-home\.has-active-story \.signal-timeline__item\[data-side="left"\]\.is-visible:not\(\.is-active\) \.signal-timeline__headline-button,[\s\S]*?html\[data-page="home"\] \.signal-timeline__item\[data-side="left"\]\.is-active \.signal-timeline__headline-button\s*\{[\s\S]*?translateX\(var\(--home-left-card-offset,\s*0px\)\);/,
  );
  assert.match(timelineItems, /width:\s*min\(\s*var\(--home-timeline-max-width/);
  assert.match(timelineItems, /var\(--home-timeline-available-width\)/);
  assert.match(headlineButton, /max-width:\s*var\(--home-card-max-width,\s*500px\);/);
  assert.match(
    styles,
    /@media \(max-width: 780px\)[\s\S]*?\.signal-timeline__item,[\s\S]*?min-height:\s*180px;[\s\S]*?\.signal-timeline__item\[data-side\] \.signal-timeline__headline-button[\s\S]*?max-width:\s*none;/,
  );
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

test("signal navigation keeps the same horizontal position across pages", () => {
  const styles = readProjectFile("styles.css");

  assert.match(
    styles,
    /html:root:is\([\s\S]*?\[data-page="home"\][\s\S]*?\[data-page="library"\][\s\S]*?\[data-page="about"\][\s\S]*?\[data-page="lineup"\][\s\S]*?\[data-page="lineup-article"\][\s\S]*?\) \.language-switch\s*\{[\s\S]*?margin-left:\s*clamp\(24px, 2\.2vw, 40px\);/,
  );
  assert.doesNotMatch(styles, /html:root\[data-page="home"\] \.language-switch\s*\{/);
});

test("full-width header renders a localized UI-only sort menu after the library", () => {
  const build = readProjectFile("build.mjs");
  const styles = readProjectFile("styles.css");
  const header = /<header class="topbar topbar--home">[\s\S]*?<\/header>/.exec(build)?.[0] ?? "";

  assert.match(
    header,
    /nav__item--library[\s\S]*?<\/a>[\s\S]*?renderSignalSort\(localeKey\)[\s\S]*?renderLanguageSwitch/,
  );
  assert.match(build, /data-signal-sort-trigger/);
  assert.match(build, /aria-haspopup="listbox"/);
  assert.match(build, /data-signal-sort-option="\$\{text\(value\)\}"/);
  assert.match(build, /\["newest", labels\.newest\]/);
  assert.match(build, /\["popular", labels\.popular\]/);
  assert.match(build, /\["oldest", labels\.oldest\]/);
  assert.match(build, /YEN\\u0130DEN ESK\\u0130YE/);
  assert.match(build, /EN POP\\u00dcLER HABERLER/);
  assert.match(build, /ESK\\u0130DEN YEN\\u0130YE/);

  const topbar = cssBlock(styles, ".topbar--home");
  assert.match(topbar, /width:\s*100vw;/);
  assert.match(topbar, /margin-left:\s*calc\(50% - 50vw\);/);
  assert.match(styles, /^\.signal-sort\s*\{/m);
  assert.match(styles, /^\.signal-sort__menu\s*\{/m);
  const sortShell = cssBlock(styles, ".signal-sort");
  const sortTrigger = cssBlock(styles, ".signal-sort__trigger");
  assert.match(sortShell, /height:\s*34px;/);
  assert.match(sortShell, /padding:\s*0 8px;/);
  assert.match(sortShell, /border-radius:\s*999px;/);
  assert.match(sortShell, /background:\s*linear-gradient\(/);
  assert.match(sortTrigger, /height:\s*26px;/);
  assert.match(sortTrigger, /border:\s*0;/);
  assert.match(sortTrigger, /background:\s*transparent;/);
  assert.match(sortTrigger, /box-shadow:\s*none;/);
  assert.match(sortTrigger, /color:\s*var\(--text-medium\);/);
  assert.match(sortTrigger, /font-size:\s*0\.68rem;/);
  assert.match(sortTrigger, /font-weight:\s*700;/);
  assert.match(sortTrigger, /letter-spacing:\s*0\.17em;/);
  assert.match(
    styles,
    /\.signal-sort__trigger > \[data-signal-sort-label\]\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?overflow:\s*hidden;[\s\S]*?text-overflow:\s*ellipsis;/,
  );
  assert.match(cssBlock(styles, ".signal-sort__menu"), /width:\s*max\(100%, 230px\);/);
  assert.match(
    styles,
    /\.signal-sort\.is-open \.signal-sort__trigger\s*\{[\s\S]*?color:\s*var\(--text-strong\);[\s\S]*?box-shadow:\s*none;/,
  );
  assert.match(
    styles,
    /html:root\[data-page="home"\]\[data-theme\] \.nav--home,\s*html:root\[data-page="home"\]\[data-theme\] \.signal-sort,/,
  );
  assert.match(
    styles,
    /html:root\[data-page="home"\]\[data-palette="0"\] \.nav--home,\s*html:root\[data-page="home"\]\[data-palette="0"\] \.signal-sort,/,
  );
  assert.match(
    styles,
    /html:root\[data-page="home"\]\[data-palette="4"\] \.signal-sort,\s*html:root\[data-page="home"\]\[data-palette="7"\] \.signal-sort,/,
  );
  assert.match(styles, /@media \(max-width: 780px\)[\s\S]*?\.signal-sort\s*\{[\s\S]*?width:\s*100%;/);
  assert.match(
    styles,
    /@media \(max-width: 780px\)[\s\S]*?\.topbar--home \.controls--home\s*\{[\s\S]*?display:\s*grid;[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto;/,
  );
});

test("desktop language control keeps the same position across locales", () => {
  const styles = readProjectFile("styles.css");
  const navigation = cssBlock(styles, ".nav--home");
  const palette = cssBlock(styles, ".palette-rail");

  assert.match(navigation, /flex:\s*0 0 402px;/);
  assert.match(navigation, /width:\s*402px;/);
  assert.match(palette, /flex:\s*0 0 156px;/);
  assert.match(palette, /width:\s*156px;/);
  assert.match(
    styles,
    /@media \(max-width: 780px\)[\s\S]*?\.topbar--home \.palette-rail\s*\{[\s\S]*?flex:\s*0 0 38px;[\s\S]*?width:\s*38px;/,
  );
  assert.match(
    styles,
    /@media \(min-width: 781px\) and \(max-width: 1150px\)[\s\S]*?\.topbar--home\s*\{[\s\S]*?grid-template-columns:\s*1fr;[\s\S]*?\.topbar--home \.controls--home\s*\{[\s\S]*?width:\s*100%;/,
  );
});

test("active signal navigation item keeps the shared background", () => {
  const styles = readProjectFile("styles.css");
  const activeItem = cssBlock(styles, ".nav__item.is-active");

  assert.match(activeItem, /background:\s*transparent;/);
  assert.doesNotMatch(activeItem, /background:\s*color-mix/);
});

test("signal navigation palette stays transparent across shared pages", () => {
  const styles = readProjectFile("styles.css");

  assert.match(
    styles,
    /html:root:is\([\s\S]*?\[data-page="home"\][\s\S]*?\[data-page="library"\][\s\S]*?\[data-page="about"\][\s\S]*?\[data-page="lineup"\][\s\S]*?\[data-page="lineup-article"\][\s\S]*?\)(?:\[data-palette(?:="[047]")?\])?(?:\[data-theme\])? \.nav--home[\s\S]*?background:\s*transparent;[\s\S]*?box-shadow:\s*none;/,
  );
});

test("Uzbek manifesto and lineup copy is fully localized", () => {
  const build = readProjectFile("build.mjs");

  assert.match(build, /Diqqat bilan kuzat\./);
  assert.match(build, /Biz bir kishilik studiyamiz\./);
  assert.match(build, /Sun’iy intellektdagi yangi temir parda/);
  assert.match(build, /Shenol Dak/);
  assert.match(build, /O‘qituvchi · AI bo‘yicha pedagog/);
  assert.match(build, /writings: "Yozuvlar"/);
  assert.match(build, /staff: "Mualliflar"/);

  const uzManifesto = build.slice(build.indexOf('back: "ana sahifa"'), build.indexOf("const lineupArticleDetails"));
  const uzLineup = build.slice(build.indexOf('    lineup: {'), build.indexOf('    privacy: {'));
  assert.doesNotMatch(uzManifesto, /Watch closely|feed|deck|growth team|product strategist/);
  assert.doesNotMatch(uzLineup, /Teacher|Educator|Crowdfunding|Analytics|Research|Insights/);
  assert.doesNotMatch(build, /[ŞşÇçĞğİıÖöÜü]/);
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

test("rich summary links inherit text color and underline on interaction", () => {
  const styles = readProjectFile("styles.css");
  const body = cssBlock(styles, ".timeline-panel__body");
  const link = cssBlock(styles, ".timeline-panel__inline-link");

  assert.match(body, /font-weight:\s*400;/);
  assert.match(link, /color:\s*inherit;/);
  assert.match(link, /font-weight:\s*650;/);
  assert.match(link, /text-decoration:\s*none;/);
  assert.match(
    styles,
    /\.timeline-panel__inline-link:is\(:hover, :focus-visible\)\s*\{[\s\S]*?text-decoration-line:\s*underline;/,
  );
});
