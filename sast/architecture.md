# Architecture: GameMaster AI

> Security reconnaissance baseline produced by the `sast-analysis` skill. This document
> intentionally describes **architecture only** — it does NOT list specific vulnerabilities.
> Subsequent `sast-*` detection skills consume this file and write per-category findings
> to sibling files (`sast/*-results.md`).

## Technology Stack

| Category | Details |
|---|---|
| Languages | TypeScript (`strict`), React 19 TSX, Prisma DSL. `tsx` used for DB seed. |
| Framework | **Next.js 16** (App Router) — server components + Route Handlers (`app/api/**/route.ts`). React 19.2.3. |
| Runtime | Node.js (no edge runtime observed; SSE/route handlers run on nodejs). |
| ORM / DB | **Prisma 5** → **PostgreSQL** (prod). SQLite (`prisma/dev.db`) + `sqlite3` devDep present for local dev. Datasource is `postgresql`. |
| Auth | **NextAuth v4** (`next-auth`), Credentials provider, **JWT strategy**, bcryptjs password hashing. Custom `passwordSignature` claim revokes sessions on password change. |
| Validation | **Zod 4** (only on register, password change, character create/hp). Most other routes use manual inline checks. |
| Rate limiting | In-process `Map`-based limiter (`lib/security/rateLimit.ts`) — **NOT distributed**. IP via `x-forwarded-for`/`x-real-ip` only when `TRUST_PROXY_HEADERS=true`. |
| External services | **OpenRouter** (LLM gateway) for narration / NPC dialogue / image generation. Outbound `fetch` to `https://openrouter.ai/api/v1/chat/completions`. |
| Image hosting | Allowlisted external HTTPS hosts via `NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS`; relative `/...` paths; `data:image/...` base64 (opt-in). Sanitizer: `lib/security/imageUrl.ts`. |
| UI libs | Radix UI, Tailwind 4, Framer Motion, Zustand, next-themes, lucide-react. |
| Testing | Vitest + Testing Library (unit), Playwright (e2e). |
| File logging | `lib/ai/logger.ts` writes raw AI prompts + responses (including user content) to `logs/ai/ai-responses-YYYY-MM-DD.json` via Node `fs`. |

## Architecture Overview

Monolithic Next.js app, single deployable. Logical tiers:

1. **Edge middleware** (`middleware.ts`) — page-level gate only. Protects page routes under `/dashboard, /characters, /campaigns, /scenarios, /players, /profile`; enforces `/admin` → `role === "ADMIN"`. **Does NOT protect `/api/*`** — every API handler must self-gate.
2. **Route Handlers** (`app/api/**/route.ts`) — ~79 files, ~150 method handlers. This is where all business logic, auth, and Prisma access live.
3. **Service layer** (`lib/`) — `lib/auth` (session helpers, RBAC), `lib/security` (rate limit, AI quota, image URL sanitizer), `lib/ai` (OpenRouter client, prompt builder, tool-calling engine), `lib/admin`, `lib/combat`, `lib/db/prisma`.
4. **Data layer** — Prisma models: `User`, `Character`, `Campaign`, `GameSession`, `Message`, `DiceRoll`, `Scenario`, `ScenarioCollection(+Item)`, `NPC`, `Combat`, `InventoryItem`, `Map`, `CampaignPlayer`, `ModerationReport`, `SystemSetting`, `AdminActionLog`, `UserAchievement`.
5. **Roles**: `VISITOR`, `MEMBER`, `ADMIN` on `User.role`. Per-campaign roles derived at runtime: GM (creator) / PLAYER / NONE (`lib/auth/permissions.ts`).

### Auth model in detail
- `getUserId(req)` (`lib/auth/server.ts`) is the dominant gate: calls `getServerSession`, returns `user.id` only if the user exists, is not soft-deleted, and not actively suspended. Used by virtually all member endpoints.
- Admin routes instead inline `getServerSession(authOptions)` then assert `session.user.role === "ADMIN"`. They **do not re-fetch the DB role** on each request — role comes from the JWT, which is refreshed in the `jwt` callback (re-fetches user each request and rebuilds `token.role`).
- Edge middleware uses `getToken({ secret: NEXTAUTH_SECRET })` and checks `token.role` for `/admin` pages.

### AI subsystem
- 11 endpoints under `app/api/gm/*`. Each: `getUserId` → `checkAIRateLimit` (per-user daily token quota) → assemble prompt from DB state + **user-controlled strings** (`playerAction`, `userInput`, `concept`, `appearance`, `details[]`, `theme`, `locationName`, etc.) → `callOpenRouter` / `callOpenRouterWithTools`.
- Tool-calling engine (`lib/ai/toolExecutor.ts`) lets the LLM trigger server-side mutations (`create_npc`, `give_item`, `request_dice_roll`, `update_npc`) — **AI-controlled server-side state changes**.
- AI outputs may be persisted as `Message.content`, `Session.currentState`, `NPC.dialogue`, parsed as JSON, and rendered to other players.

