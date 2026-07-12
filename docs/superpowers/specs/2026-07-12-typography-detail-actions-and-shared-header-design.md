# Typography, Detail Actions, and Shared Header Design

## Goal

Improve Uzbek character rendering, simplify the home detail panel, and give the Manifesto and Lineup pages the same navigation chrome as the homepage.

## Typography

- Replace Nunito as the body/interface family with Noto Sans from Google Fonts.
- Keep the existing display serif stack for editorial headings.
- Preserve the existing weight range and typography tokens so layout changes remain limited.
- Use Noto Sans for Uzbek text containing modifier-letter apostrophes such as `oʻ` and `gʻ`; do not rewrite valid Uzbek text to ASCII apostrophes.
- Keep system sans-serif fallbacks after Noto Sans.

## Detail Panel Actions

- Remove the AI lens label, the `AI so'rash` text, and the AI button.
- Remove the separate footer action row to avoid duplicate controls.
- Place one compact action row after the story body:
  - `ASL MANBA` link on the left.
  - Like, save, and share icon buttons on the right.
- Keep the existing local-library behavior for like and save.
- Keep native share with clipboard fallback.
- Keep the original source URL sanitization and external-link attributes.
- Allow the story body to use the vertical space freed by removing the AI and duplicate footer content.

## Shared Header

- Treat Home, Library, Manifesto, and Lineup as pages using the same signal topbar.
- Render the homepage topbar on Manifesto and Lineup in both Uzbek and English outputs.
- Mark Manifesto or Lineup as active in the topbar when its page is open.
- Remove the Manifesto internal back-home header.
- Remove the Lineup-specific `alomat / lineup` header and its redundant links.
- Preserve the Lineup page content, article links, imagery, and footer below the shared topbar.
- Keep article-detail pages unchanged unless they already use the shared site header through their current document path.

## Responsive Behavior

- The shared topbar follows the existing homepage mobile horizontal-scroll behavior.
- The detail action row wraps only when required on narrow screens; source and icon controls must remain usable without overlap.
- Noto Sans must not introduce horizontal page overflow at supported mobile widths.

## Accessibility

- Icon buttons retain accessible labels and pressed state for like/save.
- The original-source control remains a semantic link.
- The active topbar page receives an `is-active` visual state and `aria-current="page"`.
- Removing redundant navigation must not remove the skip link or the only path back to the homepage.

## Verification

- Add tests for the Noto Sans font token and removal of Nunito.
- Add detail markup tests proving AI controls are absent and source/like/save/share remain.
- Add generated-page tests proving Manifesto and Lineup use `topbar--home` and no longer contain their old internal headers.
- Run the complete site and Worker test suites plus the site readiness check.
- Visually verify the home detail panel and Manifesto/Lineup at desktop and mobile widths.
