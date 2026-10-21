export interface LoginResult {
  token: string;
  expiresIn: number;
}

/**
 * Development-only login against the Vite dev-server placeholder.
 * Replaced by POST /v1/auth/tenant (RS256 + JWKS, #340) with no client change.
 * A 503 DEMO_AUTH_NOT_CONFIGURED means the server is missing DEMO_AUTH_* config.
 */
export async function login(
  apiBase: string,
  username: string,
  password: string
): Promise<LoginResult> {
  const base = apiBase.endsWith("/") ? apiBase.slice(0, -1) : apiBase;
  const response = await fetch(`${base}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
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
