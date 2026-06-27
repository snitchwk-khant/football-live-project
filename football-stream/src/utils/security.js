const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isBrowserAvailable() {
  return typeof window !== "undefined";
}

export function sanitizePlainText(value, { maxLength = 160 } = {}) {
  if (typeof value !== "string") {
    return "";
  }

  const characters = Array.from(value).filter((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint > 0x1f && codePoint !== 0x7f;
  });

  const normalized = characters.join("").trim();
  if (!normalized) {
    return "";
  }

  return normalized.slice(0, maxLength);
}

export function sanitizeUrl(value, { allowRelative = false } = {}) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (allowRelative && /^(\/|#|\?)/.test(trimmed)) {
    return trimmed;
  }

  try {
    const baseOrigin = isBrowserAvailable() ? window.location.origin : "https://example.com";
    const parsedUrl = new URL(trimmed, baseOrigin);

    if (!ALLOWED_PROTOCOLS.has(parsedUrl.protocol)) {
      return "";
    }

    if (parsedUrl.username || parsedUrl.password) {
      return "";
    }

    return parsedUrl.toString();
  } catch {
    return "";
  }
}

export function sanitizeImageUrl(value) {
  return sanitizeUrl(value);
}

export function sanitizeStreamUrl(value) {
  const sanitized = sanitizeUrl(value);
  if (!sanitized) {
    return "";
  }

  try {
    const parsedUrl = new URL(sanitized);
    const blockedParams = ["key", "token", "secret", "stream_key", "sig", "auth", "uid", "session", "password"];
    const hasBlockedQuery = blockedParams.some((param) => parsedUrl.searchParams.has(param));

    if (hasBlockedQuery) {
      return "";
    }

    return parsedUrl.toString();
  } catch {
    return "";
  }
}
