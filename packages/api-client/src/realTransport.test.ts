import { afterEach, describe, expect, it, vi } from "vitest";
import { tenantId, verifiedIdentityFrom } from "./index";
import { RealApiTransport } from "./realTransport";

const identity = verifiedIdentityFrom({ tenantId: tenantId("demo"), principalId: "alice" });

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RealApiTransport", () => {
  it("forwards the bearer credential and never adds a tenant header", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      jsonResponse({ results: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const transport = new RealApiTransport("http://api.example");

    const response = await transport.send(
      {
        method: "POST",
        path: "/v1/search",
        body: { query: "linear algebra" },
        headers: { Authorization: "Bearer token-1" }
      },
      identity
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://api.example/v1/search");
    const sent = init as RequestInit;
    expect(sent.method).toBe("POST");
    expect(sent.body).toBe(JSON.stringify({ query: "linear algebra" }));
    const sentHeaders = sent.headers as Record<string, string>;
    expect(sentHeaders.Authorization).toBe("Bearer token-1");
    expect(Object.keys(sentHeaders).some((name) => name.toLowerCase().includes("tenant"))).toBe(false);
  });

  it("maps a platform 401 to AUTHENTICATION_REQUIRED", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse({ status: 401, code: "ERR_AUTH_FAILED", detail: "Missing Bearer token" }, 401)));
    const transport = new RealApiTransport("http://api.example");

    await expect(transport.send({ method: "POST", path: "/v1/search", body: { query: "x" } }, identity))
      .rejects.toMatchObject({
        problem: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Missing Bearer token",
          retryable: false
        }
      });
  });

  it("maps a platform 403 to AUTHORIZATION_DENIED", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse({ status: 403, code: "ERR_FORBIDDEN", detail: "Not allowed" }, 403)));
    const transport = new RealApiTransport("http://api.example");

    await expect(transport.send({ method: "POST", path: "/v1/search", body: { query: "x" } }, identity))
      .rejects.toMatchObject({
        problem: { code: "AUTHORIZATION_DENIED", message: "Not allowed", retryable: false }
      });
  });

  it("passes TENANT_HEADER_NOT_SUPPORTED through for the UI message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse({ status: 400, code: "TENANT_HEADER_NOT_SUPPORTED", detail: "Tenant header is not supported" }, 400)));
    const transport = new RealApiTransport("http://api.example");

    await expect(transport.send({ method: "POST", path: "/v1/search", body: { query: "x" } }, identity))
      .rejects.toMatchObject({
        problem: { code: "TENANT_HEADER_NOT_SUPPORTED", message: "Tenant header is not supported" }
      });
  });

  it("maps an empty 503 to a retryable DEPENDENCY_UNAVAILABLE", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 503 })));
    const transport = new RealApiTransport("http://api.example");

    await expect(transport.send({ method: "POST", path: "/v1/search", body: { query: "x" } }, identity))
      .rejects.toMatchObject({
        problem: { code: "DEPENDENCY_UNAVAILABLE", retryable: true }
      });
  });

  it("passes an ADR 0007 tenant code through", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      jsonResponse({ status: 400, code: "TENANT_IN_REQUEST_BODY", detail: "tenant is not accepted" }, 400)));
    const transport = new RealApiTransport("http://api.example");

    await expect(transport.send({ method: "POST", path: "/v1/search", body: { query: "x" } }, identity))
      .rejects.toMatchObject({
        problem: { code: "TENANT_IN_REQUEST_BODY", message: "tenant is not accepted" }
      });
  });
});
