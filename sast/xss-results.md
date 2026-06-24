# XSS Results: GameMaster AI

## Executive Summary
- Vulnerable: **0**
- Hardening: **0**

No cross-site scripting vector was found. The entire UI renders text through React 19's default escaping. There is **no** `dangerouslySetInnerHTML`, **no** markdown renderer (`react-markdown`/`marked`/`remark`/`rehype`), **no** `innerHTML` assignment, **no** `eval`/`new Function`, and **no** `javascript:`-scheme sink anywhere in `app/`, `components/`, `hooks/`, `contexts/`, or `store/` (`rg` returned no matches).

## Findings

### [NOT VULNERABLE] Stored content (user + AI-generated) rendering
- All persisted free-text (`Message.content`, `Character.backstory`, `Scenario.description`/`startingPrompt`, `NPC.personality`/`dialogue`, AI `narration`, `gmPrompt.*.label`, etc.) is rendered as React text children → auto-escaped. AI responses parsed as JSON (e.g. `app/api/gm/narrate/route.ts:137`) are bound into text props, not raw HTML.

### [NOT VULNERABLE] Image URL sinks (`<img src>`)
- Every persisted image field flows through `normalizeImageUrl()` (`lib/security/imageUrl.ts`):
  - `https:` only when host is in `NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS` (admin-configured allowlist, supports `*.suffix` wildcards);
  - `http:` only on localhost in non-production;
  - relative `/...` paths (rejects protocol-relative `//`);
  - `data:image/{png,jpeg,jpg,webp,gif,avif};base64,...` only when explicitly opted in (`allowDataUrl: true`, used only on `characters/[id]` PUT), with an 8 MiB cap and strict base64 regex.
- `image/svg+xml` data URLs are **not** in the allowlist → SVG-script XSS via data URI is blocked. `javascript:` / other schemes are rejected by the `https:`/`http:` whitelist.

### [NOT VULNERABLE] URL-in-`href` / `window.open` sinks
- No user-controlled value is placed into an anchor `href` or passed to `window.open`/`location` without URL validation; the image sanitizer covers the only persisted-URL surface.

No remediation required for XSS.
