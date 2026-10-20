# ADR 0003 — Web framework for the workbench

- **Status:** Accepted — 2026-10-20
- **Owners:** Synanton UI maintainers
- **Related:** [RFC 0001](0001-ui-monorepo-unification.md), [ADR 0002](0002-api-contracts-and-browser-ingress.md), [UI surface inventory](../architecture/ui-inventory.md)

## Context

The proposal that preceded RFC 0001 named Next.js. The verified migration source
(`platform/ui/syntology-admin`) is React 18 + Vite + React Router + Tailwind, and
the Stage 1 substrate (`packages/design-tokens`, `packages/ui-primitives`,
`packages/app-shell`) is React-based. The workbench is a client-side SPA behind
the platform ingress; no SSR, server actions, or Node runtime requirement has
been demonstrated.

ADR 0002 (browser ingress and contracts) remains open, but the framework choice
is independent of the transport: REST, Connect/gRPC-Web, and a BFF all work from
a client-rendered SPA. This decision only gates screen migration (Stage 2), not
the framework-agnostic shared packages.

## Decision

Use **React 18 + Vite + TypeScript** for `apps/web` and its feature modules. Do
not adopt Next.js for the workbench.

- Routing is client-side (React Router or equivalent).
- `apps/web` builds to static assets served by the existing ingress/nginx
  deployment pattern.
- The shell and feature modules remain React; `ui-primitives` stays a thin,
  framework-neutral-where-practical layer.

## Consequences

- Screen migration reuses the existing admin SPA's React/Vite patterns and does
  not introduce a second runtime/deployment boundary.
- No server-side route handlers or server actions are available in `apps/web`;
  anything requiring a server belongs behind the Platform API or a BFF chosen in
  ADR 0002.
- If SSR or a server-rendered requirement becomes demonstrated, revisit this ADR
  with the ingress/deployment owner rather than drifting into it.
