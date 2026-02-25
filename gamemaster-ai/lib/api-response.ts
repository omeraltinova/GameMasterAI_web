import { NextResponse } from 'next/server';

/**
 * Helper to return a 429 response with rate limit headers
 */
export function rateLimitResponse(result: { limit: number; remaining: number; reset: number }) {
  return NextResponse.json(
    {
      success: false,
      message: 'Too many requests, please try again later.',
      error: 'Rate limit exceeded'
    },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.reset.toString(),
        'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
      }
    }
  );
}
