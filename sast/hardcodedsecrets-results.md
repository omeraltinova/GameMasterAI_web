# Hardcoded Secrets Results: GameMaster AI

## Executive Summary
- Hardcoded real secrets in tracked source: **0**
- Hardening notes: **3** (all low / informational)

Secrets are loaded exclusively from environment variables (`OPENROUTER_API_KEY`, `NEXTAUTH_SECRET`, `DATABASE_URL`). The `.env`, `.env.local`, and `prisma/dev.db` files are present in the working tree but are **gitignored** (`.gitignore:34` → `.env*` with `!.env.example`) and confirmed **never committed** (`git log --all --diff-filter=A` for `.env*` is empty; `git ls-files` returns nothing).

## Findings

### [HARDENING / LOW] Predictable fallback in `buildPasswordSignature`
- **File**: `app/api/auth/[...nextauth]/route.ts:27`
- **Value**: `"local-dev-secret"` (fallback when `NEXTAUTH_SECRET` unset)
- **Risk**: See `sast/jwt-results.md`. Not a real secret; defense-in-depth only.

### [HARDENING / INFO] Public dummy bcrypt hash used for timing equalization
- **File**: `app/api/auth/[...nextauth]/route.ts:20`
- **Value**: `DUMMY_BCRYPT_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"`
- **Note**: This is the well-known public "incorrect" hash used purely to keep `bcrypt.compare` cost constant for non-existent users (anti-enumeration / timing defense). It corresponds to no real account. Not a secret leak — correct usage.

### [HARDENING / INFO] Placeholder password in one-off DB test script
- **File**: `DataBase_SetupAndTest/test-db.ts:22`
- **Value**: `password: "hashed_password_123"`
- **Note**: A manual scratch script (`DataBase_SetupAndTest/`, not imported by the app). It seeds a throwaway user with a non-bcrypt placeholder string. Not a credential for any real system; would simply create an un-loginable row if run. Recommend deleting the script or moving under `scripts/` with a clear "dev-only" marker.

### [NOT VULNERABLE] Secrets management
- All real secrets (`OPENROUTER_API_KEY`, `NEXTAUTH_SECRET`, `DATABASE_URL`) are read from `process.env` only. The OpenRouter key is used solely server-side in `lib/ai/openrouter.ts` and never serialized to responses, logs include only the first 500 chars of prompts (no keys), and there is no `NEXT_PUBLIC_*` exposure of any secret.
- `.gitguardian.yaml` is present at repo root, indicating a secret-scanning guardrail is in place.
