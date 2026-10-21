export interface TokenClaims {
  subject: string | null;
  tenantId: string | null;
}

const EMPTY: TokenClaims = { subject: null, tenantId: null };

/**
 * Reads the display/tenant claims from a JWT payload. The token signature is
 * verified by the API; this is only for client-side scoping and display.
 */
export function tokenClaims(token: string | null): TokenClaims {
  if (!token) {
    return EMPTY;
  }
  const parts = token.split(".");
  if (parts.length < 2) {
    return EMPTY;
  }
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    return {
      subject: typeof payload.sub === "string" ? payload.sub : null,
      tenantId: typeof payload.tenant_id === "string" ? payload.tenant_id : null
    };
  } catch {
    return EMPTY;
  }
}
