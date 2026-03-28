import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ───────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getToken: vi.fn(),
}));

vi.mock("next-auth/jwt", () => ({
  getToken: mocks.getToken,
}));

import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeRequest(path: string) {
  return new NextRequest(new URL(path, "http://localhost:3000"));
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
// Middleware RBAC Tests
// ═════════════════════════════════════════════════════════════════════════════
describe("middleware", () => {
  // ── Public routes (no auth required) ──────────────────────────────────────
  describe("public routes", () => {
    it("allows access to / without token", async () => {
      mocks.getToken.mockResolvedValue(null);
      const res = await middleware(makeRequest("/"));
      // NextResponse.next() has status 200
      expect(res.status).toBe(200);
      expect(res.headers.get("Location")).toBeNull();
    });

    it("allows access to /about without token", async () => {
      mocks.getToken.mockResolvedValue(null);
      const res = await middleware(makeRequest("/about"));
      expect(res.status).toBe(200);
    });

    it("allows access to /login without token", async () => {
      mocks.getToken.mockResolvedValue(null);
      const res = await middleware(makeRequest("/login"));
      expect(res.status).toBe(200);
    });

    it("allows access to /register without token", async () => {
      mocks.getToken.mockResolvedValue(null);
      const res = await middleware(makeRequest("/register"));
      expect(res.status).toBe(200);
    });

    it("allows access to /rules without token", async () => {
      mocks.getToken.mockResolvedValue(null);
      const res = await middleware(makeRequest("/rules"));
      expect(res.status).toBe(200);
    });
  });

  // ── Protected routes (member+ required) ───────────────────────────────────
  describe("protected routes", () => {
    const protectedPaths = [
      "/dashboard",
      "/dashboard/stats",
      "/characters",
      "/characters/new",
      "/campaigns",
      "/campaigns/123",
      "/scenarios",
      "/scenarios/browse",
      "/profile",
      "/profile/settings",
    ];

    for (const path of protectedPaths) {
      it(`redirects to /login for ${path} without token`, async () => {
        mocks.getToken.mockResolvedValue(null);
        const res = await middleware(makeRequest(path));
        expect(res.status).toBe(307);
        const location = new URL(res.headers.get("Location")!);
        expect(location.pathname).toBe("/login");
        expect(location.searchParams.get("from")).toBe(path);
      });
    }

    it("allows /dashboard with valid MEMBER token", async () => {
      mocks.getToken.mockResolvedValue({ role: "MEMBER", sub: "user-1" });
      const res = await middleware(makeRequest("/dashboard"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Location")).toBeNull();
    });

    it("allows /characters with valid MEMBER token", async () => {
      mocks.getToken.mockResolvedValue({ role: "MEMBER", sub: "user-1" });
      const res = await middleware(makeRequest("/characters"));
      expect(res.status).toBe(200);
    });

    it("allows /campaigns with valid ADMIN token", async () => {
      mocks.getToken.mockResolvedValue({ role: "ADMIN", sub: "admin-1" });
      const res = await middleware(makeRequest("/campaigns"));
      expect(res.status).toBe(200);
    });
  });

  // ── Admin routes ──────────────────────────────────────────────────────────
  describe("admin routes", () => {
    it("redirects to /login for /admin without token", async () => {
      mocks.getToken.mockResolvedValue(null);
      const res = await middleware(makeRequest("/admin"));
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("Location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("from")).toBe("/admin");
    });

    it("redirects MEMBER to /dashboard for /admin", async () => {
      mocks.getToken.mockResolvedValue({ role: "MEMBER", sub: "user-1" });
      const res = await middleware(makeRequest("/admin"));
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("Location")!);
      expect(location.pathname).toBe("/dashboard");
    });

    it("redirects MEMBER to /dashboard for /admin/users", async () => {
      mocks.getToken.mockResolvedValue({ role: "MEMBER", sub: "user-1" });
      const res = await middleware(makeRequest("/admin/users"));
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("Location")!);
      expect(location.pathname).toBe("/dashboard");
    });

    it("allows ADMIN to access /admin", async () => {
      mocks.getToken.mockResolvedValue({ role: "ADMIN", sub: "admin-1" });
      const res = await middleware(makeRequest("/admin"));
      expect(res.status).toBe(200);
      expect(res.headers.get("Location")).toBeNull();
    });

    it("allows ADMIN to access /admin/users", async () => {
      mocks.getToken.mockResolvedValue({ role: "ADMIN", sub: "admin-1" });
      const res = await middleware(makeRequest("/admin/users"));
      expect(res.status).toBe(200);
    });

    it("allows ADMIN to access /admin/scenarios", async () => {
      mocks.getToken.mockResolvedValue({ role: "ADMIN", sub: "admin-1" });
      const res = await middleware(makeRequest("/admin/scenarios"));
      expect(res.status).toBe(200);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────
  describe("edge cases", () => {
    it("preserves 'from' query parameter in login redirect", async () => {
      mocks.getToken.mockResolvedValue(null);
      const res = await middleware(makeRequest("/dashboard/stats"));
      const location = new URL(res.headers.get("Location")!);
      expect(location.searchParams.get("from")).toBe("/dashboard/stats");
    });

    it("does not redirect API routes (not in matcher)", async () => {
      mocks.getToken.mockResolvedValue(null);
      const res = await middleware(makeRequest("/api/register"));
      expect(res.status).toBe(200);
    });
  });
});
