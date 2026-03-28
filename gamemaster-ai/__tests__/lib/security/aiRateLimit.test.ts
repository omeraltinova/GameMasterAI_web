import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSystemSettings: vi.fn(),
  checkRateLimit: vi.fn(),
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/admin/systemSettings', () => ({
  getSystemSettings: mocks.getSystemSettings,
}));

vi.mock('@/lib/security/rateLimit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: mocks.prisma,
}));

import { checkAIRateLimit, consumeAITokens } from '@/lib/security/aiRateLimit';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSystemSettings.mockResolvedValue({ aiRequestsPerMinute: 30 });
  mocks.checkRateLimit.mockReturnValue({
    allowed: true,
    remaining: 29,
    resetAt: Date.now() + 60_000,
  });
});

describe('checkAIRateLimit', () => {
  it('blocks when per-minute request limit is exceeded', async () => {
    mocks.checkRateLimit.mockReturnValue({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const result = await checkAIRateLimit('u1');

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('REQUEST_LIMIT');
  });

  it('blocks when daily token quota is exceeded', async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({
      aiDailyTokenLimit: 100,
      aiTokensUsedToday: 100,
      aiUsageResetAt: new Date(),
    });

    const result = await checkAIRateLimit('u2', 5);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('TOKEN_LIMIT');
    expect(result.remainingTokens).toBe(0);
  });

  it('resets daily counters when reset date is stale', async () => {
    const staleDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    mocks.prisma.user.findUnique.mockResolvedValue({
      aiDailyTokenLimit: 1000,
      aiTokensUsedToday: 900,
      aiUsageResetAt: staleDate,
    });

    mocks.prisma.user.update.mockResolvedValue({
      aiDailyTokenLimit: 1000,
      aiTokensUsedToday: 0,
      aiUsageResetAt: new Date(),
    });

    const result = await checkAIRateLimit('u3', 100);

    expect(mocks.prisma.user.update).toHaveBeenCalledTimes(1);
    expect(result.allowed).toBe(true);
    expect(result.remainingTokens).toBe(1000);
  });
});

describe('consumeAITokens', () => {
  it('does not consume when token amount is invalid', async () => {
    await consumeAITokens('u4', 0);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
});
