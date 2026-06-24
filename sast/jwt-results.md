# JWT / Token Security Results: GameMaster AI

## Executive Summary
- Vulnerable: **0**
- Hardening (low): **1**

NextAuth v4 JWT strategy is used conservatively. No custom JWT verification exists (NextAuth handles signing/verification internally with HS256 + `NEXTAUTH_SECRET`), so classic JWT attacks (algorithm confusion, missing signature verification, asymmetric/mixed-key confusion, `none` algorithm) are **not applicable** — there is no hand-rolled `jwt.verify` to misconfigure.

## Findings

### [HARDENING / LOW] Predictable fallback secret in `buildPasswordSignature`
- **File**: `app/api/auth/[...nextauth]/route.ts:26-31`
- **Code**:
  ```ts
  function buildPasswordSignature(passwordHash: string) {
    const secret = process.env.NEXTAUTH_SECRET || "local-dev-secret";
    return createHash("sha256").update(`${passwordHash}:${secret}`).digest("hex");
  }
  ```
- **Issue**: If `NEXTAUTH_SECRET` is unset, the `passwordSignature` claim (used to revoke outstanding sessions when the password changes) is derived with the publicly-known string `"local-dev-secret"`.
- **Mitigations**: (1) NextAuth itself requires `NEXTAUTH_SECRET` and will refuse to start in production without it (or generate an ephemeral one), so a real deployment will set it; (2) this fallback only affects the session-revocation heuristic, not token signing.
- **Impact**: In a misconfigured deployment, an attacker who knows a user's bcrypt hash (already a compromise) could forge the signature — but they'd need the hash, at which point they own the account anyway. Effectively defense-in-depth only.
- **Remediation**: Fail fast if `NEXTAUTH_SECRET` is missing (`if (!process.env.NEXTAUTH_SECRET) throw …`) rather than silently falling back.

### [NOT VULNERABLE] JWT verification & signing
- NextAuth signs/verifies tokens with `NEXTAUTH_SECRET` using HS256. No `algorithms` option to confuse, no `verify` call with a public key, no `jwks`/`jwk` handling. Algorithm-confusion and key-substitution attacks are not possible.

### [NOT VULNERABLE] Claim freshness
- The `jwt` callback re-fetches `User` (incl. `role`, `password`, `isSuspended`, `isSoftDeleted`) on every refresh and rebuilds all claims. `revokeToken()` nulls all identifying claims when the user is deleted/soft-deleted or the `passwordSignature` no longer matches. Password change therefore invalidates prior sessions. Claims `session.user.role`/`isSuspended` stay current.

### [NOT VULNERABLE] Header/claim injection
- No user input is interpolated into the JWT header, the signing secret, or the `kid`. Claims are populated strictly from the DB row. No injection surface.
