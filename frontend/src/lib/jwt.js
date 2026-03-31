function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return atob(padded);
}

export function parseJwtClaims(token) {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }

  try {
    const rawPayload = base64UrlDecode(parts[1]);
    return JSON.parse(rawPayload);
  } catch {
    return null;
  }
}

export function hydrateUserFromToken(token, fallbackUser = null) {
  const claims = parseJwtClaims(token);
  if (!claims) {
    return fallbackUser;
  }

  const role = claims.role || fallbackUser?.role;
  if (!role) {
    return fallbackUser;
  }

  return {
    id: claims.userId || fallbackUser?.id || "",
    name: claims.name || fallbackUser?.name || "User",
    email: claims.sub || fallbackUser?.email || "",
    role
  };
}
