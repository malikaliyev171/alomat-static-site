# Reader Sigil and Detail Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the signed-in reader sigil palette-aware and reclaim unused space below story actions for the readable story body.

**Architecture:** Keep the change CSS-only. Extend the existing style regression suite to enforce palette-token usage and empty-status collapsing, then rebuild the generated static output.

**Tech Stack:** Static HTML generator, CSS custom properties, Node.js test runner.

## Global Constraints

- Preserve the current sigil dimensions and broadcast glyph.
- Preserve desktop and mobile action behavior.
- Add no new dependency.

---

### Task 1: Palette-Aware Reader Sigil

**Files:**
- Modify: `test/styles.test.mjs`
- Modify: `styles.css:1256-1298`

**Interfaces:**
- Consumes: Existing `--bg`, `--surface`, `--surface-strong`, and `--text` palette tokens.
- Produces: A signed-in reader sigil with no hard-coded white gradient or fixed dark foreground.

- [ ] **Step 1: Write the failing style regression test**

```js
test("signed-in reader sigil derives its colors from the active palette", () => {
  const styles = readProjectFile("styles.css");
  const axis = cssBlock(styles, ".signal-reader-gate__axis");
  const sigil = cssBlock(styles, ".signal-reader-gate__sigil");

  assert.match(axis, /color:\s*var\(--text\);/);
  assert.match(sigil, /background:\s*color-mix\(in srgb, var\(--bg\) 88%, var\(--surface\) 12%\);/);
  assert.doesNotMatch(sigil, /rgba\(255, 255, 255|white 12%/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="signed-in reader sigil" test/styles.test.mjs`

Expected: FAIL because the current sigil contains a fixed white gradient and the axis uses `#121418`.

- [ ] **Step 3: Implement palette-derived styles**

```css
.signal-reader-gate__axis {
  color: var(--text);
}

.signal-reader-gate__sigil {
  background: color-mix(in srgb, var(--bg) 88%, var(--surface) 12%);
  color: var(--text);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--surface-strong) 42%, transparent),
    0 0 0 12px color-mix(in srgb, var(--bg) 78%, transparent),
    0 18px 38px color-mix(in srgb, var(--text) 15%, transparent);
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test --test-name-pattern="signed-in reader sigil" test/styles.test.mjs`

Expected: PASS.

### Task 2: Reclaim Story Detail Bottom Space

**Files:**
- Modify: `test/styles.test.mjs`
- Modify: `styles.css:2100-2105`
- Modify: `styles.css:3716-3722`
- Regenerate: `dist/**`

**Interfaces:**
- Consumes: Existing `.timeline-panel__action-status` element and `.signal-detail.has-story .signal-detail__content` grid.
- Produces: An action row nearer the panel bottom and a taller scrollable story body while retaining feedback text when populated.

- [ ] **Step 1: Write the failing style regression test**

```js
test("story detail collapses an empty action status to enlarge the body", () => {
  const styles = readProjectFile("styles.css");

  assert.match(styles, /\.timeline-panel__action-status:empty\s*\{[\s\S]*?display:\s*none;/);
  assert.match(
    cssBlock(styles, ".signal-detail.has-story .signal-detail__content"),
    /padding-bottom:\s*6px;/,
  );
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-name-pattern="story detail collapses" test/styles.test.mjs`

Expected: FAIL because empty status currently reserves height and story content keeps the full bottom padding.

- [ ] **Step 3: Implement the spacing change**

```css
.signal-detail.has-story .signal-detail__content {
  padding-bottom: 6px;
}

.timeline-panel__action-status:empty {
  display: none;
}
```

- [ ] **Step 4: Run focused and complete verification**

Run:

```powershell
npm run build
npm test
npm run check
git diff --check
```

Expected: Build succeeds, all tests pass, readiness check passes, and no whitespace errors are reported.

- [ ] **Step 5: Verify responsive behavior**

Open the local home page at desktop and `390x844` mobile widths. Confirm the sigil follows palettes `0`, `2`, and `4`, the action row remains fully visible, and no horizontal overflow appears.
