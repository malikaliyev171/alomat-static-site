# Trilingual Site Design

## Goal

Enable Uzbek, English, and Turkish across the public site while keeping translation generation in the Telegram bot and translation storage/rendering in the website Worker.

## Responsibilities

- The Telegram bot sends Uzbek content plus `title_en`, `summary_en`, `rich_summary_en`, `title_tr`, `summary_tr`, and `rich_summary_tr` for every new standalone post and AI Digest.
- The website Worker validates and stores all three language variants in D1.
- The website returns all available translations from `GET /api/signals`.
- The static site generates Uzbek, English, and Turkish routes and exposes an active `EN / UZ / TR` control.

## API Contract

The existing Uzbek fields remain canonical and backwards compatible:

```json
{
  "external_id": "1003",
  "title": "O'zbekcha sarlavha",
  "title_en": "English headline",
  "title_tr": "Turkce baslik",
  "summary": ["O'zbekcha paragraf"],
  "summary_en": ["English paragraph"],
  "summary_tr": ["Turkce paragraf"],
  "rich_summary": [],
  "rich_summary_en": [],
  "rich_summary_tr": [],
  "source": "example.com",
  "url": "https://example.com/article",
  "language": "uz",
  "created_at": "2026-07-13T12:00:00Z"
}
```

AI Digest rich-summary translations preserve every segment URL exactly and translate only segment text.

## Storage

D1 receives six nullable translation columns:

- `title_en`, `summary_en_json`, `rich_summary_en_json`
- `title_tr`, `summary_tr_json`, `rich_summary_tr_json`

Existing rows remain valid. If a requested translation is absent, the client falls back to the canonical Uzbek content so old news never becomes blank.

## Routes And Controls

- Uzbek: `/index.html`, `/about.html`, `/lineup.html`, `/library/`
- English: `/en.html`, `/en-about.html`, `/en-lineup.html`, `/en/library/`
- Turkish: `/tr.html`, `/tr-about.html`, `/tr-lineup.html`, `/tr/library/`

The shared top bar renders three active links in the fixed order `EN / UZ / TR`. Each link targets the equivalent page in that locale. The selected locale remains visually active, and switching locale preserves the current section.

## Rendering

Static interface copy is authored in all three locales. Live story normalization chooses the current locale's title, summary, and rich summary, then falls back to Uzbek. Source, time, score, URL, external ID, and creation time are language independent.

Local library entries retain all supplied translations so saved stories render in the selected locale without another network request.

## Verification

- Worker tests cover validation, insertion, update, and API output for English and Turkish fields.
- Client tests cover locale selection, fallback behavior, Turkish routes, and preservation of AI Digest links.
- Build checks confirm all three route families and active language controls.
- Browser checks cover desktop and mobile switching between `UZ`, `EN`, and `TR`.
