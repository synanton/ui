# ADR 0002 — API contracts and browser ingress

- **Status:** Proposed — platform-owner decision required
- **Date:** 2026-10-20
- **Owners:** Synanton Platform API/contract owners; Synanton UI maintainers
- **Related:** [RFC 0001 — UI Monorepo and Unification](0001-ui-monorepo-unification.md), [UI surface inventory](../architecture/ui-inventory.md)

## Context

The canonical UI repository must consume platform-owned API contracts and must not maintain duplicate request/response schemas. The future `packages/api-client` is a leaf contract-boundary package: it may depend on generated contract types and minimal transport/runtime utilities, but must not depend on design tokens, UI primitives, components, the shell, or application code.

The repository evidence is not yet sufficient to select a single browser contract pipeline:

- Platform documentation exposes both REST/OpenAPI material and gRPC/protobuf material.
- Protobuf files exist in platform source/module locations; at least one gRPC package documents a mirrored contract copy. This does not identify a single authoritative source for all UI-facing APIs.
- Existing documentation describes the Platform API (`synapt`) as the application boundary, but this audit did not verify a complete browser ingress standard for the UI.
- The current Syntology admin SPA uses an Axios client against `/api/v1/ontology`. That does not establish a general ingress contract for search and ingestion.
- The platform README records a tenant-propagation fix: tenant scope must come from verified identity; hops must not trust or forward a client-supplied tenant header, and missing context fails closed. The new client must follow the accepted platform auth/tenant contract, not preserve legacy header behavior.
- The platform has frozen API contract artifacts for identity context, search, error model, Operation model, and OAuth auth spec (see platform issue/README context); this ADR must reference those canonical artifacts rather than redefining them.

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

- **Pros:** Natural browser transport; integrates with standard HTTP auth, proxying, and observability; can generate typed clients from an OpenAPI contract.
- **Cons:** Requires an authoritative OpenAPI surface or a maintained, reproducible protobuf-to-HTTP mapping; a BFF introduces an additional deployment boundary if one does not already exist.

### B. Connect or gRPC-Web client generated from protobuf

- **Pros:** Strong alignment with protobuf contracts; generated typed clients and service definitions can reduce schema duplication.
- **Cons:** Requires platform-supported browser transport, compatible ingress/proxying, and a decision about streaming and authentication. Existing repository evidence does not prove this boundary is deployed for the UI.

### C. Direct REST calls with generated types but no generated client

- **Pros:** Smaller initial runtime/tooling footprint; can fit an existing REST endpoint.
- **Cons:** Handwritten transport methods and endpoint mappings can drift; less attractive unless the platform explicitly standardizes this approach and CI validates schema compatibility.

## Recommendation

**No transport choice is approved by this ADR yet.** Platform owners should choose the option that matches the existing supported ingress and authoritative contracts, not create a second API surface solely to satisfy the UI architecture.

Before implementation, record a concrete decision covering all seven items above. Prefer generation from the authoritative contract into a reproducible typed client; do not hand-maintain request/response types. If the current ingress does not support the chosen generator, the platform owner must either identify the existing supported alternative or explicitly approve and own the missing ingress work.

## Consequences once accepted

- `packages/api-client` is a leaf package with generated models/client and minimal transport utilities only.
- The package may be consumed by `app-shell`, feature modules, CLI tools, tests, and other non-visual consumers without importing presentation code.
- The UI repository contains generation configuration, not copied canonical `.proto` definitions.
- CI runs a clean generation/drift check and the platform-approved contract compatibility checks.
- Authentication and tenant handling follow the verified identity/session contract. The client does not establish authorization and must not rely on a caller-controlled tenant header as the source of tenant authority.
- A shared client error model maps network/transport failures to the frozen Platform API error contract while retaining correlation identifiers and structured details where available.
- Search, ingestion, and operation clients are not implemented until the applicable API surface and ingress are confirmed.

## Open questions

- Which Platform API/contract owner will make and record the selection?
- Is there a current supported browser ingress used by the ingestion/search demo? If so, where is it documented and tested?
- Which generated artifact policy is compatible with current platform release and CI workflows?
