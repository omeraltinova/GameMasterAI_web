# Security Best Practices Report

## Executive Summary

This security review covered the Next.js + TypeScript frontend and backend surfaces (`app/api/**`, auth/session, request integrity, and client rendering paths).  
As of **March 3, 2026** (re-audit), high-risk findings `SBP-001`, `SBP-002`, `SBP-003`, and `SBP-004` remain fixed. Medium findings `SBP-005`, `SBP-007`, `SBP-008`, `SBP-013`, and `SBP-014` are fixed. Low findings `SBP-009`, `SBP-010`, `SBP-011`, and `SBP-012` are fixed. `SBP-006` remains open.

---

## High Severity

### [SBP-001] IDOR in player-removal endpoint allows cross-campaign membership deletion
- Rule ID: `NEXT-AUTHZ-001`
- Severity: High
- Status: `Fixed` (2026-03-03)
- Location:
  - `app/api/campaigns/[id]/players/[playerId]/route.ts:45`
- Evidence:
  - Endpoint receives both `campaignId` and `playerId`, but the removal path allows deleting `CampaignPlayer` rows by `playerId` without confirming that row belongs to the targeted campaign.
- Impact:
  - A campaign creator can remove a player relation from another campaign they should not control.
- Fix:
  - Scope deletion by both identifiers (for example, `where: { id: playerId, campaignId }` / composite unique key) and fail if the relation is outside the current campaign.
- Mitigation:
  - Add an explicit ownership check on the found `CampaignPlayer` row before delete.

### [SBP-002] Active-session API exposes sensitive nested `User` fields to participants
- Rule ID: `NEXT-DATA-001`
- Severity: High
- Status: `Fixed` (2026-03-03)
- Location:
  - `app/api/campaigns/[id]/active-session/route.ts:23`
  - `prisma/schema.prisma:21`
- Evidence:
  - The active-session response includes nested `creator: true` / `user: true` style objects; `User` model includes sensitive fields such as password hash.
- Impact:
  - Non-admin participants can receive fields that should never leave server boundaries.
- Fix:
  - Replace broad relation includes with explicit field projection (`select`) and return only safe public fields.
- Mitigation:
  - Add centralized response DTO/serializer for `User` objects used by API routes.

### [SBP-003] Auth rate-limit key can be bypassed by spoofing `x-forwarded-for`
- Rule ID: `NEXT-RATE-001`
- Severity: High
- Status: `Fixed` (2026-03-03)
- Location:
  - `lib/security/rateLimit.ts:114`
  - `app/api/auth/[...nextauth]/route.ts:31`
  - `app/api/register/route.ts:9`
- Evidence:
  - IP extraction trusts request header values (`x-forwarded-for`) directly; these values are attacker-controlled unless sanitized by trusted proxy chain logic.
- Impact:
  - Attackers can rotate fake IPs per request to evade login/register throttling.
- Fix:
  - Trust proxy headers only from known edge/proxy; otherwise use platform-provided client IP APIs or hardened proxy-aware parsing.
- Mitigation:
  - Include secondary keys (email/account fingerprint + IP) for auth throttling.

### [SBP-004] Public profile `GET` can write achievements for another user
- Rule ID: `NEXT-AUTHZ-002`
- Severity: High
- Status: `Fixed` (2026-03-03)
- Location:
  - `app/api/users/[id]/route.ts:24`
  - `app/api/users/[id]/route.ts:291`
  - `prisma/schema.prisma:43`
- Evidence:
  - `GET /api/users/:id` path can trigger `userAchievement.create(...)` writes for route param `userId` during profile fetch flow.
- Impact:
  - Any authenticated user can induce writes on another user record by requesting their profile, violating write authorization boundaries.
- Fix:
  - Make public profile endpoint strictly read-only; move achievement materialization to owner-only mutation or backend job flows.
- Mitigation:
  - Temporarily gate write logic with `currentUserId === userId`.

---

