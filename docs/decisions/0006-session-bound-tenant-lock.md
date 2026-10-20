# ADR 0006 — Session-bound tenant lock and per-tab token model

- **Status:** Accepted — 2026-10-20
- **Owners:** Synanton UI maintainers (with Platform security, [#335](https://github.com/synanton/platform/issues/335))
- **Related:** [ADR 0002](0002-api-contracts-and-browser-ingress.md), [ADR 0005](0005-tenant-identity-server-derived.md), [platform #335](https://github.com/synanton/platform/issues/335), UI issue #1

## Context

The legacy `syntology-admin` stored tenant state in both `sessionStorage` and `localStorage` and sent `X-Tenant-ID`. ADR 0005 fixes the authority rule: tenant scope is server-derived. This ADR fixes the **browser session model** that keeps a selected tenant from bleeding across tabs or surviving a switch.

The target model is set-shaped (ADR 0005): an identity carries `authorizedTenantIds`, and a session selects one tenant from that set.

## Decision

1. **Per-tab, tenant-bound tokens in `sessionStorage`.** Each tab holds its own token; no shared cookie and no `localStorage` tenant state.
2. **The tenant is locked for the session.** Switching tenant is a session lifecycle event: select from `authorizedTenantIds`, re-issue the token, revoke/retire the old one. There is no in-place mutation of an active token's scope.
3. **In-flight requests during a switch are aborted and re-issued** under the new token. There is no grace window in the initial design; a stale-token response is never accepted.
4. **`selectTenant` fails closed.** A selection outside `authorizedTenantIds` is rejected (ADR 0005); the current lock remains.
5. **Duplicate-tab detection via `BroadcastChannel`.** Tabs coordinate lock/switch events; a second tab does not silently inherit or overwrite another tab's tenant.
6. **Background activity is in-tab only.** The initial design has no ServiceWorker or Web Worker outside the tab lifecycle; if one is added, it must obtain the tab's token through an explicit, same-tenant channel.
7. **Client cache keys are prefixed by the locked tenant** and invalidated on switch. Server-side cache keying is tracked in the companion platform issue (#339).

## Control hierarchy

The token lock makes the tenant **unambiguous** for a tab. Data-layer enforcement (RLS or a scoped repository, platform #339) makes the token **meaningful**. Cache keying and tab isolation are **defense-in-depth**. Client-side controls are not the isolation guarantee and do not substitute for #339; A-post can be built without #339, but cannot be declared complete without it.

## Launch policy

The model is universal. The launch policy may be single-membership (N=1) with the switcher deferred; if Platform answers single-tenant, the switcher UI is not built, but the per-tab lock still applies. If Platform answers multi-tenant, the switcher becomes a product feature on top of this model, not a rework.

## Consequences

- No cross-tab tenant bleed; a switch cannot leave a stale token active.
- A-post implements the adapter against this model, including `TabSession`, `BroadcastChannel`, and a **multi-tab simulation test** (two tabs, different tenant tokens, no cross-tenant leak). The swap test proves call sites do not move.
- Cross-tenant cache isolation and data-layer enforcement require a real backend (platform #339); the client key prefix is only the UI half. A-post construction is gated by #335; A-post **integration-time acceptance** is gated by #339.
- If the model changes, this ADR is amended before A-post implementation, not during it.
