import { describe, expect, it } from "vitest";
import { authenticate, resolveAuthConfig } from "../../vite.config";

function payloadOf(token: string): Record<string, unknown> {
  const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, "="))) as Record<string, unknown>;
}

const configured = resolveAuthConfig({
  DEMO_AUTH_USER: "alice",
  DEMO_AUTH_PASSWORD: "secret",
  DEMO_AUTH_TENANT: "tenant-a",
  SYNANTON_JWT_SECRET: "signing-secret"
});

describe("development login", () => {
  it("fails closed with 503 when any required config is missing", () => {
    const response = authenticate(resolveAuthConfig({}), '{"username":"","password":""}');

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("DEMO_AUTH_NOT_CONFIGURED");
    expect(response.body.token).toBeUndefined();
  });

  it("rejects credentials that do not match configuration", () => {
    const response = authenticate(configured, '{"username":"alice","password":"wrong"}');

    expect(response.status).toBe(401);
    expect(response.body.token).toBeUndefined();
  });

  it("issues a token for the configured user and tenant", () => {
    const response = authenticate(configured, '{"username":"alice","password":"secret"}');

    expect(response.status).toBe(200);
    const payload = payloadOf(response.body.token as string);
    expect(payload.sub).toBe("alice");
    expect(payload.tenant_id).toBe("tenant-a");
  });

  it("changes the token tenant with configuration, not code", () => {
    const other = resolveAuthConfig({
      DEMO_AUTH_USER: "alice",
      DEMO_AUTH_PASSWORD: "secret",
      DEMO_AUTH_TENANT: "tenant-b",
      SYNANTON_JWT_SECRET: "signing-secret"
    });
    const response = authenticate(other, '{"username":"alice","password":"secret"}');

    expect(payloadOf(response.body.token as string).tenant_id).toBe("tenant-b");
  });

  it("includes uid/gid only when configured", () => {
    const without = authenticate(configured, '{"username":"alice","password":"secret"}');
    expect(payloadOf(without.body.token as string).uid).toBeUndefined();
    expect(payloadOf(without.body.token as string).gid).toBeUndefined();

    const withClaims = resolveAuthConfig({
      DEMO_AUTH_USER: "alice",
      DEMO_AUTH_PASSWORD: "secret",
      DEMO_AUTH_TENANT: "tenant-a",
      SYNANTON_JWT_SECRET: "signing-secret",
      DEMO_AUTH_UID: "1001",
      DEMO_AUTH_GIDS: "1001,2000"
    });
    const response = authenticate(withClaims, '{"username":"alice","password":"secret"}');
    const payload = payloadOf(response.body.token as string);
    expect(payload.uid).toBe(1001);
    expect(payload.gid).toEqual([1001, 2000]);
  });
});
