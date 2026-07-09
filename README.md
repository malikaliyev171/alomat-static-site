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

## Deploy

Use `dist/` as the static publish directory for GitHub Pages, Cloudflare Pages, Netlify, or any static host.
