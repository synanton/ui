# ADR 0007 — Tenant token claim and error semantics

- **Status:** Accepted — 2026-10-20
- **Owners:** Platform API/contract owners (Q3); Synanton UI maintainers
- **Related:** [ADR 0005](0005-tenant-identity-server-derived.md), [ADR 0006](0006-session-bound-tenant-lock.md), [platform #335](https://github.com/synanton/platform/issues/335), [#336](https://github.com/synanton/platform/issues/336), [#339](https://github.com/synanton/platform/issues/339)

## Decision

1. **Convention:** the selected tenant travels as a claim inside the signed access token. The token carries only the selected tenant, not the full `authorizedTenantIds` set. No `X-Tenant-ID`, no tenant in the request body, no tenant in the path.
2. **Selection is not per-request scope:** `selectTenant` is a client-initiated selection event that mints a new tenant-bound token after server-side validation against `authorizedTenantIds`.
3. **Authority:** the server validates signature/issuer/audience/expiry, extracts the tenant claim, fails closed with 401 if absent, and establishes request context from the claim only. Membership is checked at issuance, refresh, and high-risk operations (writes, exports, admin).
4. **Error matrix:**

   | Case | Response |
   |---|---|
   | Missing/invalid token | 401 `AUTHENTICATION_REQUIRED` |
   | Valid token, no tenant claim | 401 `TENANT_CONTEXT_MISSING` |
   | Claim no longer authorized | 403 `TENANT_ACCESS_DENIED` |
   | Selection outside authorized set | uniform 404 `TENANT_NOT_AVAILABLE` |
   | Cross-tenant object access | 404 (normal not-found) |
   | Tenant in request body | 400 `TENANT_IN_REQUEST_BODY` |
   | Tenant header | 400 `TENANT_HEADER_NOT_SUPPORTED` |

   Silent filtering to the authorized set is not used.
5. **403 vs 404:** 403 is safe when the tenant is already known to the caller (it is in their token/current tab); 404 is required when the caller names a tenant they may not be entitled to know exists (selection, object access).
6. **Selection endpoint:** `POST /v1/auth/tenant` with the identity-scoped token → 200 tenant-bound token; 404 uniform; 401 missing context.
7. **Client:** `TabSession.selectTenant` calls the selection endpoint in the real adapter, stores the returned token per tab, and revokes the old token asynchronously. `ApiProblem`/`TenantProblemCode` carry the codes above.

## Claim schema

`iss`, `aud`, `sub`, `exp`, `nbf`, `jti`, `scope`, `tenant_id` (opaque; equals the branded `TenantId`), `token_type=tenant_access`.

Lifetimes, key algorithm/JWKS/rotation, revocation, and refresh-token handling are pinned in platform [#340](https://github.com/synanton/platform/issues/340). The adapter validates this schema and maps provider failures to the error matrix above.

## Dependency

Platform token issuance with a `tenant_id` claim is the platform half of Q4, tracked in [#336](https://github.com/synanton/platform/issues/336). **#336 answered yes on 2026-10-20:** the platform will issue tenant-bound tokens. The remaining issuance contract (issuer/signing, claims, keys, revocation, refresh, audit) is tracked in [#340](https://github.com/synanton/platform/issues/340). The cookie-only fallback branches in ADR 0006 are inactive but retained for history.

## Enforcement

[#339](https://github.com/synanton/platform/issues/339): RLS or tenant-scoped repository, transaction-scoped `SET LOCAL` (never connection-scoped), tenant-prefixed cache keys, permanent multi-tenant isolation tests.
