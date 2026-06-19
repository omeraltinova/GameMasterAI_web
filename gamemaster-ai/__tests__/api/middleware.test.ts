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
function makeRequest(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(new URL(path, "http://localhost:3000"), init);
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

    it("allows public API routes without token", async () => {
      mocks.getToken.mockResolvedValue(null);
      const res = await middleware(makeRequest("/api/register"));
      expect(res.status).toBe(200);
    });

    it("requires auth for protected API routes with JSON 401", async () => {
      mocks.getToken.mockResolvedValue(null);
      const res = await middleware(makeRequest("/api/characters"));
      expect(res.status).toBe(401);
      expect(res.headers.get("Location")).toBeNull();
      await expect(res.json()).resolves.toMatchObject({ success: false });
    });

    it("keeps public scenario GET routes open", async () => {
      mocks.getToken.mockResolvedValue(null);
      await expect(middleware(makeRequest("/api/scenarios"))).resolves.toHaveProperty("status", 200);
      await expect(middleware(makeRequest("/api/scenarios/scenario-1"))).resolves.toHaveProperty("status", 200);
      await expect(middleware(makeRequest("/api/scenarios/official"))).resolves.toHaveProperty("status", 200);
      await expect(middleware(makeRequest("/api/scenarios/collections"))).resolves.toHaveProperty("status", 200);
      await expect(middleware(makeRequest("/api/scenarios/collections/featured"))).resolves.toHaveProperty("status", 200);
    });

    it("requires auth for protected scenario API routes and mutating scenario methods", async () => {
      mocks.getToken.mockResolvedValue(null);
      const mine = await middleware(makeRequest("/api/scenarios/mine"));
      expect(mine.status).toBe(401);

      const create = await middleware(makeRequest("/api/scenarios", { method: "POST" }));
      expect(create.status).toBe(401);
    });

    it("requires ADMIN for admin API routes", async () => {
      mocks.getToken.mockResolvedValue({ role: "MEMBER", sub: "user-1" });
      const member = await middleware(makeRequest("/api/admin/users"));
      expect(member.status).toBe(403);

      mocks.getToken.mockResolvedValue({ role: "ADMIN", sub: "admin-1" });
      const admin = await middleware(makeRequest("/api/admin/users"));
      expect(admin.status).toBe(200);
    });
  });
});
