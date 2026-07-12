# Library and Home Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the library topbar, typography, and footer match the homepage and remove its redundant name-entry action.

**Architecture:** Keep the existing static-site generator as the source of truth. Extend only the homepage chrome selectors that control the topbar and footer to `library`, then reduce library-specific type scales without changing archive structure or access control.

**Tech Stack:** Node.js static-site generator, CSS, Node test runner.

## Global Constraints

- Preserve library access control and saved-signal behavior.
- Do not change homepage layout.
- Keep desktop and mobile layouts free of horizontal overflow.
- Generated `dist` output must match `build.mjs` and `styles.css`.

---

### Task 1: Add library parity regressions

**Files:**
- Modify: `test/styles.test.mjs`

**Interfaces:**
- Consumes: generated `dist/library/index.html` and source `styles.css`.
- Produces: assertions for footer/topbar parity, compact typography, and removal of the name-entry action.

- [ ] **Step 1: Write the failing assertions**

Extend the existing library layout test with:

```js
const styles = readProjectFile("styles.css");

assert.doesNotMatch(build, /class="library-memory__action"/);
assert.match(styles, /:is\(\[data-page="home"\], \[data-page="library"\]\).*\.topbar--home/);
assert.match(styles, /:is\(\[data-page="home"\], \[data-page="library"\]\).*\.site-footer__top/);
assert.match(cssBlock(styles, ".library-hero h1"), /font-size:\s*clamp\(2\.45rem, 2\.7vw, 2\.55rem\)/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test test/styles.test.mjs`

Expected: FAIL because the library action still exists, homepage chrome selectors are home-only, and the hero is still oversized.

### Task 2: Share homepage chrome and compact library typography

**Files:**
- Modify: `build.mjs`
- Modify: `styles.css`
- Generate: `dist/**`

**Interfaces:**
- Consumes: `renderLibrary(localeKey, currentFile)` and existing homepage CSS selectors.
- Produces: library markup without `.library-memory__action` and shared home/library topbar/footer styling.

- [ ] **Step 1: Remove the redundant action**

Delete the unused `homeHref` local and this link from `renderLibrary`:

```html
<a class="library-memory__action" href="${text(homeHref)}">${text(library.ctaAction)}</a>
```

- [ ] **Step 2: Extend chrome selectors**

Replace relevant `html[data-page="home"]` and `html:root[data-page="home"]` selectors for `.topbar--home`, `.site-footer__top`, `.site-footer__bottom`, `.social-grid`, and `.social-chip` with:

```css
html:root:is([data-page="home"], [data-page="library"])
```

Keep timeline, detail-panel, body-overlay, and reader-gate selectors home-only.

- [ ] **Step 3: Reduce library typography**

Set the principal scales to:

```css
.library-hero h1 {
  font-size: clamp(2.45rem, 2.7vw, 2.55rem);
  line-height: 0.96;
}

.library-signal-row h2,
.library-memory h2 {
  font-size: clamp(1.25rem, 2.15vw, 1.95rem);
  line-height: 1.05;
}
```

Use a mobile hero cap no larger than `2.55rem`.

- [ ] **Step 4: Rebuild generated output**

Run: `npm run build`

Expected: generated library HTML has no name-entry action and all generated pages contain the updated shared CSS.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `node --test test/styles.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

Run: `npm run check`

Expected: build and site checks PASS.

### Task 3: Visual verification

**Files:**
- Verify: `dist/library/index.html`

**Interfaces:**
- Consumes: generated static site.
- Produces: evidence that desktop and mobile library renders match homepage chrome without overflow.

- [ ] **Step 1: Start the preview server**

Run: `npm run preview`

Expected: local preview URL is printed.

- [ ] **Step 2: Inspect desktop**

Open `/library/` at a desktop viewport and verify the topbar surface merges with the page background, typography is compact, no name action appears, and footer social icons match the homepage.

- [ ] **Step 3: Inspect mobile**

Open `/library/` at a mobile viewport and verify no horizontal overflow, heading clipping, footer overlap, or oversized type.

- [ ] **Step 4: Commit implementation**

```powershell
git add build.mjs styles.css test/styles.test.mjs dist
git commit -m "Match library styling to homepage"
```
