import { ApiClientError, type TenantId } from "./index";

export interface TenantIssuanceRequest {
  /** Identity-scoped session credential (browser-wide). Never a tenant assertion. */
  identityToken: string | null;
  tenantId: TenantId;
}

export interface TenantIssuanceResponse {
  /** Tenant-bound access token; the claim carries only the selected tenant. */
  token: string;
}

/** Port for `POST /v1/auth/tenant` (ADR 0007). */
export interface TenantIssuanceTransport {
  issue(request: TenantIssuanceRequest): Promise<TenantIssuanceResponse>;
}

export interface ConformanceTenantIssuanceOptions {
  authorizedTenantIds: readonly TenantId[];
  /** Tenants whose claim is no longer authorized (403). */
  revokedTenantIds?: readonly TenantId[];
  validIdentityToken?: string;
}

function problem(code: string, message: string, status: number): ApiClientError {
  return new ApiClientError({
    code,
    message,
    retryable: false,
    requestId: `conformance-${status}`,
    details: { status }
  });
}

/**
 * Contract conformance double for ADR 0007. It encodes the full selection
 * matrix — including the uniform-404 anti-oracle row — and is replaced by the
 * real transport without changing the adapter.
 */
export class ConformanceTenantIssuanceDouble implements TenantIssuanceTransport {
  constructor(private readonly options: ConformanceTenantIssuanceOptions) {}

  async issue({ identityToken, tenantId }: TenantIssuanceRequest): Promise<TenantIssuanceResponse> {
    if (!identityToken || identityToken !== (this.options.validIdentityToken ?? "identity-token")) {
      throw problem("AUTHENTICATION_REQUIRED", "Authentication is required", 401);
    }
    if (!tenantId) {
      throw problem("TENANT_CONTEXT_MISSING", "Tenant context is required", 401);
    }
    if (this.options.revokedTenantIds?.includes(tenantId)) {
      throw problem("TENANT_ACCESS_DENIED", "Tenant access is no longer authorized", 403);
    }
    if (!this.options.authorizedTenantIds.includes(tenantId)) {
      // Uniform for existing and non-existing tenant IDs: anti-oracle.
      throw problem("TENANT_NOT_AVAILABLE", "Tenant is not available", 404);
    }
    return { token: `tenant-token:${tenantId}` };
  }
}

/** Adapts the port to `TabSession`'s `issueToken(tenantId)` callback. */
export function tenantIssuanceIssueToken(
  transport: TenantIssuanceTransport,
  identityToken: () => string | null
): (selected: TenantId) => Promise<string> {
  return async (selected) =>
    (await transport.issue({ identityToken: identityToken(), tenantId: selected })).token;
}
