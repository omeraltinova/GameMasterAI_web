const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function parseAllowedHosts(raw: string | undefined) {
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function getAllowedImageHosts() {
  return parseAllowedHosts(process.env.NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS);
}

function isLocalhost(hostname: string) {
  const normalized = hostname.trim().toLowerCase();
  if (LOCALHOST_HOSTNAMES.has(normalized)) {
    return true;
  }

  // 127.0.0.0/8
  if (/^127(?:\.\d{1,3}){3}$/.test(normalized)) {
    return true;
  }

  return false;
}

function hasAllowedHost(hostname: string, allowedHosts: string[]) {
  if (allowedHosts.length === 0) {
    return false;
  }

  const normalizedHostname = hostname.toLowerCase();
  return allowedHosts.some((allowedHost) => {
    if (allowedHost.startsWith("*.")) {
      const suffix = allowedHost.slice(2);
      return Boolean(suffix) && normalizedHostname.endsWith(`.${suffix}`);
    }

    return allowedHost === normalizedHostname;
  });
}

export type NormalizeImageUrlOptions = {
  allowRelative?: boolean;
};

/**
 * Normalizes and validates image URLs for safe rendering/storage.
 *
 * Allowed values:
 * - https absolute URLs only when hostname is allowlisted in NEXT_PUBLIC_ALLOWED_IMAGE_HOSTS
 * - http absolute URLs only on localhost in non-production
 * - relative paths starting with '/' when allowRelative=true
 */
export function normalizeImageUrl(
  value: string | null | undefined,
  options: NormalizeImageUrlOptions = {},
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const allowRelative = options.allowRelative ?? true;
  if (allowRelative && trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();

  if (protocol === "https:") {
    if (!hasAllowedHost(hostname, getAllowedImageHosts())) {
      return null;
    }
    return parsed.toString();
  }

  if (protocol === "http:" && process.env.NODE_ENV !== "production" && isLocalhost(hostname)) {
    return parsed.toString();
  }

  return null;
}

export function isSafeImageUrl(
  value: string | null | undefined,
  options?: NormalizeImageUrlOptions,
) {
  return normalizeImageUrl(value, options) !== null;
}
