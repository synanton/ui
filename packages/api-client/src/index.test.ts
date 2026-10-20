import { describe, expect, it } from "vitest";
import {
  ApiClientError,
  ApiClientImpl,
  BearerAuthAttachment,
  MockApiTransport,
  createMockApiClient,
  registeredAuthAttachments,
  tenantId,
  toApiClientError,
  verifiedIdentityFrom,
  type SessionIdentityProvider,
  type VerifiedIdentity
} from "./index";

const identity = verifiedIdentityFrom({ tenantId: tenantId("tenant-a"), principalId: "alice" });
const session: SessionIdentityProvider = { current: () => identity };
const auth = new BearerAuthAttachment(() => "token-1");

describe("api-client", () => {
  it("rejects a missing verified identity at the envelope, before the transport", async () => {
    let transportCalled = false;
    const transport = new MockApiTransport().on("GET", "/v1/sources", () => {
      transportCalled = true;
      return { status: 200, data: [], requestId: "req-1" };
    });
    const client = new ApiClientImpl({ transport, session: { current: () => null }, auth });

    await expect(client.request({ method: "GET", path: "/v1/sources" })).rejects.toMatchObject({
      name: "ApiClientError",
      code: "AUTHENTICATION_REQUIRED",
      retryable: false
    });
    expect(transportCalled).toBe(false);
  });

  it("rejects an unverified identity input at the auth boundary", () => {
    expect(() => tenantId("  ")).toThrow(ApiClientError);
    expect(() => verifiedIdentityFrom({
      tenantId: tenantId("tenant-a"),
      principalId: "  "
    })).toThrow(ApiClientError);
  });

  it("derives tenant scope only from the verified identity", async () => {
    let seenIdentity: VerifiedIdentity | undefined;
    let seenRequest: { idempotencyKey?: string } | undefined;
    const transport = new MockApiTransport().on("POST", "/v1/ingestion-runs", (request, verified) => {
      seenRequest = request;
      seenIdentity = verified;
      return { status: 202, data: { run_id: "r1" }, requestId: "req-1" };
    });
    const client = new ApiClientImpl({ transport, session, auth });

    const response = await client.request({
      method: "POST",
      path: "/v1/ingestion-runs",
      body: { source_id: "s" },
      idempotencyKey: "k1"
    });

    expect(response).toEqual({ status: 202, data: { run_id: "r1" }, requestId: "req-1" });
    expect(seenIdentity?.tenantId).toBe("tenant-a");
    expect(seenRequest?.idempotencyKey).toBe("k1");
  });

  it("rejects a tenant in the request body before the transport", async () => {
    let transportCalled = false;
    const transport = new MockApiTransport().on("POST", "/v1/ingestion-runs", () => {
      transportCalled = true;
      return { status: 202, data: {}, requestId: "req-1" };
    });
    const client = new ApiClientImpl({ transport, session, auth });

    await expect(client.request({
      method: "POST",
      path: "/v1/ingestion-runs",
      body: { source_id: "s", tenant_id: "tenant-b" }
    })).rejects.toMatchObject({
      name: "ApiClientError",
      code: "TENANT_IN_REQUEST_BODY",
      retryable: false
    });
    expect(transportCalled).toBe(false);
  });

  it("sends Authorization and never a tenant header", async () => {
    let headers: Record<string, string> | undefined;
    const transport = new MockApiTransport().on("GET", "/v1/sources", (request) => {
      headers = request.headers;
      return { status: 200, data: [], requestId: "req-1" };
    });
    const client = new ApiClientImpl({ transport, session, auth });

    await client.request({ method: "GET", path: "/v1/sources" });

    expect(headers?.Authorization).toBe("Bearer token-1");
    expect(headers?.["X-Tenant-ID"]).toBeUndefined();
  });

  it("mock transport routes requests and preserves idempotency keys", async () => {
    const { client, transport } = createMockApiClient(session);
    let key: string | undefined;
    transport.on("POST", "/v1/ingestion-runs", (request) => {
      key = request.idempotencyKey;
      return { status: 202, data: { run_id: "r1" }, requestId: "req-1" };
    });

    const response = await client.request({
      method: "POST",
      path: "/v1/ingestion-runs",
      idempotencyKey: "k1"
    });

    expect(response.status).toBe(202);
    expect(key).toBe("k1");
  });

  it("every registered AuthAttachment adds only Authorization and no tenant header", () => {
    expect(registeredAuthAttachments.length).toBeGreaterThan(0);
    for (const { create } of registeredAuthAttachments) {
      const headers = create().attach({ "X-Request-Id": "r1" });
      expect(headers.Authorization).toBeTruthy();
      for (const name of Object.keys(headers)) {
        expect(name.toLowerCase()).not.toContain("tenant");
      }
    }
  });

  it("maps a transport problem onto the stable client error shape", () => {
    const mapped = toApiClientError({
      problem: { code: "RATE_LIMITED", message: "slow down", retryable: true, requestId: "req-9" }
    });

    expect(mapped).toBeInstanceOf(ApiClientError);
    expect(mapped.code).toBe("RATE_LIMITED");
    expect(mapped.retryable).toBe(true);
    expect(mapped.requestId).toBe("req-9");
  });

  it("maps an unknown transport failure to INTERNAL_ERROR", () => {
    const mapped = toApiClientError(new Error("socket closed"));

    expect(mapped.code).toBe("INTERNAL_ERROR");
    expect(mapped.retryable).toBe(false);
    expect(mapped.message).toBe("socket closed");
  });
});
