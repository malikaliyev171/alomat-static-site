# .alomat Static Site

Static bilingual editorial site for .alomat.

## Requirements

- Node.js 20 or newer
- No npm dependencies are required

## Commands

```bash
npm run build
```

Generates the deployable site in `dist/`.

```bash
npm run preview
```

Serves `dist/` at `http://127.0.0.1:8123/index.html`.
If that port is busy, the server automatically tries the next port. You can also set `PORT`, for example `$env:PORT=8124; npm run preview` in PowerShell.

```bash
npm run check
```

Builds the site and validates generated pages, local links, and publishing placeholders.

## Live Telegram Signals

The home timeline can load live cards from a Cloudflare Worker API. The browser does not call Telegram directly. The existing Telegram bot sends each new signal to the Worker:

```bash
curl -X POST "https://habar.alomat.workers.dev/api/signals" \
  -H "Authorization: Bearer example-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "telegram-message-123",
    "title": "Signal card title",
    "summary": ["Short explanation 1", "Short explanation 2"],
    "source": "Source name",
    "url": "https://example.com/source",
    "category": "ai",
    "image": "https://example.com/image.jpg",
    "language": "uz",
    "created_at": "2026-07-10T13:20:00.000Z"
  }'
```

The site reads:

```text
GET /api/signals?limit=20
```

Telegram can also send bot updates directly to the Worker webhook:

```text
POST https://habar.alomat.workers.dev/api/telegram-webhook
```

The Worker accepts `message` and `channel_post` updates. The first non-empty line becomes the card title. Remaining non-empty lines become the timeline/detail text. If the message contains an `http` or `https` link, the first link becomes the source URL.

For local Worker development, create `worker/.dev.vars` with the same bearer token the bot will use:

```text
ALOMAT_SIGNALS_SECRET=local-secret
TELEGRAM_WEBHOOK_SECRET=local-telegram-secret
```

Then run the Worker locally:

```powershell
cd worker
npm run d1:migrate:local
npm run dev
```

For local static builds that need a remote Worker URL, set:

```powershell
$env:ALOMAT_SIGNALS_API_BASE="https://habar.alomat.workers.dev"
npm run build
```

If the API is unavailable or empty, the generated fallback timeline remains visible.

## Deploy

Deploy the Worker before building the static site against it:

1. Create the D1 database, for example `wrangler d1 create alomat_signals`.
2. Copy the returned D1 id into `worker/wrangler.toml` by replacing the placeholder `database_id = "00000000-0000-0000-0000-000000000000"`.
3. Set the Worker secret that the Telegram bot will use:

```powershell
cd worker
npx wrangler secret put ALOMAT_SIGNALS_SECRET
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

4. Apply the remote D1 migrations:

```powershell
npm run d1:migrate:remote
```

5. Deploy the Worker:

```powershell
npm run deploy
```

6. Set the Telegram webhook after deploy. Use the real bot token from BotFather and the same webhook secret stored in Cloudflare:

```powershell
$env:TELEGRAM_BOT_TOKEN="<bot-token>"
$env:TELEGRAM_WEBHOOK_SECRET="<same-secret-used-above>"
$body = @{
  url = "https://habar.alomat.workers.dev/api/telegram-webhook"
  secret_token = $env:TELEGRAM_WEBHOOK_SECRET
  allowed_updates = @("message", "channel_post")
  drop_pending_updates = $false
} | ConvertTo-Json -Compress
Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.telegram.org/bot$env:TELEGRAM_BOT_TOKEN/setWebhook" `
  -ContentType "application/json" `
  -Body $body
```

7. Build the static site with the deployed Worker base URL:

```powershell
cd ..
$env:ALOMAT_SIGNALS_API_BASE="https://habar.alomat.workers.dev"
npm run build
```

8. Deploy `dist/` to GitHub Pages, Cloudflare Pages, Netlify, or any static host.