## Data Flow (primary flows)

**Registration / Login**
1. `POST /api/register` → Zod validate → existence-equal response (no enumeration) → bcrypt hash → `User.create` → NextAuth credentials login.
2. `POST /api/auth/[...nextauth]` (or alias `/api/login`) → multi-tier rate limit (global/IP/account/backoff) → bcrypt compare against `DUMMY_BCRYPT_HASH` for non-existent users (timing-equal) → JWT issued with `passwordSignature`.

**Campaign / Session play**
1. `POST /api/campaigns` (creator) or `POST /api/campaigns/[id]/join` (player, invite code in **serializable transaction** w/ retry on `P2034`).
2. `POST /api/campaigns/[id]/active-session` → may invoke `generateOpeningNarration` (AI).
3. `POST /api/gm/narrate` → player action concatenated into prompt → AI → persists PLAYER + GM messages, mutates `Session.currentState`.
4. `GET /api/sessions/[id]/events` → Server-Sent Events stream (DB polling, max 3 concurrent streams per user+session).

**Admin**
1. `GET/PATCH/DELETE /api/admin/*` → `role === "ADMIN"` → mutations logged to `AdminActionLog` via `logAdminAction`.
2. `PATCH /api/admin/moderation/reports/[id]` → transactional claim + optional soft-delete of target entity.

**AI file logging**
Every OpenRouter request/response is mirrored to `logs/ai/ai-responses-YYYY-MM-DD.json` containing the first 500 chars of each message (including user-supplied prompt text) and full response text.

## Entry Points

| Entry Point | Type | Auth Required | Description |
|---|---|---|---|
| `app/api/auth/[...nextauth]` + `/api/login` | HTTP | Public (self-contained) | NextAuth Credentials; multi-tier rate limit. |
| `app/api/register` | HTTP POST | Public | Account creation. |
| `app/api/scenarios` GET, `/scenarios/[id]` GET, `/scenarios/official`, `/scenarios/collections[/*]` | HTTP | **Public (IP rate-limit only or none)** | Scenario browsing. |
| `app/api/system/status`, `/system/stats` | HTTP | **Public, no rate-limit** | Maintenance flag + aggregate counts. |
| `app/api/admin/**` (13 routes) | HTTP | `role === "ADMIN"` (JWT) | User/campaign/character/scenario/collection/moderation/audit/settings/dashboard mgmt. |
| `app/api/auth/password` | HTTP POST | `getUserId` + AUTH_SENSITIVE | Password change. |
| `app/api/profile` | HTTP GET/PATCH/DELETE | `getUserId` | Self-profile; DELETE needs current password. |
| `app/api/characters/**` (7) | HTTP | `getUserId` + ownership | Character + inventory CRUD; some Zod. |
| `app/api/campaigns/**` (11) | HTTP | `getUserId`; creator vs player via permissions lib | Campaign lifecycle, invite codes, join/leave transaction. |
| `app/api/sessions/**` (11) | HTTP | `getUserId` + `getCampaignActorRole` | Messages, state, SSE, NPCs, maps, combat start. |
| `app/api/combat/**` (4) | HTTP | `getUserId`; GM-only for turn/end | Combat state machine. |
| `app/api/dice/**` (4) | HTTP | `getUserId` + GAME_ACTION | Dice rolls; 3 are thin forwarders to `/dice/roll`. |
| `app/api/gm/**` (11) | HTTP | `getUserId` + `checkAIRateLimit` | All AI endpoints. |
| `app/api/messages/[id]` | HTTP PATCH/PUT | `getUserId`; creator OR message sender | Edit message metadata. |
| `app/api/maps/[mapId]` | HTTP GET/PUT/DELETE | `getUserId`; creator (or +player for GET) | Map CRUD. |
| `app/api/reports` | HTTP POST | `getUserId` | File moderation report. |
| `app/api/users` GET, `/users/[id]` GET | HTTP | `getUserId` | User search + privacy-filtered public profile. |
| `middleware.ts` | Edge | Token-based | Page-level gate for `/dashboard,/characters,/campaigns,/scenarios,/players,/profile,/admin`. |

## Trust Boundaries

