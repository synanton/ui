import { afterEach, describe, expect, it, vi } from "vitest";
import { login } from "./login";

describe("demo login", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls the platform tenant endpoint, never the removed Vite login path", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ token: "t", expires_at: 123 }), { status: 200 })
    );

    await login("", "alice", "tenant-a");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/v1/auth/tenant");
    expect(url).not.toContain("/v1/auth/login");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      principal_id: "alice",
      tenant_id: "tenant-a",
      capabilities: []
    });
  });

  it("surfaces a failure without a token", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: "ISSUANCE_AUDIT_UNAVAILABLE" }), { status: 503 })
    );
    await expect(login("", "alice", "tenant-a")).rejects.toThrow(/Login failed/);
  });
});
