import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
  bcryptCompare: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/security/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: mocks.getClientIp,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: mocks.bcryptCompare,
  },
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((config) => config),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => vi.fn()),
}));

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type TestUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  password: string;
  isSuspended: boolean;
  suspendedUntil: Date | null;
  suspensionReason: string | null;
  isSoftDeleted: boolean;
};

function buildUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: "user-1",
    email: "user@example.com",
    username: "user",
    role: "MEMBER",
    password: "$2a$10$hashed-password",
    isSuspended: false,
    suspendedUntil: null,
    suspensionReason: null,
    isSoftDeleted: false,
    ...overrides,
  };
}

function getAuthorize() {
  const provider = authOptions.providers[0] as {
    authorize: (credentials: { email: string; password: string } | undefined, req: unknown) => Promise<unknown>;
  };

  return provider.authorize;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkRateLimit.mockReturnValue({ allowed: true, remaining: 9 });
  mocks.getClientIp.mockReturnValue("unknown");
  mocks.bcryptCompare.mockResolvedValue(true);
});

describe("NextAuth credentials security", () => {
  it("returns null for unknown user without throwing account-specific error", async () => {
    const authorize = getAuthorize();
    mocks.prisma.user.findUnique.mockResolvedValue(null);
    mocks.bcryptCompare.mockResolvedValue(false);

    await expect(
      authorize({ email: "missing@example.com", password: "wrong" }, {}),
    ).resolves.toBeNull();
  });

  it("returns null for wrong password", async () => {
    const authorize = getAuthorize();
    mocks.prisma.user.findUnique.mockResolvedValue(buildUser());
    mocks.bcryptCompare.mockResolvedValue(false);

    await expect(
      authorize({ email: "user@example.com", password: "wrong" }, {}),
    ).resolves.toBeNull();
  });

  it("returns null for suspended users", async () => {
    const authorize = getAuthorize();
    mocks.prisma.user.findUnique.mockResolvedValue(
      buildUser({ isSuspended: true, suspendedUntil: new Date("2099-01-01T00:00:00.000Z") }),
    );

    await expect(
      authorize({ email: "user@example.com", password: "valid" }, {}),
    ).resolves.toBeNull();
  });

  it("returns null for soft deleted users", async () => {
    const authorize = getAuthorize();
    mocks.prisma.user.findUnique.mockResolvedValue(buildUser({ isSoftDeleted: true }));

    await expect(
      authorize({ email: "user@example.com", password: "valid" }, {}),
    ).resolves.toBeNull();
  });

  it("returns user payload for valid credentials", async () => {
    const authorize = getAuthorize();
    mocks.prisma.user.findUnique.mockResolvedValue(buildUser());

    await expect(
      authorize({ email: "user@example.com", password: "valid" }, {}),
    ).resolves.toMatchObject({
      id: "user-1",
      email: "user@example.com",
      name: "user",
      role: "MEMBER",
    });
  });

  it("returns null for missing credentials", async () => {
    const authorize = getAuthorize();

    await expect(authorize(undefined, {})).resolves.toBeNull();
  });
});
