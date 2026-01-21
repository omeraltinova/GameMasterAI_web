type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitState>();

function nowMs() {
  return Date.now();
}

function resetState(config: RateLimitConfig) {
  return { count: 0, resetAt: nowMs() + config.windowMs };
}

export function checkRateLimit(key: string, config: RateLimitConfig) {
  const existing = store.get(key);
  const state = !existing || existing.resetAt <= nowMs()
    ? resetState(config)
    : existing;

  state.count += 1;
  store.set(key, state);

  const allowed = state.count <= config.max;

  return {
    allowed,
    remaining: Math.max(0, config.max - state.count),
    resetAt: state.resetAt,
  };
}

type HeaderSource = Headers | Record<string, string | string[] | undefined>;

function getHeaderValue(headers: HeaderSource, name: string) {
  if (headers instanceof Headers) {
    return headers.get(name) || undefined;
  }

  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

export function getClientIp(request?: { headers?: HeaderSource } | null) {
  if (!request) {
    return "unknown";
  }

  const headers = request.headers;
  if (!headers) {
    return "unknown";
  }

  const forwardedFor = getHeaderValue(headers, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim() || "unknown";
  }

  const realIp = getHeaderValue(headers, "x-real-ip");
  if (realIp) {
    return realIp.trim() || "unknown";
  }

  return "unknown";
}