1. **Internet → Next.js runtime.** All HTTP input is untrusted. `TRUST_PROXY_HEADERS` controls whether `x-forwarded-for`/`x-real-ip` are trusted for rate-limit keying.
2. **Next.js → API handler.** No middleware protection on `/api/*`; every handler is its own enforcement point. **High risk of missed checks** on any new route.
3. **API handler → Prisma / PostgreSQL.** Filtered through Prisma parameterized queries (no raw SQL observed anywhere — `grep` for `$queryRaw`/`$executeRaw` returned nothing). User-controlled IDs flow into `where:{id:...}` everywhere.
4. **Server → OpenRouter (LLM).** Outbound only; server holds `OPENROUTER_API_KEY`.
5. **LLM → Server (tool execution).** AI tool calls trigger real DB mutations (`create_npc`, `give_item`, etc.). AI is treated as a semi-trusted actor but is steerable by **in-session user text** (prompt-injection vector).
6. **Server → Filesystem.** `lib/ai/logger.ts` writes to `logs/ai/`. Filename is date-derived (no user input) — no traversal, but it persists **user-generated content** and AI output to disk.
7. **Server → Browser rendering.** React escapes by default; no `dangerouslySetInnerHTML` / `eval` / `new Function` / `child_process` found in app code (`rg` returned nothing).

## Sensitive Data Inventory

| Data Type | Where Stored | How Accessed | Protection |
|---|---|---|---|
| Password hashes | `User.password` (bcrypt `$2a$`) | Compared in `authorize`, `auth/password`, `profile` DELETE | bcryptjs; `passwordSignature` claim invalidates JWT on change |
| Emails | `User.email` | Returned in admin endpoints (`admin/campaigns`, `admin/active-sessions` include `creator.email`); profile | Unique; not enumerated at register; not exposed on public scenario endpoints |
| NextAuth JWT | Client cookie | Decoded in middleware + handlers | Signed with `NEXTAUTH_SECRET`; carries `id,email,name,role,passwordSignature` |
| `OPENROUTER_API_KEY` | Env | Used in `lib/ai/openrouter.ts` | Server-side only; never sent to client |
| `NEXTAUTH_SECRET` | Env | JWT signing, `passwordSignature` | Server-side only |
| `DATABASE_URL` | `.env` / `.env.local` | Prisma client | Server-side only |
| User-generated content | `Character.backstory`, `Scenario.*`, `Message.content`, `NPC.dialogue`, `DiceRoll.purpose`, AI prompt inputs | DB → AI prompts → AI responses → other players' screens | None at rest; sanitized only via `normalizeImageUrl` for image fields |
| AI logs | `logs/ai/ai-responses-*.json` | `fs` reads/writes | Filesystem perms; contains truncated prompts + full responses incl. user text |
| Invite codes | `Campaign.inviteCode` (4-byte hex from `randomBytes`) | `campaigns/join` lookup | Only exposed to campaign creator; **short entropy (32 bits)** |
| Admin audit logs | `AdminActionLog` | `admin/audit` (ADMIN only) | ADMIN-gated |
| Moderation reports | `ModerationReport` | `admin/moderation/reports` (ADMIN) | ADMIN-gated; dedup on PENDING |
| IP addresses | Rate-limit `Map` (ephemeral, per-process) | `getClientIp` | Never persisted to DB |

## Notes for Downstream Detection Skills

- **No raw SQL anywhere** → `sast-sqli` should confirm and produce a "no findings" result quickly.
- **No file upload endpoints** → `sast-fileupload` will likely produce no findings (image inputs are URLs/data-URLs validated by `normalizeImageUrl`, not uploads).
- **No GraphQL, no XML parsing, no template engines** → `sast-graphql`, `sast-xxe`, `sast-ssti` will produce no findings.
- **Highest-value targets** for this stack:
  - `sast-idor` — pervasive user-controlled IDs in `where:{id}`; ownership checks are per-route and inconsistent (e.g., `messages/[id]` lets campaign creator edit others' messages; admin routes mutate by body/query `id`).
  - `sast-missingauth` — 9+ fully public endpoints; admin role read from JWT without DB re-fetch on admin mutation paths.
  - `sast-jwt` — custom JWT callbacks, `passwordSignature`, `revokeToken`, `NEXTAUTH_SECRET` defaults.
  - `sast-businesslogic` — AI prompt injection (LLM → DB tool calls), invite-code entropy (32-bit), race conditions (campaign join has a transaction; combat/dice do not), rate-limiter bypass (in-process + email/unknown-keying).
  - `sast-hardcodedsecrets` — confirm `.env`/`.env.local` (present in repo dir) are gitignored; check `DUMMY_BCRYPT_HASH` and `"local-dev-secret"` default.
  - `sast-xss` — low likelihood (React auto-escape, no `dangerouslySetInnerHTML`) but verify AI-generated markdown/HTML rendering and `locationImageUrl`/`imageUrl` sinks.
