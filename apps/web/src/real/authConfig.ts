export interface DevAuthConfig {
  user: string;
  tenant: string;
}

function read(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const env = import.meta.env as Record<string, string | undefined>;

/**
 * Client-visible development prefill. These are presentation hints only; the
 * Vite dev server owns the credentials and the tenant written into the token.
 */
export const devAuthConfig: DevAuthConfig = {
  user: read(env.VITE_DEMO_AUTH_USER),
  tenant: read(env.VITE_DEMO_AUTH_TENANT)
};