## Medium Severity

### [SBP-005] State-changing DB writes occur in `GET` handlers
- Rule ID: `NEXT-HTTP-001`
- Severity: Medium
- Status: `Fixed` (2026-03-03)
- Location:
  - `app/api/campaigns/[id]/active-session/route.ts:8`
  - `app/api/profile/route.ts:7`
  - `app/api/users/[id]/route.ts:11`
- Evidence:
  - `GET` handlers perform creation/update style side effects.
- Impact:
  - Link prefetching/crawlers/unintended navigations can mutate state and increase request-forgery style risk.
- Fix:
  - Keep `GET` strictly read-only; move writes into explicit `POST`/`PATCH` mutations with integrity controls.

### [SBP-006] Global rate-limit store is process-local and non-distributed
- Rule ID: `NEXT-RATE-002`
- Severity: Medium
- Status: `Open`
- Location:
  - `lib/security/rateLimit.ts:13`
- Evidence:
  - Rate-limit state is held in an in-memory `Map`.
- Impact:
  - Limits reset on process restart and are inconsistent across multiple app instances.
- Fix:
  - Move counters to shared storage (Redis/database) with TTL-based atomic operations.

### [SBP-007] Missing rate-limit coverage on multiple mutating endpoints
- Rule ID: `NEXT-RATE-003`
- Severity: Medium
- Status: `Fixed` (2026-03-03)
- Location:
  - `app/api/profile/route.ts:281`
  - `app/api/sessions/[id]/reset/route.ts:14`
  - `app/api/maps/[mapId]/route.ts:82`
- Evidence:
  - Mutating paths were identified without equivalent per-user/per-resource throttling.
- Impact:
  - Easier abuse of expensive or sensitive state-changing operations.
- Fix:
  - Apply endpoint-appropriate rate-limit tiers consistently to all mutating routes.

### [SBP-008] No app-visible baseline security headers/CSP policy
- Rule ID: `NEXT-HEADERS-001`
- Severity: Medium
- Status: `Fixed` (2026-03-03)
- Location:
  - `next.config.ts:3`
  - `app/layout.tsx:38`
- Evidence:
  - No `headers()` configuration or in-repo CSP baseline was found.
- Impact:
  - Reduced defense-in-depth against XSS/clickjacking/content-type confusion.
- Fix:
  - Define baseline security headers in app/edge config and verify at runtime.
- False positive notes:
  - If headers are set at CDN/WAF, document and test that path as source of truth.

### [SBP-013] Additional mutating endpoints still lack request throttling
- Rule ID: `NEXT-RATE-003`
- Severity: Medium
- Status: `Fixed` (2026-03-03)
- Location:
  - `app/api/sessions/[id]/maps/route.ts:24`
  - `app/api/sessions/[id]/maps/route.ts:100`
  - `app/api/messages/[id]/route.ts:20`
  - `app/api/sessions/[id]/npcs/[npcId]/route.ts:24`
  - `app/api/sessions/[id]/npcs/[npcId]/route.ts:99`
  - `app/api/sessions/[id]/npcs/[npcId]/route.ts:214`
- Evidence:
  - Missing endpoint throttles were added using `rateLimitResponse(...)` with `READ`/`WRITE` tiers on session maps, message update, and NPC detail mutate/read paths.
- Impact:
  - Authenticated abuse/brute-force of write paths remains easier and can amplify DB load and spam.
- Fix:
  - Add endpoint-appropriate tiers (`WRITE` / `GAME_ACTION`) for these handlers and return `429` consistently when exceeded.

### [SBP-014] SSE updates endpoint allows high-frequency polling amplification per connection
- Rule ID: `NEXT-DOS-001`
- Severity: Medium
- Status: `Fixed` (2026-03-03)
- Location:
  - `app/api/sessions/[id]/events/route.ts:11`
  - `app/api/sessions/[id]/events/route.ts:12`
  - `app/api/sessions/[id]/events/route.ts:85`
  - `app/api/sessions/[id]/events/route.ts:126`
  - `app/api/sessions/[id]/events/route.ts:147`
