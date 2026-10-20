# ADR 0002 — API contracts and browser ingress

- **Status:** Accepted — 2026-10-20 (browser REST ingress; platform token service mints tenant-bound tokens)
- **Date:** 2026-10-20
- **Owners:** Synanton Platform API/contract owners; Synanton UI maintainers
- **Related:** [RFC 0001 — UI Monorepo and Unification](0001-ui-monorepo-unification.md), [UI surface inventory](../architecture/ui-inventory.md), [ADR 0005 — Tenant identity is server-derived](0005-tenant-identity-server-derived.md), [ADR 0006 — Session-bound tenant lock and per-tab token model](0006-session-bound-tenant-lock.md), [ADR 0007 — Tenant token claim and error semantics](0007-tenant-token-claim.md), [Platform decision request #336](https://github.com/synanton/platform/issues/336), [Platform tenant-security issue #335](https://github.com/synanton/platform/issues/335)

## Context

The canonical UI repository must consume platform-owned API contracts and must not maintain duplicate request/response schemas. The future `packages/api-client` is a leaf contract-boundary package: it may depend on generated contract types and minimal transport/runtime utilities, but must not depend on design tokens, UI primitives, components, the shell, or application code.

The repository evidence is not yet sufficient to select a single browser contract pipeline:

- Platform documentation exposes both REST/OpenAPI material and gRPC/protobuf material.
- Protobuf files exist in platform source/module locations; at least one gRPC package documents a mirrored contract copy. This does not identify a single authoritative source for all UI-facing APIs.
- Existing documentation describes the Platform API (`synapt`) as the application boundary, but this audit did not verify a complete browser ingress standard for the UI.
- The current Syntology admin SPA uses an Axios client against `/api/v1/ontology`. That does not establish a general ingress contract for search and ingestion.
- The platform README records a tenant-propagation fix: tenant scope must come from verified identity; hops must not trust or forward a client-supplied tenant header, and missing context fails closed. The new client must follow the accepted platform auth/tenant contract, not preserve legacy header behavior.
- The platform has frozen API contract artifacts for identity context, search, error model, Operation model, and OAuth auth spec (see platform issue/README context); this ADR must reference those canonical artifacts rather than redefining them.

## Accepted decision (2026-10-20)

- **Browser ingress:** direct REST; the UI uses a generated REST client (Option A).
- **Identity tokens:** issued by the security provider.
- **Tenant-bound access tokens:** minted by the platform token service via `POST /v1/auth/tenant` (pattern A), after validating the requested tenant against `authorizedTenantIds`.
- **Generation/drift:** generated client from the canonical contract; pinned generator with a CI drift check. Implementation follows the platform-pinned toolchain.
- **Fallbacks:** the cookie-only branches in [ADR 0006](0006-session-bound-tenant-lock.md) remain recorded but inactive.

The decision-package text below is retained as the rationale/history.

## Platform-owner decision package

The concrete decision request is tracked in [synanton/platform#336](https://github.com/synanton/platform/issues/336). It asks whether the ingestion/search demo already uses a stable, supported browser-facing REST/HTTP surface. If yes, choose the option that matches that ingress and generate from the authoritative contract; if no, record ADR 0002 as a Stage 1 blocker for a real client until Platform selects and owns the ingress. The request asks Platform to agree now to a pinned-generator CI drift check that regenerates the client and fails if committed generated output differs, independent of transport choice.

Tenant authority and conveyance are part of the same boundary decision. The separate [security issue #335](https://github.com/synanton/platform/issues/335) asks whether `X-Tenant-ID` is authoritative or validated against the verified identity's authorized tenant set, what client convention is canonical, and what happens for an unauthorized tenant. Until answered, the new shell may define a tenant-context interface and mock provider only; it must not wire real tenant selection or reproduce the legacy dual-storage/header behavior.

If Platform cannot decide within the Stage 1 window, change this ADR status to **Deferred** and name the unresolved owner/ingress decision as the blocker. A thin transport-neutral `api-client` interface and mock may proceed only after agreement on request envelope, auth attachment boundary, stable error mapping, and correlation/provenance fields; no real generated client or endpoint implementation should ship before the canonical ingress and generation source are selected. The mock is not throwaway: it must encode the client shape the eventual transport will satisfy — request envelope, auth attachment boundary, stable error mapping, correlation/provenance identifiers, and the tenant-context attachment point. `app-shell` binds to that interface, so the mock defines the contract the real client must implement.

## Decision to be made

Platform owners must explicitly decide:

1. **Canonical contract source:** Which repository and paths are authoritative for the UI-facing APIs? If contracts are distributed by service/module, what index/aggregation mechanism defines the supported public surface?
2. **Browser ingress:** Which browser-supported boundary is authoritative: REST/HTTP JSON, Connect, gRPC-Web, or a BFF/proxy over the Platform API? State the supported endpoints and deployment/proxy assumptions.
3. **Type/client generation:** Which generator and version are used, what client/types are generated, where outputs live, and how generation is reproduced locally and in CI?
4. **Generated artifact policy:** Generate at build time, commit generated outputs, or publish a versioned generated package? State how consumers pin/review changes.
5. **Auth and tenant context:** How does the client obtain credentials, refresh/revoke session state, receive authoritative capabilities, and convey context without trusting a caller-supplied tenant identity?
6. **Error and operation mapping:** Which frozen platform error and Operation contracts are consumed, and how are transport failures mapped to a stable client error type without losing correlation/provenance?
7. **Drift and compatibility checks:** Which CI jobs validate generated-code drift and contract breaking changes?

## Options considered

### A. Generated REST client from OpenAPI / protobuf through an approved HTTP gateway or BFF

This is the preferred fit when the ingestion/search demo already has a stable, supported browser-facing HTTP surface, and it integrates naturally with HTTP auth, proxying, and observability. **Trade-off:** the OpenAPI contract or protobuf-to-HTTP mapping and gateway/BFF must be authoritative and reproducible; introducing a new BFF adds a deployment boundary.

### B. Connect or gRPC-Web client generated from protobuf

This keeps generated client code close to protobuf service contracts and can reduce schema duplication when Platform already supports this browser transport at the relevant ingress. **Trade-off:** browser ingress, proxying, authentication, and streaming behavior must be explicitly supported; current repository evidence does not prove this boundary is deployed for the UI.

### C. Direct REST calls with generated types but no generated client

This has the smallest initial runtime/tooling footprint when reusing an existing REST endpoint. **Trade-off:** handwritten transport methods and endpoint mappings can drift, so contract compatibility checks and explicit Platform ownership are essential.

## Recommendation

**No transport choice is approved by this ADR yet.** Platform owners should choose the option that matches the existing supported ingress and authoritative contracts, not create a second API surface solely to satisfy the UI architecture.

Before implementation, record a concrete decision covering all seven items above. Prefer generation from the authoritative contract into a reproducible typed client; do not hand-maintain request/response types. If the current ingress does not support the chosen generator, the platform owner must either identify the existing supported alternative or explicitly approve and own the missing ingress work.

## Consequences once accepted

- `packages/api-client` is a leaf package with generated models/client and minimal transport utilities only.
- The package may be consumed by `app-shell`, feature modules, CLI tools, tests, and other non-visual consumers without importing presentation code.
- The UI repository contains generation configuration, not copied canonical `.proto` definitions.
- CI runs a clean generation/drift check and the platform-approved contract compatibility checks.
- Authentication and tenant handling follow the verified identity/session contract. The client does not establish authorization and must not rely on a caller-controlled tenant header as the source of tenant authority. See [ADR 0005](0005-tenant-identity-server-derived.md) for the concrete client-side invariant (no tenant in `ApiRequest`, no tenant header on `AuthAttachment`, body tenant rejected).
- A shared client error model maps network/transport failures to the frozen Platform API error contract while retaining correlation identifiers and structured details where available.
- Search, ingestion, and operation clients are not implemented until the applicable API surface and ingress are confirmed.

## Open questions

- Which Platform API/contract owner will make and record the selection? Track the response and evidence in [platform issue #336](https://github.com/synanton/platform/issues/336).
- Is there a current supported browser ingress used by the ingestion/search demo? If so, where is it documented and tested?
- Which generated artifact policy is compatible with current platform release and CI workflows?
