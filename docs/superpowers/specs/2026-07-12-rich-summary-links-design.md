# Rich Summary Links Design

## Goal

Preserve Telegram's hidden word-to-link mappings for digest stories and render those linked words safely inside the story detail text.

## Scope

- Add an optional `rich_summary` API field containing paragraphs made of text segments.
- A segment may contain plain `text` or `text` plus an HTTP(S) `url`.
- Keep the existing string `summary` field for compatibility and fallback rendering.
- Leave the existing `Asl manba` button unchanged.

## API Shape

```json
{
  "summary": ["OpenAI yangi modelini e'lon qildi."],
  "rich_summary": [
    {
      "segments": [
        { "text": "OpenAI", "url": "https://openai.com/example" },
        { "text": " yangi modelini e'lon qildi." }
      ]
    }
  ]
}
```

The bot must send the Telegram entity/HTML link mapping in this structured field. The website cannot reconstruct a hidden URL after the bot has reduced it to plain text.

## Storage And Compatibility

- Add a nullable/default-empty D1 JSON text column for `rich_summary`.
- Validate and normalize the structured paragraphs in the Worker before storage.
- Return `rich_summary` from `GET /api/signals`.
- Existing records and bot payloads without `rich_summary` continue to use plain `summary`.

## Security

- Accept only `http:` and `https:` URLs.
- Reject control characters and unsafe URL syntax.
- Limit paragraph, segment, and text counts using the existing signal text limits.
- Escape all segment text before creating markup.
- Open links in a new tab with `rel="noreferrer noopener"`.

## Presentation

- Linked words inherit the surrounding paragraph color; they are not blue.
- Use a slightly heavier font weight than surrounding text.
- Show a thin underline on hover and keyboard focus.
- Keep the underline color inherited from the text so it remains visible across palettes.

## Verification

- Worker tests cover normalization, unsafe URL removal, storage, and API output.
- Client tests cover safe rich-text rendering and plain-summary fallback.
- Browser checks cover desktop/mobile layout and link hover/focus styling.
