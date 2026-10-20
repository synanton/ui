import { describe, expect, it } from "vitest";
import {
  ApiClientError,
  ApiClientImpl,
  MockApiTransport,
  createMockApiClient,
  toApiClientError,
  type RequestContext
} from "./index";

const context: RequestContext = { tenantId: "tenant-a", principalId: "alice" };

describe("api-client", () => {
  it("rejects missing verified tenant before the transport runs", async () => {
    const transport = new MockApiTransport();
    const client = new ApiClientImpl(transport, () => ({ tenantId: "  ", principalId: "alice" }));

    await expect(client.request({ method: "GET", path: "/v1/sources" })).rejects.toMatchObject({
      name: "ApiClientError",
      code: "AUTHENTICATION_REQUIRED",
      retryable: false
    });
  });

  it("passes the envelope and verified context to the transport", async () => {
    let seenContext: RequestContext | undefined;
    let seenRequest: { idempotencyKey?: string } | undefined;
    const transport = new MockApiTransport().on("POST", "/v1/ingestion-runs", (request, ctx) => {
      seenRequest = request;
      seenContext = ctx;
      return { status: 202, data: { run_id: "r1" }, requestId: "req-1" };
    });
    const client = new ApiClientImpl(transport, () => context);

    const response = await client.request({
      method: "POST",
      path: "/v1/ingestion-runs",
      body: { source_id: "s" },
      idempotencyKey: "k1"
    });

    expect(response).toEqual({ status: 202, data: { run_id: "r1" }, requestId: "req-1" });
    expect(seenContext).toEqual(context);
    expect(seenRequest?.idempotencyKey).toBe("k1");
  });

  it("mock transport routes requests and preserves idempotency keys", async () => {
    const { client, transport } = createMockApiClient(() => context);
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
