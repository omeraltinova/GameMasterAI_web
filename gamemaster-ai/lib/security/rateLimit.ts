import { NextResponse } from "next/server";

type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

// ── Store abstraction ────────────────────────────────────────────────────────
// The default store is an in-process Map (correct for single-instance deploys,
// zero configuration). When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// are set, a Redis-backed store is used instead so limits hold across multiple
// instances / serverless deployments. All public checks are async to allow the
// Redis backend; the in-process store also returns Promises so the API is
// uniform regardless of backend.
interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<RateLimitState>;
}

// ── In-process store (default) ───────────────────────────────────────────────
class MemoryStore implements RateLimitStore {
  private readonly map = new Map<string, RateLimitState>();

  async hit(key: string, windowMs: number): Promise<RateLimitState> {
    const now = Date.now();
    const existing = this.map.get(key);
    const state: RateLimitState =
      !existing || existing.resetAt <= now
        ? { count: 1, resetAt: now + windowMs }
        : { count: existing.count + 1, resetAt: existing.resetAt };
    this.map.set(key, state);
    return state;
  }
}

// ── Upstash Redis store (opt-in, distributed) ────────────────────────────────
// Atomic increment+expire via a Lua EVAL so concurrent instances can't race.
const UPSTASH_RATELIMIT_LUA =
  "local w=tonumber(ARGV[1]) local n=tonumber(ARGV[2]) " +
  "local r=n+w local c=0 local e=redis.call('GET',KEYS[1]) " +
  "if e then local o=cjson.decode(e) if tonumber(o.resetAt)>n then c=tonumber(o.count) r=tonumber(o.resetAt) end end " +
  "c=c+1 local ttl=math.ceil((r-n)/1000) if ttl<1 then ttl=1 end " +
  "redis.call('SET',KEYS[1],cjson.encode({count=c,resetAt=r}),'EX',ttl+1) " +
  "return {c,r}";

class UpstashRedisStore implements RateLimitStore {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.token = token;
  }

  async hit(key: string, windowMs: number): Promise<RateLimitState> {
    const now = Date.now();
    try {
      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify([
          "EVAL",
          UPSTASH_RATELIMIT_LUA,
          "1",
          `rl:${key}`,
          String(windowMs),
          String(now),
        ]),
      });

      if (!res.ok) {
        // Fail-open: a Redis hiccup must never block legitimate traffic.
        return { count: 1, resetAt: now + windowMs };
      }

      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.result;
      const count = Number(arr?.[0]);
      const resetAt = Number(arr?.[1]);
      if (!Number.isFinite(count) || !Number.isFinite(resetAt)) {
        return { count: 1, resetAt: now + windowMs };
      }
      return { count, resetAt };
    } catch (error) {
      console.error("Rate-limit Redis check failed (fail-open):", error);
      return { count: 1, resetAt: now + windowMs };
    }
  }
}

function createStore(): RateLimitStore {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return new UpstashRedisStore(url, token);
  }
  return new MemoryStore();
}

const store: RateLimitStore = createStore();

type HeaderSource = Headers | Record<string, string | string[] | undefined>;
type ClientIpOptions = {
  trustProxyHeaders?: boolean;
};

function getHeaderValue(headers: HeaderSource, name: string) {
  if (headers instanceof Headers) {
    return headers.get(name) || undefined;
  }

  const value = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function isValidIpCandidate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;

  // Basic IPv4 check
  const ipv4 = trimmed.match(/^(\d{1,3}\.){3}\d{1,3}$/);
  if (ipv4) {
    return trimmed.split(".").every((part) => {
      const n = Number(part);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }

  // Basic IPv6 check (defense-in-depth; detailed validation is handled upstream)
  return /^[0-9a-fA-F:]+$/.test(trimmed);
}

function pickFirstValidForwardedIp(forwardedFor: string) {
  const candidates = forwardedFor.split(",").map((part) => part.trim()).filter(Boolean);
  return candidates.find(isValidIpCandidate);
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
 * Increments the counter for `key` within its window. Async to allow a
 * distributed (Redis) backend. Returns whether the request is allowed plus
 * remaining quota and the reset timestamp.
 */
export async function checkRateLimit(key: string, config: RateLimitConfig) {
  const state = await store.hit(key, config.windowMs);
  const allowed = state.count <= config.max;

  return {
    allowed,
    remaining: Math.max(0, config.max - state.count),
    resetAt: state.resetAt,
  };
}

/**
 * One-liner rate-limit check for API route handlers.
 *
 * Returns a result object with `limited` (true when the limit is exceeded).
 *
 * @param identifier  Unique key fragment – typically userId or IP
 * @param endpoint    A short label for the route, e.g. "POST:/api/scenarios"
 * @param tier        One of the predefined RATE_LIMIT_TIERS or a custom config
 */
export async function applyRateLimit(
  identifier: string,
  endpoint: string,
  tier: RateLimitConfig,
) {
  const key = `${endpoint}:${identifier}`;
  const result = await checkRateLimit(key, tier);

  if (!result.allowed) {
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

export function getClientIp(
  request?: { headers?: HeaderSource } | null,
  options?: ClientIpOptions,
) {
  if (!request) {
    return "unknown";
  }

  const headers = request.headers;
  if (!headers) {
    return "unknown";
  }

  const trustProxyHeaders = options?.trustProxyHeaders ?? process.env.TRUST_PROXY_HEADERS === "true";
  if (!trustProxyHeaders) {
    return "unknown";
  }

  const forwardedFor = getHeaderValue(headers, "x-forwarded-for");
  if (forwardedFor) {
    const clientIp = pickFirstValidForwardedIp(forwardedFor);
    if (clientIp) {
      return clientIp;
    }
  }

  const realIp = getHeaderValue(headers, "x-real-ip");
  if (realIp && isValidIpCandidate(realIp)) {
    return realIp.trim();
  }

  return "unknown";
}

/**
 * Returns a 429 NextResponse if the rate limit is exceeded, or `null` if allowed.
 * Usage in a route handler:
 *   const limited = await rateLimitResponse(userId, "POST:/api/campaigns", RATE_LIMIT_TIERS.WRITE);
 *   if (limited) return limited;
 */
export async function rateLimitResponse(
  identifier: string,
  endpoint: string,
  tier: RateLimitConfig,
  message = "Çok fazla istek. Lütfen biraz sonra tekrar deneyin.",
): Promise<NextResponse | null> {
  const result = await applyRateLimit(identifier, endpoint, tier);
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
