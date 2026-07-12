# Library and Home Visual Parity

## Goal

Make the library feel like a direct continuation of the homepage while preserving its archive-specific content. Remove the redundant name-entry action because access to the library already requires a completed reader profile.

## Visual Changes

- Apply the homepage topbar surface, border, shadow, and palette rules to both `home` and `library` pages.
- Apply the homepage footer panel, social-chip sizing, compact social icons, and footer color rules to the library page.
- Reduce the library hero heading to the homepage reader-heading scale.
- Reduce archive row headings and the library status heading to the homepage timeline/detail typography scale.
- Keep existing responsive constraints and ensure mobile typography does not grow beyond the desktop hierarchy.

## Content Change

- Remove the `Ism qoldirish` / name-entry link from the library memory section.
- Keep the informational library-state copy so the section still explains how saved signals will appear.

## Implementation Boundaries

- Extend the existing homepage-scoped CSS rules to the library instead of creating a second visual system.
- Change only library typography and the shared signal-page chrome.
- Do not alter library access control, saved-signal behavior, navigation, or homepage layout.

## Verification

- Add build-output assertions proving the library has no name-entry action.
- Add stylesheet assertions proving home and library share topbar/footer selectors and the reduced typography scale.
- Run the full build and test suite.
- Inspect desktop and mobile library renders for matching background continuity, compact typography, footer parity, and horizontal overflow.