- Evidence:
  - SSE stream opening now has explicit throttling, per-user/session concurrent stream caps, and adaptive polling backoff to reduce connection-based amplification.
- Impact:
  - A single authenticated actor can open many streams and multiply DB query load, increasing DoS risk.
- Fix:
  - Enforce per-user/session concurrent stream limits and/or token-bucket throttling for stream creation; consider adaptive backoff and heartbeat-only polling under load.

---

## Low Severity

### [SBP-009] Login path leaks account state via distinct error responses
- Rule ID: `NEXT-AUTH-INFO-001`
- Severity: Low
- Status: `Fixed` (2026-03-03)
- Location:
  - `app/api/auth/[...nextauth]/route.ts:18`
  - `app/api/auth/[...nextauth]/route.ts:53`
- Evidence:
  - Login credential failures now return a uniform failed-auth outcome (`authorize` returns `null`) across unknown user, wrong password, suspended, and soft-deleted states.
- Impact:
  - Enables account enumeration and credential-stuffing optimization.
- Fix:
  - Return consistent auth failure responses for credential errors and include dummy hash comparison to reduce timing signal differences.

### [SBP-010] Pause endpoint enables campaign ID probing via response differences
- Rule ID: `NEXT-AUTH-INFO-002`
- Severity: Low
- Status: `Fixed` (2026-03-03)
- Location:
  - `app/api/campaigns/[id]/pause/route.ts:12`
- Evidence:
  - Route now enforces early `401` for unauthenticated calls before campaign lookup.
- Impact:
  - Attackers can infer valid campaign identifiers with low-cost probing.
- Fix:
  - Enforce early `401` for unauthenticated requests and normalize failure responses.

### [SBP-011] `target="_blank"` link missing `rel="noopener noreferrer"`
- Rule ID: `REACT-NAV-001`
- Severity: Low
- Status: `Fixed` (2026-03-03)
- Location:
  - `app/(admin)/admin/characters/page.tsx:251`
- Evidence:
  - New-tab link now includes `rel="noopener noreferrer"` alongside `target="_blank"`.
- Impact:
  - Reverse-tabnabbing/opener abuse remains possible in some contexts.
- Fix:
  - Add `rel="noopener noreferrer"` for all `target="_blank"` links.

### [SBP-012] External image URLs accepted and rendered without strict allowlisting
- Rule ID: `JS-URL-001`
- Severity: Low
- Status: `Fixed` (2026-03-03)
- Location:
  - `lib/security/imageUrl.ts:1`
  - `lib/validators/characters.ts:24`
  - `app/api/characters/[id]/route.ts:4`
  - `app/api/sessions/[id]/maps/route.ts:121`
  - `app/api/gm/generate-map/route.ts:187`
  - `app/api/gm/generate-location-image/route.ts:328`
  - `components/ui/Avatar.tsx:4`
  - `app/api/messages/[id]/route.ts:32`
  - `app/api/sessions/[id]/npcs/route.ts:113`
  - `app/api/sessions/[id]/npcs/[npcId]/route.ts:148`
  - `components/game/ChatWindow.tsx:119`
  - `components/game/LocationImage.tsx:27`
  - `components/map/MapViewer.tsx:40`
  - `components/map/MapGallery.tsx:125`
- Evidence:
  - Message/NPC/map write paths and corresponding rendering surfaces now consistently use `normalizeImageUrl(...)`, including AI-generated map/location image entry points.
- Impact:
  - Client metadata leaks to attacker-controlled hosts and broader abuse of untrusted remote content.
- Fix:
  - Apply `normalizeImageUrl(...)` (or a trusted media proxy) to all persisted image URL entry points and render paths, not only character/avatar flows.

---

## Remaining Fix Order

1. `SBP-006` distributed/shared rate-limit storage.
