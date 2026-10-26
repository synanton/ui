export interface DevAuthConfig {
  user: string;
  tenant: string;
}

function read(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const env = import.meta.env as Record<string, string | undefined>;

/**
 * Client-visible demo prefill. These are presentation hints only; the platform
 * `POST /v1/auth/tenant` endpoint owns token minting and the authoritative tenant.
 */
export const devAuthConfig: DevAuthConfig = {
  user: read(env.VITE_DEMO_AUTH_USER),
  tenant: read(env.VITE_DEMO_AUTH_TENANT)
};
