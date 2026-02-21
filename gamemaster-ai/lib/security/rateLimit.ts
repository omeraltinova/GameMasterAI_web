import { NextResponse } from "next/server";

type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitState>();

function nowMs() {
  return Date.now();
}

function resetState(config: RateLimitConfig) {
  return { count: 0, resetAt: nowMs() + config.windowMs };
}

export function checkRateLimit(key: string, config: RateLimitConfig) {
  const existing = store.get(key);
  const state = !existing || existing.resetAt <= nowMs()
    ? resetState(config)
    : existing;

  state.count += 1;
  store.set(key, state);

  const allowed = state.count <= config.max;

  return {
    allowed,
    remaining: Math.max(0, config.max - state.count),
    resetAt: state.resetAt,
  };
}

type HeaderSource = Headers | Record<string, string | string[] | undefined>;

function getHeaderValue(headers: HeaderSource, name: string) {
  if (headers instanceof Headers) {
    return headers.get(name) || undefined;
  }

  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

// ── Preset rate-limit tiers ──────────────────────────────────────────────────
export const RATE_LIMIT_TIERS = {
  /** Auth-sensitive: password change, invite-code lookup (5 req / 15 min per IP) */
  AUTH_SENSITIVE: { windowMs: 15 * 60 * 1000, max: 5 } as RateLimitConfig,
  /** Write / mutate endpoints: create, update, delete (30 req / min per user) */
  WRITE: { windowMs: 60 * 1000, max: 30 } as RateLimitConfig,
  /** High-frequency game actions: messages, dice rolls (60 req / min per user) */
  GAME_ACTION: { windowMs: 60 * 1000, max: 60 } as RateLimitConfig,
  /** Read-heavy endpoints: listing, search (100 req / min per user) */
  READ: { windowMs: 60 * 1000, max: 100 } as RateLimitConfig,
  /** Admin endpoints (30 req / min per user) */
  ADMIN: { windowMs: 60 * 1000, max: 30 } as RateLimitConfig,
} as const;

/**
 * One-liner rate-limit check for API route handlers.
 *
 * Returns `null` when the request is allowed, or a `NextResponse` (429) to
 * return immediately when the limit has been exceeded.
 *
 * @param identifier  Unique key fragment – typically userId or IP
 * @param endpoint    A short label for the route, e.g. "POST:/api/scenarios"
 * @param tier        One of the predefined RATE_LIMIT_TIERS or a custom config
 */
export function applyRateLimit(
  identifier: string,
  endpoint: string,
  tier: RateLimitConfig,
) {
  const key = `${endpoint}:${identifier}`;
  const result = checkRateLimit(key, tier);

  if (!result.allowed) {
    // Dynamic import would be async; we import at module level instead.
    // Callers should use the returned object to build the response.
    return {
      limited: true as const,
      remaining: result.remaining,
      resetAt: result.resetAt,
    };
  }

  return {
    limited: false as const,
    remaining: result.remaining,
    resetAt: result.resetAt,
  };
}

export function getClientIp(request?: { headers?: HeaderSource } | null) {
  if (!request) {
    return "unknown";
  }

  const headers = request.headers;
  if (!headers) {
    return "unknown";
  }

  const forwardedFor = getHeaderValue(headers, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim() || "unknown";
  }

  const realIp = getHeaderValue(headers, "x-real-ip");
  if (realIp) {
    return realIp.trim() || "unknown";
  }

  return "unknown";
}

/**
 * Returns a 429 NextResponse if the rate limit is exceeded, or `null` if allowed.
 * Usage in a route handler:
 *   const limited = rateLimitResponse(userId, "POST:/api/campaigns", RATE_LIMIT_TIERS.WRITE);
 *   if (limited) return limited;
 */
export function rateLimitResponse(
  identifier: string,
  endpoint: string,
  tier: RateLimitConfig,
  message = "Çok fazla istek. Lütfen biraz sonra tekrar deneyin.",
): NextResponse | null {
  const result = applyRateLimit(identifier, endpoint, tier);
  if (result.limited) {
    const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { message },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, retryAfterSec)),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      },
    );
  }
  return null;
}
