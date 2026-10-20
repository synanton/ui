import { describe, expect, it } from "vitest";
import { ApiClientError, tenantId, verifiedIdentityFrom } from "./index";
import { TabSession } from "./tabSession";
import {
  ConformanceTenantIssuanceDouble,
  tenantIssuanceIssueToken,
  type TenantIssuanceTransport
} from "./tenantIssuance";

const tenantA = tenantId("tenant-a");
const tenantB = tenantId("tenant-b");

function conformance(revoked: string[] = []) {
  return new ConformanceTenantIssuanceDouble({
    authorizedTenantIds: [tenantA],
    revokedTenantIds: revoked.map((value) => tenantId(value))
  });
}

/** Every observable property of the API problem, excluding the stack trace. */
function problemShape(error: ApiClientError) {
  return {
    name: error.name,
    code: error.code,
    message: error.message,
    retryable: error.retryable,
    requestId: error.requestId,
    details: error.details
  };
}

describe("tenant issuance conformance (ADR 0007)", () => {
  it("issues a tenant-bound token for an authorized tenant", async () => {
    await expect(conformance().issue({ identityToken: "identity-token", tenantId: tenantA }))
      .resolves.toEqual({ token: "tenant-token:tenant-a" });
  });

  it("maps missing or invalid identity to AUTHENTICATION_REQUIRED", async () => {
    await expect(conformance().issue({ identityToken: null, tenantId: tenantA }))
      .rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
    await expect(conformance().issue({ identityToken: "wrong", tenantId: tenantA }))
      .rejects.toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });

  it("maps a stale claim to TENANT_ACCESS_DENIED", async () => {
    await expect(conformance(["tenant-a"]).issue({ identityToken: "identity-token", tenantId: tenantA }))
      .rejects.toMatchObject({ code: "TENANT_ACCESS_DENIED" });
  });

  it("is anti-oracle: unauthorized and non-existing tenants are indistinguishable", async () => {
    const transport = conformance();
    const unauthorized = await transport
      .issue({ identityToken: "identity-token", tenantId: tenantB })
      .catch((error) => error);
    const nonExisting = await transport
      .issue({ identityToken: "identity-token", tenantId: tenantId("tenant-missing") })
      .catch((error) => error);

    expect(unauthorized).toBeInstanceOf(ApiClientError);
    expect(nonExisting).toBeInstanceOf(ApiClientError);
    expect(problemShape(unauthorized)).toEqual(problemShape(nonExisting));
    expect(unauthorized.code).toBe("TENANT_NOT_AVAILABLE");
  });

  it("accepts a non-double transport through the same port (one-line swap)", async () => {
    const realLike: TenantIssuanceTransport = {
      issue: async () => ({ token: "real-token" })
    };
    const issue = tenantIssuanceIssueToken(realLike, () => "identity-token");

    await expect(issue(tenantA)).resolves.toBe("real-token");
  });

  it("propagates the transport problem through the adapter", async () => {
    const issue = tenantIssuanceIssueToken(conformance(["tenant-a"]), () => "identity-token");
    await expect(issue(tenantA)).rejects.toMatchObject({ code: "TENANT_ACCESS_DENIED" });
  });

  it("drives TabSession's switch through the port and preserves the old context on failure", async () => {
    let token: string | null = "old-token";
    const session = new TabSession({
      identity: verifiedIdentityFrom({
        tenantId: tenantA,
        principalId: "alice",
        authorizedTenantIds: [tenantA, tenantB]
      }),
      initialTenant: tenantA,
      store: {
        get: () => token,
        set: (next) => {
          token = next;
        }
      },
      issueToken: tenantIssuanceIssueToken(conformance(), () => "identity-token")
    });

    // tenantB passes the local authorization check but fails issuance (the
    // conformance double authorizes only tenantA).
    await expect(session.selectTenant(tenantB))
      .rejects.toMatchObject({ code: "TENANT_SWITCH_FAILED" });
    expect(session.currentTenant()).toBe(tenantA);
    expect(token).toBe("old-token");
  });

  it("adapts the port to TabSession's issueToken callback", async () => {
    const issue = tenantIssuanceIssueToken(conformance(), () => "identity-token");
    await expect(issue(tenantA)).resolves.toBe("tenant-token:tenant-a");
  });
});
