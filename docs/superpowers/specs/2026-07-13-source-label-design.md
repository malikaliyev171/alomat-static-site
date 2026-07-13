# Source Label Design

## Goal

Show a short, uppercase site name in the story detail panel without changing the source link destination.

## Rules

- Remove `www` and the public domain suffix from ordinary hosts.
- Use the registrable domain label for ordinary subdomains: `info.arxiv.org` becomes `ARXIV`.
- For hosted publishing platforms such as WordPress, Substack, Medium, Blogspot, and GitHub Pages, use the tenant subdomain: `terrytao.wordpress.com` becomes `TERRYTAO`.
- Render every generated source label in uppercase.
- Keep the existing source text as a fallback when the URL is missing or invalid.
- Do not modify the actual source URL used by the source button.

## Examples

| URL | Label |
| --- | --- |
| `https://marktechpost.com/article` | `MARKTECHPOST` |
| `https://info.arxiv.org/about` | `ARXIV` |
| `https://terrytao.wordpress.com/post` | `TERRYTAO` |
| `https://example.substack.com/p/post` | `EXAMPLE` |
| `https://alomat.ai` | `ALOMAT` |

## Verification

Unit tests will cover ordinary domains, subdomains, hosted publishing platforms, uppercase output, invalid URLs, and preservation of the source link.
