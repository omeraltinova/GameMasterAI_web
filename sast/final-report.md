# SAST Final Report — GameMaster AI

**Target:** `gamemaster-ai/` (Next.js 16 App Router + Prisma/PostgreSQL + NextAuth JWT + OpenRouter LLM)
**Date:** 2026-06-19 · **Re-scan:** 2026-06-24
**Method:** `sast-analysis` → `sast-{idor,missingauth,jwt,hardcodedsecrets,xss,businesslogic}` (architecture-first methodology)
**Scope note:** Per `sast/architecture.md`, the following classes were **out of scope / not applicable** because the corresponding sinks are absent from the codebase: **SQLi** (no raw SQL / `$queryRaw` anywhere — Prisma parameterizes all queries), **file upload** (no upload endpoints; image inputs are URL/data-URL strings validated by `normalizeImageUrl`), **GraphQL/SSTI/XXE/RCE/path-traversal** (no GraphQL, no template engines, no XML parsing, no `eval`/`child_process`/dynamic-fs-with-user-input).

---

## Re-scan 2026-06-24 — Status

A full re-audit of all in-scope classes was run against current code (after the 2026-06-19 hardening commits).

**All prior findings are FIXED:** BL-1 (AI tool bounds), BL-2 (72-bit invite codes), BL-3 (distributed rate-limit option + docs), BL-4 (stat/gold caps), BL-5 (combat optimistic locking), BL-6 (gmPrompt schema validation), IDOR-1 (message-metadata sender restriction), AUTH-1 (READ rate-limit on public GETs), AUTH-2 (`/api/*` middleware matcher), JWT-1/SEC-1 (fail-fast secret), SEC-2 (test placeholder), XSS (still 0).

**New findings discovered in the re-scan — all now FIXED in this pass:**

| ID | Sev | Finding | Fix |
|----|-----|---------|-----|
| NEW-1 | Medium | `POST /api/sessions/[id]/npcs` let any campaign player (not just GM) create NPCs with arbitrary stats fed into combat | Restricted to GM (`canManageCampaign`); NPC `stats` sanitized to bounded `{hp,maxHp,ac}` via `sanitizeNpcCombatStats` |
| NEW-2 | Low | `POST /api/characters` accepted unbounded `level/experience/hp/maxHp` (near-immortal characters into shared campaigns) | `characterCreateSchema` caps `hp/maxHp` ≤ 1000, `experience` ≤ 20000, `hp ≤ maxHp` refine |
| NEW-3 | Low | `PUT /api/characters/[id]/hp` let the owner raise `maxHp` without bound | `characterHpUpdateSchema` caps `maxHp` ≤ 1000, `hp ≤ maxHp` refine |
| NEW-4 | Info | Direct inventory POST accepted free-form `type` (vocabulary drift vs the AI tool) | Both paths now validate against the shared `ALLOWED_ITEM_TYPES` allowlist (`lib/game/items.ts`) |

New regression tests added: `__tests__/api/sessions/npc-create-auth.test.ts`, `__tests__/api/characters/equip-slots.test.ts`, and bounds tests in `__tests__/lib/validators.test.ts` / `__tests__/lib/ai/toolExecutor.test.ts`.

**Posture after re-scan: strong.** No SQLi, XSS, IDOR (data-theft), auth bypass, hardcoded-secret, or JWT flaws. The one genuine new access-control gap (NEW-1) is closed.

---

## Risk Summary

| Sev | Count | Findings |
|-----|-------|----------|
| High | 1 | BL-1 Prompt-injection → AI tool game-state abuse |
| Medium | 2 | BL-2 32-bit invite codes; BL-3 non-distributed rate limiter |
| Low | 4 | BL-4 self-stat/gold inflation; BL-5 combat race; BL-6 AI-output parse shaping; IDOR-1 GM edits others' message metadata |
| Info/Hardening | 6 | Predictable signature fallback (JWT-1, SEC-1); dummy hash & test placeholder (SEC-2/3); 3 unrated public GETs + no API auth middleware (AUTH-1/2) |

