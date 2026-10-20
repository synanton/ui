# API client contract

Transport-neutral leaf package. It may not depend on design tokens, UI
primitives/components, the shell, or app code (enforced by
`scripts/check-package-boundaries.mjs`).

Until [ADR 0002](../../docs/decisions/0002-api-contracts-and-browser-ingress.md)
is accepted, this package ships the **shape** the eventual generated client must
satisfy and a mock transport:

- request envelope (`ApiRequest`),
- verified context attachment point (`RequestContext` — never browser storage or
  a client-supplied tenant header),
- auth attachment boundary (`AuthAttachment`, transport-owned),
- stable error mapping (`ApiClientError` / `ApiProblem`),
- correlation/provenance (`requestId`, `correlationId`),
- an in-memory `MockApiTransport` for shell tests.

The mock is not throwaway: `app-shell` binds to this interface, so the real
transport must preserve the same shape.
