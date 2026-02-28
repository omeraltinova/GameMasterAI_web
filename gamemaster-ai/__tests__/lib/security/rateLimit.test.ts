import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to reset the module-level Map between tests so each test starts
// with a clean store. We use `vi.resetModules()` + dynamic import.
// For simpler tests we can also just use unique keys.

// Static import for type-only usage; actual functions imported dynamically
// where module isolation is needed.
import type { } from "@/lib/security/rateLimit";

// ── Helpers ─────────────────────────────────────────────────────────────────

async function freshImport() {
  vi.resetModules();
  return await import("@/lib/security/rateLimit");
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. checkRateLimit
// ═════════════════════════════════════════════════════════════════════════════
describe("checkRateLimit", () => {
  it("allows requests up to the max", async () => {
    const { checkRateLimit } = await freshImport();
    const config = { windowMs: 60_000, max: 3 };

    const r1 = checkRateLimit("user1", config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit("user1", config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit("user1", config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests past the max", async () => {
    const { checkRateLimit } = await freshImport();
    const config = { windowMs: 60_000, max: 2 };

    checkRateLimit("user2", config);
    checkRateLimit("user2", config);
    const r3 = checkRateLimit("user2", config);
    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("tracks different keys independently", async () => {
    const { checkRateLimit } = await freshImport();
    const config = { windowMs: 60_000, max: 1 };

    const rA = checkRateLimit("keyA", config);
    expect(rA.allowed).toBe(true);

    const rB = checkRateLimit("keyB", config);
    expect(rB.allowed).toBe(true);

    // keyA is now exhausted
    const rA2 = checkRateLimit("keyA", config);
    expect(rA2.allowed).toBe(false);

    // keyB is also exhausted
    const rB2 = checkRateLimit("keyB", config);
    expect(rB2.allowed).toBe(false);
  });

  it("resets after window expires", async () => {
    const { checkRateLimit } = await freshImport();
    const config = { windowMs: 100, max: 1 };

    const r1 = checkRateLimit("user3", config);
    expect(r1.allowed).toBe(true);

    const r2 = checkRateLimit("user3", config);
    expect(r2.allowed).toBe(false);

    // Wait for window to expire
    await new Promise((res) => setTimeout(res, 150));

    const r3 = checkRateLimit("user3", config);
    expect(r3.allowed).toBe(true);
  });

  it("returns a resetAt timestamp in the future", async () => {
    const { checkRateLimit } = await freshImport();
    const config = { windowMs: 60_000, max: 5 };
    const before = Date.now();
    const r = checkRateLimit("ts-test", config);
    expect(r.resetAt).toBeGreaterThan(before);
    expect(r.resetAt).toBeLessThanOrEqual(before + config.windowMs + 50); // small tolerance
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. RATE_LIMIT_TIERS
// ═════════════════════════════════════════════════════════════════════════════
describe("RATE_LIMIT_TIERS", () => {
  it("exports five named tiers", async () => {
    const { RATE_LIMIT_TIERS } = await freshImport();
    expect(Object.keys(RATE_LIMIT_TIERS)).toEqual(
      expect.arrayContaining([
        "AUTH_SENSITIVE",
        "WRITE",
        "GAME_ACTION",
        "READ",
        "ADMIN",
      ])
    );
  });

  it("each tier has windowMs and max as positive numbers", async () => {
    const { RATE_LIMIT_TIERS } = await freshImport();
    for (const [, tier] of Object.entries(RATE_LIMIT_TIERS)) {
      const t = tier as { windowMs: number; max: number };
      expect(t.windowMs).toBeGreaterThan(0);
      expect(t.max).toBeGreaterThan(0);
    }
  });

  it("AUTH_SENSITIVE is the most restrictive tier", async () => {
    const { RATE_LIMIT_TIERS } = await freshImport();
    expect(RATE_LIMIT_TIERS.AUTH_SENSITIVE.max).toBeLessThanOrEqual(
      RATE_LIMIT_TIERS.WRITE.max
    );
    expect(RATE_LIMIT_TIERS.AUTH_SENSITIVE.max).toBeLessThanOrEqual(
      RATE_LIMIT_TIERS.READ.max
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. applyRateLimit
// ═════════════════════════════════════════════════════════════════════════════
describe("applyRateLimit", () => {
  it("returns limited: false when under the limit", async () => {
    const { applyRateLimit } = await freshImport();
    const result = applyRateLimit("u1", "POST:/test", { windowMs: 60_000, max: 5 });
    expect(result.limited).toBe(false);
    expect(result.remaining).toBe(4);
  });

  it("returns limited: true when over the limit", async () => {
    const { applyRateLimit } = await freshImport();
    const config = { windowMs: 60_000, max: 1 };

    applyRateLimit("u2", "POST:/test", config);
    const r2 = applyRateLimit("u2", "POST:/test", config);
    expect(r2.limited).toBe(true);
    expect(r2.remaining).toBe(0);
  });

  it("composes key from endpoint + identifier", async () => {
    const { applyRateLimit } = await freshImport();
    const config = { windowMs: 60_000, max: 1 };

    // Same user, different endpoints — should be independent
    const r1 = applyRateLimit("u3", "GET:/a", config);
    const r2 = applyRateLimit("u3", "GET:/b", config);
    expect(r1.limited).toBe(false);
    expect(r2.limited).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. getClientIp
// ═════════════════════════════════════════════════════════════════════════════
describe("getClientIp", () => {
  it("returns 'unknown' when request is null/undefined", async () => {
    const { getClientIp } = await freshImport();
    expect(getClientIp(null)).toBe("unknown");
    expect(getClientIp(undefined)).toBe("unknown");
    expect(getClientIp()).toBe("unknown");
  });

  it("returns 'unknown' when request has no headers", async () => {
    const { getClientIp } = await freshImport();
    expect(getClientIp({} as any)).toBe("unknown");
    expect(getClientIp({ headers: undefined } as any)).toBe("unknown");
  });

  it("extracts IP from x-forwarded-for (first entry)", async () => {
    const { getClientIp } = await freshImport();
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIp({ headers })).toBe("1.2.3.4");
  });

  it("extracts IP from x-forwarded-for (single entry)", async () => {
    const { getClientIp } = await freshImport();
    const headers = new Headers({ "x-forwarded-for": "10.0.0.1" });
    expect(getClientIp({ headers })).toBe("10.0.0.1");
  });

  it("falls back to x-real-ip if x-forwarded-for is absent", async () => {
    const { getClientIp } = await freshImport();
    const headers = new Headers({ "x-real-ip": "192.168.1.1" });
    expect(getClientIp({ headers })).toBe("192.168.1.1");
  });

  it("prefers x-forwarded-for over x-real-ip", async () => {
    const { getClientIp } = await freshImport();
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1",
      "x-real-ip": "2.2.2.2",
    });
    expect(getClientIp({ headers })).toBe("1.1.1.1");
  });

  it("returns 'unknown' when neither header is set", async () => {
    const { getClientIp } = await freshImport();
    const headers = new Headers({ "content-type": "application/json" });
    expect(getClientIp({ headers })).toBe("unknown");
  });

  it("handles plain object headers (Record<string, string>)", async () => {
    const { getClientIp } = await freshImport();
    const headers: Record<string, string> = { "x-forwarded-for": "9.8.7.6" };
    expect(getClientIp({ headers })).toBe("9.8.7.6");
  });

  it("handles array header values (takes first element)", async () => {
    const { getClientIp } = await freshImport();
    const headers: Record<string, string[]> = {
      "x-forwarded-for": ["3.3.3.3, 4.4.4.4"],
    };
    expect(getClientIp({ headers })).toBe("3.3.3.3");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. rateLimitResponse
// ═════════════════════════════════════════════════════════════════════════════
describe("rateLimitResponse", () => {
  it("returns null when under the limit", async () => {
    const { rateLimitResponse } = await freshImport();
    const result = rateLimitResponse("u-ok", "GET:/ok", { windowMs: 60_000, max: 10 });
    expect(result).toBeNull();
  });

  it("returns a 429 NextResponse when over the limit", async () => {
    const { rateLimitResponse } = await freshImport();
    const config = { windowMs: 60_000, max: 1 };

    rateLimitResponse("u-block", "GET:/block", config);
    const res = rateLimitResponse("u-block", "GET:/block", config);

    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
  });

  it("includes Retry-After and X-RateLimit headers on 429", async () => {
    const { rateLimitResponse } = await freshImport();
    const config = { windowMs: 60_000, max: 1 };

    rateLimitResponse("u-hdr", "GET:/hdr", config);
    const res = rateLimitResponse("u-hdr", "GET:/hdr", config);

    expect(res!.headers.get("Retry-After")).toBeTruthy();
    expect(res!.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(res!.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("429 body contains a message", async () => {
    const { rateLimitResponse } = await freshImport();
    const config = { windowMs: 60_000, max: 1 };

    rateLimitResponse("u-msg", "GET:/msg", config);
    const res = rateLimitResponse("u-msg", "GET:/msg", config);
    const body = await res!.json();
    expect(body.message).toBeTruthy();
  });

  it("accepts custom message", async () => {
    const { rateLimitResponse } = await freshImport();
    const config = { windowMs: 60_000, max: 1 };

    rateLimitResponse("u-cust", "GET:/cust", config, "custom msg");
    const res = rateLimitResponse("u-cust", "GET:/cust", config, "custom msg");
    const body = await res!.json();
    expect(body.message).toBe("custom msg");
  });
});
