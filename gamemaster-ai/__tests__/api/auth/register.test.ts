import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ───────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  getUserId: vi.fn(),
  bcryptHash: vi.fn().mockResolvedValue("$2a$10$hashed"),
  bcryptCompare: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/auth/server", () => ({
  getUserId: mocks.getUserId,
  getUserSession: vi.fn(),
  requireAuth: vi.fn(),
  unauthorizedResponse: () => {
    const { NextResponse } = require("next/server");
    return NextResponse.json(
      { success: false, error: "Oturum açmanız gerekiyor", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  },
  forbiddenResponse: () => {
    const { NextResponse } = require("next/server");
    return NextResponse.json(
      { success: false, error: "Bu işlem için yetkiniz yok", code: "FORBIDDEN" },
      { status: 403 }
    );
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: mocks.bcryptHash,
    compare: mocks.bcryptCompare,
  },
}));

// Mock rate limiter to always allow
vi.mock("@/lib/security/rateLimit", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 10 }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  rateLimitResponse: vi.fn().mockReturnValue(null),
  applyRateLimit: vi.fn().mockReturnValue({ limited: false }),
  RATE_LIMIT_TIERS: {
    AUTH_SENSITIVE: { windowMs: 60000, max: 5 },
    READ: { windowMs: 60000, max: 100 },
    WRITE: { windowMs: 60000, max: 30 },
    GAME_ACTION: { windowMs: 60000, max: 60 },
  },
}));

import { POST as registerPOST } from "@/app/api/register/route";
import { POST as passwordPOST } from "@/app/api/auth/password/route";

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makePasswordRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/auth/password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset bcrypt default
  mocks.bcryptHash.mockResolvedValue("$2a$10$hashed");
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. POST /api/register
// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/register", () => {
  const validBody = {
    username: "testuser",
    email: "test@example.com",
    password: "StrongP@ss1",
    confirmPassword: "StrongP@ss1",
  };

  it("returns 201 on successful registration", async () => {
    mocks.prisma.user.findFirst.mockResolvedValue(null);
    mocks.prisma.user.create.mockResolvedValue({
      id: "u1",
      username: "testuser",
      email: "test@example.com",
      password: "$2a$10$hashed",
      role: "MEMBER",
      createdAt: new Date(),
      updatedAt: new Date(),
      emailVerified: null,
      image: null,
    });

    const res = await registerPOST(makeRequest(validBody));
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns 400 for invalid data (missing email)", async () => {
    const res = await registerPOST(
      makeRequest({
        username: "testuser",
        password: "StrongP@ss1",
        confirmPassword: "StrongP@ss1",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for password too short (min 6 chars)", async () => {
    const res = await registerPOST(
      makeRequest({
        username: "testuser",
        email: "test@example.com",
        password: "Ab1!",
        confirmPassword: "Ab1!",
      })
    );
    expect(res.status).toBe(400);
  });

  it("ignores confirmPassword (server-side schema has no confirmPassword)", async () => {
    // registerSchema only validates username, email, password
    // confirmPassword mismatch is a client-side concern
    mocks.prisma.user.findFirst.mockResolvedValue(null);
    mocks.prisma.user.create.mockResolvedValue({
      id: "u2",
      username: "testuser",
      email: "test@example.com",
      password: "$2a$10$hashed",
      role: "MEMBER",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await registerPOST(
      makeRequest({
        username: "testuser",
        email: "test@example.com",
        password: "StrongP@ss1",
        confirmPassword: "DifferentP@ss2",
      })
    );
    // Server accepts it — confirmPassword is NOT validated server-side
    expect(res.status).toBe(201);
  });

  it("returns 409 when user already exists", async () => {
    mocks.prisma.user.findFirst.mockResolvedValue({
      id: "existing",
      username: "testuser",
      email: "test@example.com",
    });

    const res = await registerPOST(makeRequest(validBody));
    expect(res.status).toBe(409);
  });

  it("returns 400 for weak password", async () => {
    const res = await registerPOST(
      makeRequest({
        username: "testuser",
        email: "test@example.com",
        password: "weak",
        confirmPassword: "weak",
      })
    );
    expect(res.status).toBe(400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. POST /api/auth/password
// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/auth/password", () => {
  const validPasswordChange = {
    currentPassword: "OldP@ssw0rd",
    newPassword: "NewP@ssw0rd1",
    confirmPassword: "NewP@ssw0rd1",
  };

  it("returns 401 when not authenticated", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const res = await passwordPOST(makePasswordRequest(validPasswordChange));
    expect(res.status).toBe(401);
  });

  it("returns 400 when validation fails (short password)", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    const res = await passwordPOST(
      makePasswordRequest({
        currentPassword: "OldP@ssw0rd",
        newPassword: "short",
        confirmPassword: "short",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when new password is same as current", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    const res = await passwordPOST(
      makePasswordRequest({
        currentPassword: "SameP@ssw0rd1",
        newPassword: "SameP@ssw0rd1",
        confirmPassword: "SameP@ssw0rd1",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.user.findUnique.mockResolvedValue(null);

    const res = await passwordPOST(makePasswordRequest(validPasswordChange));
    expect(res.status).toBe(404);
  });

  it("returns 400 when current password is wrong", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.user.findUnique.mockResolvedValue({
      password: "$2a$10$hashed_old",
    });
    mocks.bcryptCompare.mockResolvedValue(false);

    const res = await passwordPOST(makePasswordRequest(validPasswordChange));
    expect(res.status).toBe(400);
  });

  it("returns 200 on successful password change", async () => {
    mocks.getUserId.mockResolvedValue("user-1");
    mocks.prisma.user.findUnique.mockResolvedValue({
      password: "$2a$10$hashed_old",
    });
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.prisma.user.update.mockResolvedValue({});

    const res = await passwordPOST(makePasswordRequest(validPasswordChange));
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
