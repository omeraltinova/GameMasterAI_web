# Missing-Auth / Broken Function-Level Access Control Results: GameMaster AI

## Executive Summary
- Endpoints audited: ~150 handlers across 79 route files
- Vulnerable (unauthenticated access to sensitive function): **0**
- Likely Vulnerable / Hardening Needed: **2** (informational / low)
- Properly Gated: all member + admin routes

All member endpoints gate via `getUserId()` (which re-checks `isSoftDeleted`/`isSuspended` against the DB on every request). All 13 admin route files perform an inline `getServerSession(authOptions)` + `session.user.role === "ADMIN"` check on every exported method. No sensitive function was found reachable without auth.

> Note on the admin import: admin files use `import { getServerSession } from "next-auth"` (bare) rather than the documented `"next-auth/next"`. In `next-auth@4.24.13` this resolves and works (verified by the presence of a functioning admin surface), but it is not the documented App Router form. Recommend standardizing on `"next-auth/next"` to avoid breakage on upgrade.

## Findings

### [HARDENING] Three public endpoints have **no rate limiting**
- **Files**:
  - `app/api/system/status/route.ts` (GET)
  - `app/api/system/stats/route.ts` (GET — has a 5-min in-memory cache, mitigating DB load)
  - `app/api/scenarios/official/route.ts` (GET)
- **Issue**: Fully unauthenticated AND no per-IP rate limit. `/system/stats` runs 7 `prisma.<model>.count()` calls (only mitigated by a 5-min cache). `/scenarios/official` runs an unbounded-ish query.
- **Impact**: Low. Informational aggregate counters are public by design; the only risk is mild unauthenticated DB load if cache misses / for `/system/status` + `/scenarios/official`. Not a data-leak.
- **Remediation**: Apply `RATE_LIMIT_TIERS.READ` keyed by `getClientIp(req)` to these public GETs.

### [HARDENING] No centralized API auth middleware — every `/api/*` handler self-gates
- **File**: `middleware.ts` (only protects page routes; `/api/*` excluded from matcher)
- **Issue**: There is no safety net. Auth correctness depends on each route author remembering to call `getUserId()`/role checks. Every *current* route does, but a future route added without a gate would be silently public.
- **Impact**: Latent / structural — no exploitable hole today.
- **Remediation**: Add an API matcher to `middleware.ts` that rejects any `/api/*` request lacking a valid NextAuth token except an explicit public allowlist (`/api/auth/*`, `/api/login`, `/api/register`, `/api/scenarios/official`, `/api/system/*`, `GET /api/scenarios`, `GET /api/scenarios/[id]`, `GET /api/scenarios/collections*`).

### [NOT VULNERABLE] Admin routes (13 files, ~30 handlers)
All perform `role === "ADMIN"` check. Role is sourced from the JWT, which the `jwt` callback (`app/api/auth/[...nextauth]/route.ts:169-205`) **re-fetches from the DB on every token refresh** and rebuilds `token.role` from `currentUser.role`. So an admin demotion propagates on the next request — no durable stale-admin window.

### [NOT VULNERABLE] Public-by-design endpoints
`/api/auth/[...nextauth]`, `/api/login`, `/api/register` (multi-tier rate-limited), `GET /api/scenarios[/[id]]`, `GET /api/scenarios/collections[/[id]]` (IP rate-limited). These are intentionally public browse/auth endpoints.
