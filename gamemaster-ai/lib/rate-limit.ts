
interface RateLimitStore {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
// Note: In a serverless environment like Vercel, this store is not shared across lambda instances.
// For production with multiple instances, use Redis or a database-backed store.
const rateLimitMap = new Map<string, RateLimitStore>();

// Clean up expired entries every minute to prevent memory leaks
if (typeof setInterval !== 'undefined') {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, store] of rateLimitMap.entries()) {
      if (now > store.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000); // 1 minute cleanup interval

  // Allow process to exit if this is the only thing running
  if (interval.unref) {
    interval.unref();
  }
}

/**
 * Check if a request exceeds the rate limit.
 * @param identifier Unique identifier for the user or IP
 * @param limit Maximum number of requests allowed within the window
 * @param windowMs Time window in milliseconds
 * @returns Object indicating success and remaining requests
 */
export function checkRateLimit(identifier: string, limit: number = 20, windowMs: number = 60000): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  const now = Date.now();
  const store = rateLimitMap.get(identifier);

  // If no entry exists or the window has expired, create a new entry
  if (!store || now > store.resetTime) {
    const newStore: RateLimitStore = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(identifier, newStore);
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: newStore.resetTime,
    };
  }

  // Increment count
  store.count++;

  // Check if limit exceeded
  if (store.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: store.resetTime,
    };
  }

  return {
    success: true,
    limit,
    remaining: limit - store.count,
    reset: store.resetTime,
  };
}
