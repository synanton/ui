# ADR 0006 — Session-bound tenant lock and per-tab token model

- **Status:** Accepted — 2026-10-20
- **Owners:** Synanton UI maintainers (with Platform security, [#335](https://github.com/synanton/platform/issues/335))
- **Related:** [ADR 0002](0002-api-contracts-and-browser-ingress.md), [ADR 0005](0005-tenant-identity-server-derived.md), [platform #335](https://github.com/synanton/platform/issues/335), UI issue #1

## Context

The legacy `syntology-admin` stored tenant state in both `sessionStorage` and `localStorage` and sent `X-Tenant-ID`. ADR 0005 fixes the authority rule: tenant scope is server-derived. This ADR fixes the **browser session model** that keeps a selected tenant from bleeding across tabs or surviving a switch.

The model is set-shaped (Q1 answered 2026-10-20; ADR 0005): an identity carries `authorizedTenantIds`, and a session selects one tenant from that set.

## Decision

1. **Per-tab, tenant-bound tokens in `sessionStorage`.** Each tab holds its own token; no shared cookie and no `localStorage` tenant state.
2. **The tenant is locked for the session.** Switching tenant is a session lifecycle event: `selectTenant` calls `POST /v1/auth/tenant` (ADR 0007) and installs the returned tenant-bound token; the old one is revoked asynchronously.
3. **In-flight requests during a switch are aborted and re-issued** under the new token. There is no grace window in the initial design; a stale-token response is never accepted.
4. **`selectTenant` fails closed.** A selection outside `authorizedTenantIds` is rejected (ADR 0005); the current lock remains.
5. **Duplicate-tab detection via `BroadcastChannel`.** Tabs coordinate lock/switch events; a second tab does not silently inherit or overwrite another tab's tenant.
6. **Background activity is in-tab only.** The initial design has no ServiceWorker or Web Worker outside the tab lifecycle; if one is added, it must obtain the tab's token through an explicit, same-tenant channel.
7. **Client cache keys are prefixed by the locked tenant** and invalidated on switch. Server-side cache keying is tracked in the companion platform issue (#339).

## Refresh flow

The identity refresh cookie is browser-wide and HttpOnly; the tenant-bound access token is per-tab in `sessionStorage`. On access-token expiry, each tab calls `POST /v1/auth/tenant` with the refreshed identity token to re-mint its tenant-bound token; refresh tokens rotate. Do not put the refresh token in `sessionStorage` or attempt a per-tab cookie.

## Control hierarchy

The token lock makes the tenant **unambiguous** for a tab. Data-layer enforcement (RLS or a scoped repository, platform #339) makes the token **meaningful**. Cache keying and tab isolation are **defense-in-depth**. Client-side controls are not the isolation guarantee and do not substitute for #339; A-post can be built without #339, but cannot be declared complete without it.

## Launch policy (settled: N=1)

The model is universal; the launch policy is **single-membership (N=1)**, settled on the UI/product side (Q2). The switcher is hidden, the sole membership auto-selects, and `selectTenant` is a single-option path. The per-tab machinery is built but dormant: all tabs share the same tenant, and no user has a second tenant to leak into.

If membership later relaxes to N>1, the switcher becomes a product feature on top of this model, not a rework.

### Accepted risk (bounded by N=1)

The tenant-bound access token is stored in `sessionStorage`, which is JavaScript-readable. This is about the access token only; the identity refresh token remains in the HttpOnly cookie. At N=1, a compromised token reaches exactly one tenant — the same exposure as any single-tenant app with a stolen session.

**Revisit trigger:** when the membership policy relaxes to N>1, migrate to an access token held in memory plus an HttpOnly refresh token (optionally behind a BFF). Do not relax the policy without scheduling that migration.

### Dormant constraint (IdP multi-context)

Per-tab tenant contexts require the identity provider to support multiple simultaneous tenant contexts for one user. This is **not exercised at N=1** and is not a prerequisite for A-post.

Verify it with the platform/IdP owner before policy relaxation. Platform-side token issuance and the IdP constraint are tracked with [#336](https://github.com/synanton/platform/issues/336) (see ADR 0002). **Pattern A (platform token service, #340) avoids this constraint:** the platform holds the per-tab tenant context, so the IdP only needs the identity session.

## If the platform issues only a browser-wide cookie

**Inactive after #336's yes (2026-10-20); retained as history.** The tenant-bound `sessionStorage` token assumes the platform can mint a per-tenant token. If it can only issue a browser-wide session cookie, cookies are shared per domain and per-tab tenant isolation is not implementable with cookies alone. The pre-chosen branches, in preference order:

1. **Tab-ID discriminator (Druva):** the cookie carries the identity session; a per-tab `X-Tab-ID` header selects the tenant context the server binds to that tab. Isolation is server-side and validated against `authorizedTenantIds`.
2. **BFF (Clerk):** a backend-for-frontend holds the cookie session and issues short-lived tenant-bound tokens to the SPA; the SPA keeps per-tab tokens in memory.
3. **Scalar-per-browser-session:** one tenant per browser at a time. This reverts to the model ADR 0006 was designed to avoid and makes the accepted-risk analysis moot; it is the last resort.

This is a pre-recorded decision set, not an implementation. A cookie-only answer selects one branch rather than re-opening the design.

## Conditional: no client-holdable tenant credential

The current security-provider is a validator/facade: it signs an internal HS256 context for service-to-service propagation, publishes no JWKS, and exposes no `/v1/auth/tenant` ([security-provider#3](https://github.com/synanton/security-provider/issues/3)). If no component is designated to mint a client-holdable tenant token, activate the tab-ID branch:

- the client holds only an **opaque tab ID**, not a tenant;
- the server binds tab → tenant after validating the identity's membership;
- ADR 0005's invariant holds: no client-supplied tenant identity;
- the accepted risk changes: no client-held tenant token (better against XSS), but server-side tab→tenant binding becomes state that must be isolated, revoked, and audited.

`TabSession` keeps the same port surface (`currentTenant`, `selectTenant`); only the stored value changes from a token to a tab ID, so the swap test still holds. **`currentTenant()` may become async or cached under the tab-ID branch; the port's sync contract is a token-model assumption.**

## Consequences

- No cross-tab tenant bleed; a switch cannot leave a stale token active.
- A-post implements the adapter against this model, including `TabSession`, `BroadcastChannel`, and a **multi-tab simulation test** (two tabs, different tenant tokens, no cross-tenant leak). The swap test proves call sites do not move.
- Cross-tenant cache isolation and data-layer enforcement require a real backend (platform #339); the client key prefix is only the UI half. A-post construction is gated by #335; A-post **integration-time acceptance** is gated by #339.
- If the model changes, this ADR is amended before A-post implementation, not during it.