**Overall posture: strong.** No SQLi, XSS, IDOR (data-theft), auth bypass, hardcoded-secret, or classic-JWT flaws. The real risk concentrates in **business logic around the LLM tool bridge** and **rate-limit/invite-code design**.

---

## Prioritized Remediation Plan

### P0 — Fix now
**BL-1 (High) — Validate & bound AI tool arguments server-side.** `lib/ai/toolExecutor.ts`
- Clamp `give_item.quantity` (e.g. 1–20), enforce `itemType` enum, cap string lengths.
- Route mutation tools (`give_item`, `create_npc`) through GM authorization, not auto-execute on any player narration.
- Validate all tool args with Zod before execution (treat the model as hostile input).
- *Why P0:* reachable by any logged-in player in any session; corrupts shared multiplayer state.

### P1 — Fix soon
**BL-2 (Medium) — Invite-code entropy.** `app/api/campaigns/route.ts:152`, `app/api/campaigns/[id]/invite/route.ts:54`
- `randomBytes(4)` (32-bit) → `randomBytes(9)`+ base32 (≥72-bit). Add per-IP **and** per-account backoff on failed joins.

**BL-3 (Medium) — Distributed rate limiting.** `lib/security/rateLimit.ts`
- Replace in-process `Map` with Upstash Redis / Vercel KV / Prisma table. Until then, document single-instance requirement and keep `TRUST_PROXY_HEADERS` guidance accurate.

### P2 — Schedule
- **BL-4** Bound `stats` (3–20 each) and `gold` on `PUT /api/characters/[id]`.
- **BL-5** Wrap `combat/[id]/action` read-modify-write in a serializable transaction / optimistic lock.
- **BL-6** Zod-validate the AI `gmPrompt` payload (clamp `dc`/`diceCount`/`modifier`) before persist.
- **AUTH-1** Add per-IP `READ` rate limit to `system/status`, `system/stats`, `scenarios/official`.
- **AUTH-2** Add an `/api/*` matcher to `middleware.ts` with a public allowlist as a safety net for future routes.

### P3 — Hardening
- **JWT-1 / SEC-1** Fail fast when `NEXTAUTH_SECRET` is unset instead of falling back to `"local-dev-secret"` (`app/api/auth/[...nextauth]/route.ts:27`).
- **SEC-2** Delete or relocate `DataBase_SetupAndTest/test-db.ts` (placeholder `"hashed_password_123"`).
- **IDOR-1** Decide & document whether GMs may edit other players' message `locationImageUrl/Name` (`app/api/messages/[id]/route.ts`); restrict to sender if not intended.

---

## Detail File Index
| File | Category | Result |
|---|---|---|
| `sast/architecture.md` | Recon baseline | tech stack, data flow, entry points, trust boundaries |
| `sast/businesslogic-results.md` | Business logic | 1 High, 2 Medium, 3 Low |
| `sast/idor-results.md` | IDOR | 0 vulnerable; 1 needs-review |
| `sast/missingauth-results.md` | Auth / access control | 0 vulnerable; 2 hardening |
| `sast/jwt-results.md` | JWT / tokens | 0 vulnerable; 1 hardening |
| `sast/hardcodedsecrets-results.md` | Secrets | 0 real secrets; 3 info |
| `sast/xss-results.md` | XSS | 0 vulnerable |

## Notable strengths (keep doing these)
- Per-request DB re-validation of `isSoftDeleted`/`isSuspended`/role in `getUserId()` + the NextAuth `jwt` callback.
- Object authorization is consistently enforced (ownership / creator-or-player scoping) across all non-admin object routes.
- Parameterized Prisma queries everywhere; no raw SQL.
- React auto-escaping everywhere; no `dangerouslySetInnerHTML`/markdown/`eval` sinks.
- Image URLs funneled through an allowlist sanitizer (SVG data-URI blocked).
- Login/register anti-enumeration and timing equalization; serializable transaction on campaign join.
