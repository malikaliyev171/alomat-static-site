# Typography, Detail Actions, and Shared Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render Uzbek modifier-letter text cleanly, simplify the signal detail actions, and reuse the homepage topbar on Manifesto and Lineup.

**Architecture:** Keep the existing static generator and client script boundaries. Typography and responsive layout remain in `styles.css`; generated page chrome stays in `build.mjs`; interactive signal actions stay in `app.js`. Generated `dist` assets are rebuilt after source changes.

**Tech Stack:** Static HTML generator (`build.mjs`), vanilla JavaScript, CSS, Node test runner.

## Global Constraints

- Use Noto Sans for body and interface copy; preserve the display serif stack.
- Do not rewrite valid Uzbek modifier-letter apostrophes.
- Keep like/save local-library behavior and share fallback behavior unchanged.
- Keep source URL sanitization and accessible action labels.
- Manifesto and Lineup must use the homepage signal topbar in Uzbek and English.
- Preserve existing page content and article links below the replaced headers.

---

### Task 1: Uzbek-Compatible Body Typography

**Files:**
- Modify: `styles.css:1-20`
- Modify: `test/styles.test.mjs`

**Interfaces:**
- Produces: `--font-body` backed by `"Noto Sans"` and Google Fonts import weights 400-800.

- [ ] **Step 1: Write a failing typography test**

Assert that the stylesheet imports Noto Sans, assigns it to `--font-body`, and no longer assigns Nunito.

- [ ] **Step 2: Run the focused style test and verify failure**

Run `node --test test/styles.test.mjs`.

- [ ] **Step 3: Replace the body font import and token**

Update the Google Fonts URL and `--font-body` fallback chain without changing display headings.

- [ ] **Step 4: Run the focused style test and verify success**

Run `node --test test/styles.test.mjs`.

### Task 2: Compact Detail Action Bar

**Files:**
- Modify: `app.js:120-170,760-840`
- Modify: `styles.css:2190-2420,4580-4610`
- Modify: `test/app.test.mjs`

**Interfaces:**
- Consumes: `actionButton`, `sanitizeStoryUrl`, `toggleLibraryAction`, and `shareStory`.
- Produces: one `.timeline-panel__actions` row containing source, like, save, and share controls.

- [ ] **Step 1: Update the detail markup test to describe the new bar**

Require source/like/save/share, forbid AI controls, forbid the old `.timeline-panel__footer`, and require only one share control.

- [ ] **Step 2: Run the focused app test and verify failure**

Run `node --test --test-name-pattern="detail action markup" test/app.test.mjs`.

- [ ] **Step 3: Simplify `renderStoryMarkup`**

Remove AI labels and controls, move the original-source link into the main action row, and render like/save/share once.

- [ ] **Step 4: Update action-row CSS**

Use a compact left/right flex row, preserve mobile wrapping, and remove layout rules that depend on the deleted footer/lens copy.

- [ ] **Step 5: Run focused app and style tests**

Run `node --test test/app.test.mjs test/styles.test.mjs`.

### Task 3: Shared Signal Topbar for Manifesto and Lineup

**Files:**
- Modify: `build.mjs:1380-1510,1909-1924,2158-2195,2420-2440`
- Modify: `styles.css` selectors scoped to Home/Library signal chrome
- Modify: `test/styles.test.mjs`

**Interfaces:**
- Consumes: `renderHeader(localeKey, pageKey, currentFile)`.
- Produces: generated About and Lineup pages with `.topbar--home`, active nav state, and `aria-current="page"`.

- [ ] **Step 1: Write failing generated-page header tests**

Require `.topbar--home` in `dist/about.html` and `dist/lineup.html`; forbid `.static-header` and `.lineup-topbar` on those page outputs.

- [ ] **Step 2: Build and run focused tests to verify failure**

Run `npm run build` and `node --test test/styles.test.mjs`.

- [ ] **Step 3: Expand signal chrome routing**

Include About and Lineup in `isSignalChrome`, render active nav attributes, and stop skipping the site header for those documents.

- [ ] **Step 4: Remove redundant page-local headers**

Delete Manifesto's back-home header and Lineup's custom topbar while keeping their content wrappers intact.

- [ ] **Step 5: Expand shared-header CSS page scopes**

Include About and Lineup wherever the Home/Library signal topbar requires shared theme and responsive behavior.

- [ ] **Step 6: Rebuild and run focused tests**

Run `npm run build` and `node --test test/styles.test.mjs`.

### Task 4: Full Verification and Visual QA

**Files:**
- Generated: `dist/**`

**Interfaces:**
- Verifies all outputs from Tasks 1-3.

- [ ] **Step 1: Run all site tests**

Run `npm test` and require zero failures.

- [ ] **Step 2: Run site readiness check**

Run `npm run check` and require `Site readiness check passed.`

- [ ] **Step 3: Run Worker tests**

Run `npm test` from `worker/` and require zero failures.

- [ ] **Step 4: Verify desktop and mobile views**

Inspect the home detail panel, Manifesto, and Lineup at desktop and mobile widths. Confirm no overlap, no horizontal overflow, correct active navigation, and clean Uzbek modifier-letter spacing.

- [ ] **Step 5: Commit implementation**

Stage source, tests, and generated `dist` files, then commit with a scoped message.
