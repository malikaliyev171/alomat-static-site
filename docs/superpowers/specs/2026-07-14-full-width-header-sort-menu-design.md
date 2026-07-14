# Full-width Header and Sort Menu Design

## Scope

Redesign the shared signal header as a full-width band and add a UI-only sort menu. Signal ordering and backend behavior remain unchanged.

## Layout

Desktop order is: brand, primary navigation, sort menu, language control, palette control. The sort menu sits immediately to the right of Library. The header background and bottom divider span the viewport while content keeps responsive side padding.

On compact screens, controls wrap into an intentional second row without horizontal overflow. The brand remains readable and the sort menu remains touch-friendly.

## Sort Menu

Use a custom button and popup menu so it follows every site palette. The button displays the selected option and a downward chevron. Opening the menu rotates the chevron and reveals:

- Newest to oldest
- Most popular news
- Oldest to newest

Selecting an option updates only the button label and selected state. It does not reorder signals yet. The menu closes after selection, on outside click, and on Escape. Keyboard focus and ARIA states remain visible and accurate.

## Validation

Add build-level tests for header order and menu markup, behavior tests for opening and selecting, and CSS checks for full-width desktop and compact layouts. Verify desktop and mobile in the browser across palettes.
