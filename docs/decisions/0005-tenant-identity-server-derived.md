# ADR 0005 — Tenant identity is server-derived

- **Status:** Accepted — amended 2026-10-20
- **Owners:** Synanton UI maintainers (with Platform security, [#335](https://github.com/synanton/platform/issues/335))
- **Related:** [ADR 0002](0002-api-contracts-and-browser-ingress.md), [api-client README](../../packages/api-client/README.md), UI PR #3

## Decision

No auth attachment may carry tenant identity as a client-supplied header or parameter. Tenant scope derives from the verified identity and is attached/validated server-side.

- `ApiRequest` has no tenant field.
- The client derives scope only from a `VerifiedIdentity` produced by the auth boundary; a missing identity is rejected before the transport is called.
- A request body containing `tenant_id`/`tenant` is rejected with `TENANT_IN_REQUEST_BODY`, not silently ignored.
- `BearerAuthAttachment` is the reference attachment; it adds only `Authorization`.
- The model is set-shaped (Q1 answered 2026-10-20): `VerifiedIdentity` carries `authorizedTenantIds`, and a session selects one tenant from that set. Single-tenant is the N=1 case.
- `TenantContextPort.selectTenant(id)` validates against `authorizedTenantIds` and fails closed; the selected tenant is a derived context, not a caller-supplied string.
- `TenantId` is a branded type: a raw string cannot flow into a verified identity without passing through `tenantId(...)` at the auth boundary.
- A future attachment that carries tenant identity client-side is a **contract violation, not a variant**.

## Context

The legacy `syntology-admin` stores tenant state in both `sessionStorage` and `localStorage` and sends `X-Tenant-ID`. Platform security issue #335 asks whether that header is authoritative, what the canonical client convention is, and what an unauthorized tenant selection returns.

This ADR fixes the client-side invariant independently of that answer: the UI never asserts tenant scope. The #335 answer plugs into `TenantContextPort` and the session→`VerifiedIdentity` adapter without changing call sites.

## Set-shaped tenant model

The model is set-shaped (platform-confirmed, Q1 answered 2026-10-20): `VerifiedIdentity` carries `authorizedTenantIds`, and a session selects one tenant from that set. Single-tenant is N=1. `TenantContextPort.selectTenant(id)` validates against the set and fails closed. The request envelope still carries no raw tenant field; the selected tenant is part of the verified context.

`selectTenant` is a **client-initiated request** validated server-side against `authorizedTenantIds`; the resulting token is server-issued. The invariant applies to per-request tenant identity, not to the selection event. This is an extension of the rule, not an exception to it.

Q3 answered 2026-10-20: the selected tenant travels only as a claim inside the signed access token; the token carries only the selected tenant, not the full set. See [ADR 0007](0007-tenant-token-claim.md) for the error matrix and the `POST /v1/auth/tenant` selection contract.

Session-bound locking, per-tab tokens, and switching as a session lifecycle event are defined in [ADR 0006](0006-session-bound-tenant-lock.md). **Launch policy is N=1 (settled);** the set-shaped target is latent, and `selectTenant` is a single-option path at launch. Q1 answered set-shaped on 2026-10-20; the set-shaped model is platform-confirmed. Q3 (convention/authority) remains open and gates real-adapter acceptance.

## Consequences

- Tenant-scoped cache invalidation and stale-request handling key off the verified identity, not a mutable local selection.
- Any future transport (REST, Connect, or a BFF) must preserve the invariant; the envelope shape is already transport-neutral.
- A "tenant-scoped attachment" added later is rejected in review by this ADR even though the structural guard lives in `AuthAttachment` rather than the request envelope.
