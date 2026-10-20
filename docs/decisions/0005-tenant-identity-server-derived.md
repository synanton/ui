# ADR 0005 — Tenant identity is server-derived

- **Status:** Accepted — 2026-10-20
- **Owners:** Synanton UI maintainers (with Platform security, [#335](https://github.com/synanton/platform/issues/335))
- **Related:** [ADR 0002](0002-api-contracts-and-browser-ingress.md), [api-client README](../../packages/api-client/README.md), UI PR #3

## Decision

No auth attachment may carry tenant identity as a client-supplied header or parameter. Tenant scope derives from the verified identity and is attached/validated server-side.

- `ApiRequest` has no tenant field.
- The client derives scope only from a `VerifiedIdentity` produced by the auth boundary; a missing identity is rejected before the transport is called.
- A request body containing `tenant_id`/`tenant` is rejected with `TENANT_IN_REQUEST_BODY`, not silently ignored.
- `BearerAuthAttachment` is the reference attachment; it adds only `Authorization`.
- A future attachment that carries tenant identity client-side is a **contract violation, not a variant**.

## Context

The legacy `syntology-admin` stores tenant state in both `sessionStorage` and `localStorage` and sends `X-Tenant-ID`. Platform security issue #335 asks whether that header is authoritative, what the canonical client convention is, and what an unauthorized tenant selection returns.

This ADR fixes the client-side invariant independently of that answer: the UI never asserts tenant scope. The #335 answer plugs into `TenantContextPort` and the session→`VerifiedIdentity` adapter without changing call sites.

## Consequences

- Tenant-scoped cache invalidation and stale-request handling key off the verified identity, not a mutable local selection.
- Any future transport (REST, Connect, or a BFF) must preserve the invariant; the envelope shape is already transport-neutral.
- A "tenant-scoped attachment" added later is rejected in review by this ADR even though the structural guard lives in `AuthAttachment` rather than the request envelope.
