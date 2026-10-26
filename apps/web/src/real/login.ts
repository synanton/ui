export interface LoginResult {
  token: string;
  expires_at?: number;
  tenant_id?: string;
  capabilities?: string[];
}

/**
 * Demo login against the platform issuer. The Vite dev-auth minting path is
 * intentionally gone; `tenant_id` is the configured demo tenant hint, and the
 * server returns the authoritative token.
 */
export async function login(
  apiBase: string,
  principalId: string,
  tenantId: string
): Promise<LoginResult> {
  const base = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
  const response = await fetch(`${base}/v1/auth/tenant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      principal_id: principalId,
      tenant_id: tenantId,
      capabilities: []
    })
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const record = typeof body === "object" && body !== null ? body as Record<string, unknown> : {};
    const detail = typeof record.detail === "string"
      ? record.detail
      : typeof record.message === "string"
        ? record.message
        : undefined;
    throw new Error(detail ?? `Login failed (${response.status})`);
  }
  return body as LoginResult;
}
