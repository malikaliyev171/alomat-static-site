# Reader Sigil and Detail Spacing Design

## Goal

Keep the signed-in reader sigil visually consistent with every active palette and use the unused space below the story actions to enlarge the readable story area.

## Reader Sigil

- Remove the hard-coded white gradient and fixed dark foreground from the signed-in sigil.
- Derive the sigil surface, border, foreground, inner highlight, outer ring, and shadow from the existing `--bg`, `--surface`, `--surface-strong`, and `--text` palette tokens.
- Preserve the current dimensions and broadcast glyph so the header layout does not shift.

## Story Detail Layout

- Collapse the action status element while it is empty so it reserves no grid row or bottom margin.
- Reduce story-detail bottom padding slightly so the source and icon action row sits lower in the panel.
- Let the existing `minmax(0, 1fr)` story body consume the released vertical space.
- Show the status element normally when an action writes feedback into it.

## Responsive Behavior

- Apply the same rules on desktop and mobile.
- Preserve the mobile sticky action row and avoid horizontal overflow.

## Verification

- Add CSS regression tests for palette-derived sigil styling and collapsed empty action status spacing.
- Run the complete site test and readiness-check commands.
- Compare computed styles across representative dark, light, and signal palettes in the local browser.
