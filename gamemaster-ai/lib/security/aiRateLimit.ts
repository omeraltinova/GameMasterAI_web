import { getSystemSettings } from "@/lib/admin/systemSettings";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit } from "@/lib/security/rateLimit";

export const DEFAULT_AI_REQUESTS_PER_MINUTE = 30;
export const DEFAULT_DAILY_AI_TOKEN_LIMIT = 120_000;
const WINDOW_MS = 60_000;

type AIRateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  remainingTokens: number;
  dailyTokenLimit: number;
  reason?: "REQUEST_LIMIT" | "TOKEN_LIMIT";
};

function startOfUTCDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function normalizeDailyLimit(value: number | null | undefined) {
  if (typeof value !== "number") {
    return DEFAULT_DAILY_AI_TOKEN_LIMIT;
  }
  return Math.max(0, Math.floor(value));
}

function normalizeTokenAmount(tokens: number) {
  if (!Number.isFinite(tokens)) {
    return 0;
  }
  return Math.max(0, Math.floor(tokens));
}

async function getEffectiveDailyUsage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      aiDailyTokenLimit: true,
      aiTokensUsedToday: true,
      aiUsageResetAt: true,
    },
  });

  if (!user) {
    return null;
  }

  const todayStart = startOfUTCDay();
  if (user.aiUsageResetAt < todayStart) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        aiTokensUsedToday: 0,
        aiUsageResetAt: todayStart,
      },
      select: {
        aiDailyTokenLimit: true,
        aiTokensUsedToday: true,
        aiUsageResetAt: true,
      },
    });

    return {
      ...updatedUser,
      aiDailyTokenLimit: normalizeDailyLimit(updatedUser.aiDailyTokenLimit),
    };
  }

  return {
    ...user,
    aiDailyTokenLimit: normalizeDailyLimit(user.aiDailyTokenLimit),
  };
}

export async function checkAIRateLimit(
  userId: string,
  estimatedTokens = 1,
): Promise<AIRateLimitResult> {
  const settings = await getSystemSettings();
  const maxRequests =
    typeof settings?.aiRequestsPerMinute === "number"
      ? settings.aiRequestsPerMinute
      : DEFAULT_AI_REQUESTS_PER_MINUTE;

  const minuteLimit =
    maxRequests <= 0
      ? { allowed: true, remaining: Infinity, resetAt: Date.now() + WINDOW_MS }
      : checkRateLimit(`ai:${userId}`, {
        windowMs: WINDOW_MS,
        max: maxRequests,
      });

  if (!minuteLimit.allowed) {
    return {
      allowed: false,
      remaining: minuteLimit.remaining,
      resetAt: minuteLimit.resetAt,
      remainingTokens: 0,
      dailyTokenLimit: 0,
      reason: "REQUEST_LIMIT",
    };
  }

  try {
    const usage = await getEffectiveDailyUsage(userId);
    if (!usage) {
      return {
        allowed: false,
        remaining: minuteLimit.remaining,
        resetAt: minuteLimit.resetAt,
        remainingTokens: 0,
        dailyTokenLimit: 0,
      };
    }

    if (usage.aiDailyTokenLimit <= 0) {
      return {
        allowed: true,
        remaining: minuteLimit.remaining,
        resetAt: minuteLimit.resetAt,
        remainingTokens: Infinity,
        dailyTokenLimit: usage.aiDailyTokenLimit,
      };
    }

    const remainingTokens = Math.max(0, usage.aiDailyTokenLimit - usage.aiTokensUsedToday);
    const requiredTokens = Math.max(1, normalizeTokenAmount(estimatedTokens));

    if (remainingTokens < requiredTokens) {
      return {
        allowed: false,
        remaining: minuteLimit.remaining,
        resetAt: minuteLimit.resetAt,
        remainingTokens,
        dailyTokenLimit: usage.aiDailyTokenLimit,
        reason: "TOKEN_LIMIT",
      };
    }

    return {
      allowed: true,
      remaining: minuteLimit.remaining,
      resetAt: minuteLimit.resetAt,
      remainingTokens,
      dailyTokenLimit: usage.aiDailyTokenLimit,
    };
  } catch (error) {
    console.error("AI quota kontrolü başarısız, request limit fallback uygulanıyor:", error);
    return {
      allowed: true,
      remaining: minuteLimit.remaining,
      resetAt: minuteLimit.resetAt,
      remainingTokens: Infinity,
      dailyTokenLimit: DEFAULT_DAILY_AI_TOKEN_LIMIT,
    };
  }
}

export async function consumeAITokens(userId: string, tokens: number) {
  const normalizedTokens = normalizeTokenAmount(tokens);
  if (normalizedTokens <= 0) {
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          aiDailyTokenLimit: true,
          aiTokensUsedToday: true,
          aiUsageResetAt: true,
        },
      });

      if (!user) {
        return;
      }

      const dailyLimit = normalizeDailyLimit(user.aiDailyTokenLimit);
      if (dailyLimit <= 0) {
        return;
      }

      const todayStart = startOfUTCDay();
      const shouldReset = user.aiUsageResetAt < todayStart;
      const currentUsed = shouldReset ? 0 : user.aiTokensUsedToday;

      await tx.user.update({
        where: { id: userId },
        data: {
          aiTokensUsedToday: currentUsed + normalizedTokens,
          aiUsageResetAt: shouldReset ? todayStart : user.aiUsageResetAt,
        },
      });
    });
  } catch (error) {
    console.error("AI token tüketimi kaydedilemedi:", error);
  }
}
