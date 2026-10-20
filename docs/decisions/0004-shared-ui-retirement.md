# ADR 0004 — Retire `platform/ui/shared-ui`

- **Status:** Accepted — 2026-10-20
- **Owners:** Synanton UI maintainers
- **Related:** [RFC 0001](0001-ui-monorepo-unification.md), [UI surface inventory](../architecture/ui-inventory.md)

## Context

`platform/ui/shared-ui` contains only `package.json`. Its manifest points to a
missing `src/index.ts`, and its `build`, `lint`, and `test` scripts are
placeholder echoes. Repository-wide search found no `@synanton/shared-ui`
consumers; a reconfirmation on 2026-10-20 matched only the package's own
manifest name. The directory tree contains no source, tests, or assets.

Carrying this package forward would create a false compatibility surface and
invite placeholder code into the new packages.

## Decision

Retire `platform/ui/shared-ui`. Do **not** port it into `synanton/ui`.

- `packages/ui-primitives`, `packages/design-tokens`, and `packages/app-shell`
  start fresh in `synanton/ui` as the only shared UI implementation.
- Remove `platform/ui/shared-ui` and its `shared-ui` entry in
  `platform/ui/pnpm-workspace.yaml` as part of legacy UI cleanup.
- Do not reintroduce a compatibility package named `shared-ui`.

## Consequences

- No migration work is spent on an empty package.
- `platform/ui` remains a migration source for `syntology-admin` only, and is
  frozen for new cross-cutting work after Stage 1.
- If a future consumer needs a component, it comes from the new packages (or a
  new, implemented package), never from the retired placeholder.
