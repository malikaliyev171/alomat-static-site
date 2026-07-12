# Local Library Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make like, save, and share controls functional and render liked/saved stories in the browser-local library.

**Architecture:** Add a versioned local-storage repository and action dispatcher to the existing static `app.js`. Keep the static generator responsible for library structure and data hooks, while client JavaScript renders current local entries and counts.

**Tech Stack:** Browser JavaScript, localStorage, Web Share API, Clipboard API, Node test runner, static HTML/CSS generator.

## Global Constraints

- No server identity or cross-device synchronization.
- Preserve the existing name gate for library navigation.
- Store complete sanitized story snapshots under `alomat-library-v1`.
- Remove download behavior and markup.
- Keep desktop and mobile layouts free of overflow.

---

### Task 1: Versioned local library repository

**Files:**
- Modify: `app.js`
- Test: `test/app.test.mjs`

**Interfaces:**
- Produces: `readLibraryState(storage)`, `toggleLibraryAction(story, action, storage, now)`, `getLibraryEntries(storage)`, and `getLibraryCounts(entries)`.

- [ ] Add failing tests proving malformed payload recovery, independent like/save toggles, union deduplication, removal when both flags are false, counts, and newest-first sorting.
- [ ] Run `node --test test/app.test.mjs` and confirm failures reference missing repository helpers.
- [ ] Implement the versioned repository with sanitized story snapshots and guarded storage access.
- [ ] Export helpers through `globalThis.__ALOMAT_APP_TEST__`.
- [ ] Run `node --test test/app.test.mjs` and confirm the repository tests pass.

### Task 2: Detail actions, icons, sharing, and download removal

**Files:**
- Modify: `app.js`
- Modify: `styles.css`
- Test: `test/app.test.mjs`

**Interfaces:**
- Consumes: Task 1 repository helpers and `activeStoryId`.
- Produces: `data-story-action="like|save|share"`, pressed-state hydration, `shareStory(story)`, and localized action status.

- [ ] Add failing tests asserting outline SVG markup, like/save data attributes, no download label/button, toggle state, and clipboard fallback.
- [ ] Run focused app tests and confirm RED.
- [ ] Replace symbol glyphs with inline heart, bookmark, and share SVGs; add action attributes and `aria-pressed`.
- [ ] Delegate detail-panel clicks to like/save/share handlers and hydrate controls whenever a story opens.
- [ ] Use `navigator.share` first and `navigator.clipboard.writeText` as fallback.
- [ ] Add active-state and status-message CSS.
- [ ] Run focused app tests and confirm GREEN.

### Task 3: Dynamic library rendering

**Files:**
- Modify: `build.mjs`
- Modify: `app.js`
- Modify: `styles.css`
- Test: `test/app.test.mjs`
- Test: `test/styles.test.mjs`
- Generate: `dist/**`

**Interfaces:**
- Consumes: Task 1 `getLibraryEntries` and `getLibraryCounts`.
- Produces: `renderLibraryFromStorage()`, count hooks, list hook, empty-state hook, and storage-event refresh.

- [ ] Add failing tests proving static demo rows/counts are absent and hooks are present.
- [ ] Replace generated demo metrics and rows with zero-count hooks, an empty state, and an initially empty list.
- [ ] Render escaped stored story rows with source/time and liked/saved labels.
- [ ] Refresh on page initialization and browser `storage` events.
- [ ] Run `npm run build`, `npm test`, and `npm run check`.
- [ ] Verify homepage controls and library at desktop and mobile widths.
- [ ] Commit source, tests, and generated output.

### Task 4: Production handoff

**Files:**
- Verify: `worker/wrangler.toml`

**Interfaces:**
- Consumes: verified `dist` output and CTO Cloudflare credentials.
- Produces: deployment instructions for the `xabar` Worker on `alomat.ai`.

- [ ] Provide PowerShell commands that set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the current shell, enter `worker`, and run `npm run deploy`.
- [ ] Remind the user to use the rotated `cfut_...` token and not paste it into chat.
