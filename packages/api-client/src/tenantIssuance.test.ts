import { describe, expect, it } from "vitest";
import { ApiClientError, tenantId } from "./index";
import {
  ConformanceTenantIssuanceDouble,
  tenantIssuanceIssueToken
} from "./tenantIssuance";

const tenantA = tenantId("tenant-a");
const tenantB = tenantId("tenant-b");

function conformance(revoked: string[] = []) {
  return new ConformanceTenantIssuanceDouble({
    authorizedTenantIds: [tenantA],
    revokedTenantIds: revoked.map((value) => tenantId(value))
  });
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
    expect(unauthorized.code).toBe("TENANT_NOT_AVAILABLE");
    expect(nonExisting.code).toBe("TENANT_NOT_AVAILABLE");
    expect(unauthorized.message).toBe(nonExisting.message);
    expect(unauthorized.details).toEqual(nonExisting.details);
  });

  it("adapts the port to TabSession's issueToken callback", async () => {
    const issue = tenantIssuanceIssueToken(conformance(), () => "identity-token");
    await expect(issue(tenantA)).resolves.toBe("tenant-token:tenant-a");
  });
});
