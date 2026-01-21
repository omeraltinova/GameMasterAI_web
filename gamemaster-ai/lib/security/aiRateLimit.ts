import { getSystemSettings } from "@/lib/admin/systemSettings";
import { checkRateLimit } from "@/lib/security/rateLimit";

export const DEFAULT_AI_REQUESTS_PER_MINUTE = 30;
const WINDOW_MS = 60_000;

export async function checkAIRateLimit(userId: string) {
  const settings = await getSystemSettings();
  const maxRequests =
    typeof settings?.aiRequestsPerMinute === "number"
      ? settings.aiRequestsPerMinute
      : DEFAULT_AI_REQUESTS_PER_MINUTE;

  if (!maxRequests || maxRequests <= 0) {
    return {
      allowed: true,
      remaining: Infinity,
      resetAt: Date.now() + WINDOW_MS,
    };
  }

  return checkRateLimit(`ai:${userId}`, {
    windowMs: WINDOW_MS,
    max: maxRequests,
  });
}
