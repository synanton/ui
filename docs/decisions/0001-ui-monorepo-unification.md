# RFC: Synanton UI Monorepo and Unification

- **Status:** Proposed
- **Owners:** Synanton UI maintainers; platform API/contract owners for API boundary decisions
- **Target repository:** `synanton/ui`
- **Related architecture:** `doc/proposal.md` — Synanton Knowledge Platform Client UI
- **Decision scope:** Web UI repository structure, shared packages, contract consumption, app-shell standards, and incremental migration from `platform/ui`

## 1. Summary

Make `synanton/ui` the canonical home for Synanton's web UI monorepo. Consolidate ingestion, search/evaluation, tenant administration, and platform administration into one pnpm workspace, orchestrated by Turborepo. Shared packages define a consistent contract, design system, and application shell.

The UI remains a thin client over the authoritative Synanton Platform API (`synapt`). The UI repository consumes canonical platform-owned contracts and generated TypeScript clients; it must not become a second owner of API schemas or backend business rules.

Migration follows a strangler pattern: establish shared foundations and adopt them incrementally while the ingestion/search demo continues. Do not block the demo on a screen rewrite.

## 2. Motivation

UI code and conventions must not evolve independently across product surfaces. Divergent request types, token definitions, tenant/auth state, navigation, and operation states are expensive to reconcile and can create inconsistent security presentation.

The existing UI architecture proposal already defines a shared Knowledge Workbench, authoritative Platform API boundary, structured provenance, capability-aware navigation, and explicit separation of resource state from operation state. This RFC turns those principles into enforceable repository and package boundaries.

## 3. Target repository layout

The following is the target, not a claim about the current repository contents:

```text
synanton/ui
├── apps/
│   └── web/                # one web workbench and deployment boundary
│       └── features/
│           ├── ingestion/
│           ├── search/     # search and retrieval evaluation
│           ├── tenants/
│           └── administration/
├── packages/
│   ├── design-tokens/      # semantic tokens, themes, spacing, typography, motion
│   ├── ui-primitives/      # accessible low-level primitives (Radix-based)
│   ├── ui-components/      # Synanton-branded general-purpose components
│   ├── domain-components/  # citations, provenance, documents, tenant/classification,
│   │                       # pipeline and operation status
│   ├── api-client/         # generated TypeScript clients and typed API boundary
│   ├── app-shell/          # layout, navigation, auth/session and tenant context
│   └── config/             # shared lint, TypeScript and Tailwind configuration
├── proto/                  # integration/generation configuration only; no copied canonical schemas
├── docs/
│   ├── ui-standard.md
│   └── decisions/
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

The initial product shape is **one `apps/web` workbench with feature modules**, not four independently deployed frontends. This matches the Knowledge Workbench framing and avoids introducing deployment boundaries without demonstrated release, audience, or operational needs. A feature may be promoted to `apps/<capability>` later if independent deployment becomes necessary. Do not create a mobile app in this RFC; revisit the existing Flutter direction separately when the web monorepo is established.

## 4. One schema: three enforceable layers

### 4.1 Contract schema

- Platform-owned canonical protobuf/API contracts remain authoritative.
- `packages/api-client` provides generated TypeScript models and clients; apps must not hand-maintain duplicate request/response interfaces for platform APIs.
- Generation must be reproducible locally and in CI, with drift and breaking-change checks.
- The UI repo may hold generation configuration, scripts, and generated build artifacts as agreed, but must not fork or silently copy canonical `.proto` definitions.
- All app network traffic crosses the approved Platform API ingress boundary. Apps must not call internal services, brokers, databases, search backends, or workflow engines directly.
- **Open decision before implementation:** identify the canonical proto source/repository, the exact generation toolchain and artifact policy, and the supported web ingress (for example, gRPC-Web or an HTTP/JSON gateway). Existing repository documentation does not yet establish one complete UI-specific generation workflow and ingress decision.

### 4.2 Design schema

- `design-tokens` is the single source of truth for semantic color, typography, spacing, density, radius, elevation, focus, motion, and light/dark themes.
- Apps consume shared tokens and shared component APIs; they must not define local competing buttons, dialogs, tables, tenant badges, or classification badges.
- `ui-primitives` contains accessible, minimally styled primitives. `ui-components` contains branded, general-purpose components. `domain-components` contains reusable Synanton knowledge-domain presentation.
- Shared components must support accessible keyboard and screen-reader interaction and explicit loading, error, unavailable, degraded, empty, and partial-success states.

### 4.3 Application schema

All apps use `app-shell` for the common application frame and context integration: authentication/session boundary, tenant switcher, capability-aware navigation, route-level error handling, loading/error states, and consistent provenance/citation interactions.

The shell may render UI according to server-provided capabilities, but client-side capabilities are never authorization decisions. The platform must authorize every protected operation. Unknown or incomplete security context fails closed.

Tenant context must come from authoritative platform/session state. Tenant changes must isolate or invalidate tenant-scoped caches, cancel stale in-flight work where possible, and revalidate protected views. Do not keep competing tenant identities in unrelated local/session storage keys.

## 5. Dependency direction and package boundaries

The permitted dependency flow is one-way:

```text
design-tokens
    ↓
ui-primitives
    ↓
ui-components
    ↓
domain-components
    ↓
app-shell
    ↓
apps/*
```

`api-client` is a shared **leaf contract-boundary package** consumed by `app-shell` and feature modules. It may depend only on generated contract types and minimal transport/runtime utilities; it must not depend on `design-tokens`, `ui-primitives`, `ui-components`, `domain-components`, `app-shell`, or any app. Enforce this as a dependency-graph rule in lint/CI, not as a convention. This keeps it usable by CLI tools, backend tooling, and tests without presentation dependencies. `config` is tooling-only and must not introduce runtime dependencies.

Additional rules:

- An app must never import another app's source.
- Shared packages must never import from `apps/*`.
- Lower-level packages must not import higher-level packages.
- Domain components may depend on general UI components and the API contract types, but not on a particular app's routing or feature implementation.
- Promote an app-local component into a shared package only when at least two apps need it and its API/state semantics are stable. Avoid premature abstraction.

Enforce these rules with workspace-aware lint/import-boundary checks and CI. Add a CI check that app styles consume the shared token package rather than redefining semantic tokens locally.

## 6. Package manager, orchestration, and release policy

- Use pnpm workspaces and `workspace:*` for local package dependencies.
- Use Turborepo for dependency-aware build, lint, test, type-check, and code-generation tasks.
- Use Changesets for coordinated package change notes/versioning where versioned releases are needed.
- During monorepo development, workspace packages resolve locally without a publish step. Release versioning is a separate concern; do not require pinned published package versions for every internal development change.
- CI should validate a clean install, generated-client consistency, package boundaries, type checks, lint, tests, and app builds.

## 7. Shared domain components

Start with components crossing ingestion and search/evaluation:

1. Citation badge and citation reference interaction.
2. Provenance/evidence panel.
3. Classification badge/metadata.
4. Pipeline and long-running operation status.

Use structured API data; do not infer citations from answer text or operation completion from progress messages. Keep **resource state** distinct from the **operation lifecycle** that produced it. Preserve source identity/version and platform-supplied provenance. Components must represent partial/degraded states instead of implying that all downstream work succeeded.

## 8. Incremental migration

Use a strangler migration, not a big-bang rewrite.

### Stage 0 — inventory and decisions

- Inventory each current and planned app: repository/path, framework/build tooling, component library, auth/session handling, tenant context, API access, tests, and deployment.
- Record actual locations of ingestion, search, tenant, and admin UI. The current main-branch view previously inspected confirmed `platform/ui/syntology-admin` and `platform/ui/shared-ui`; it did not establish four separate top-level app directories.
- Record the verified [UI surface inventory](../architecture/ui-inventory.md); distinguish implemented routes from proposed features and missing surfaces.
- Resolve canonical proto source, generation workflow, API ingress, and auth/session assumptions with platform owners through [ADR 0002](0002-api-contracts-and-browser-ingress.md).
- Record the web framework decision in ADR 0003 before migrating screens; this gates screen migration, not framework-agnostic shared packages.

### Stage 1 — establish the substrate

- Add pnpm workspace and Turborepo configuration in `synanton/ui`.
- Implement semantic design tokens and the shared app shell.
- Define tenant/session/capability context and cache-isolation rules.
- Establish the generated API client workflow once the contract and ingress decisions are confirmed.
- Add dependency-boundary linting and CI before shared packages spread, including an explicit rule that `api-client` has no dependency on visual or application packages.
- Once Stage 1 is complete, freeze `platform/ui` for new cross-cutting work (navigation, tenant/session handling, API clients, shared components); keep it as a migration source until retirement criteria are met.
- Replace placeholder package scripts with meaningful build, lint, type-check, and test tasks.

### Stage 2 — prove one vertical slice

Wrap one representative ingestion-to-search flow in the shared shell. Validate tenant context, API calls, structured provenance, async operation state, errors, and navigation continuity. Keep screen-level rewrites out of scope unless needed for the slice to work.

### Stage 3 — migrate remaining apps incrementally

Adopt the shell first in each app, then replace duplicated components one at a time. Preserve working app-specific screens and feature behavior. Migrate tenant administration and platform/Syntology administration after the first slice validates the package contracts.

### Stage 4 — retire the duplicate workspace

Once all four apps build and run from `synanton/ui`, update `platform/ui` to a documented pointer/redirect or archive it according to repository policy. Do not maintain two permanent UI implementation homes.

## 9. UI standard document

Create `docs/ui-standard.md` before broad adoption. It must define:

- package ownership and import rules;
- component promotion criteria;
- tokens, themes, density, accessibility, and semantic states;
- app-shell requirements and route/navigation conventions;
- auth, tenant context, capability rendering, and cache isolation;
- API client generation and ingress boundary;
- provenance/citation and long-running operation patterns;
- required CI checks and how to add or change shared components.

## 10. Ownership and governance

- Synanton UI maintainers own the monorepo, design tokens, shared components, shell, and UI standards.
- Platform maintainers own canonical API/protobuf schemas, API behavior, authorization, and the supported ingress boundary.
- Generated clients are derived artifacts, not a second source of truth.
- Shared-package changes require tests and a Changeset when release/version policy calls for one.
- No app team may independently redefine cross-app design tokens, tenant/session semantics, or API request/response types.

## 11. Acceptance criteria

- [ ] `synanton/ui` is the documented canonical UI implementation repository.
- [ ] pnpm workspace and Turborepo provide reproducible app/package tasks.
- [ ] The four app entry points and their current locations are inventoried.
- [ ] Canonical protobuf source, TypeScript generation, and API ingress are documented and verified with platform owners.
- [ ] No app hand-maintains duplicate platform request/response types for APIs covered by generated clients.
- [ ] All apps consume shared semantic tokens and the common app shell.
- [ ] Tenant switching cannot leak tenant-scoped cached or in-flight data across tenants.
- [ ] Platform authorization remains authoritative; the UI fails closed on incomplete security context.
- [ ] Dependency-boundary linting and token-conformance checks run in CI.
- [ ] Citation/provenance and operation-state components are adopted in at least the ingestion/search vertical slice.
- [ ] `platform/ui` is retired as an implementation home only after migration is verified.

## 12. Open questions

1. Which repository/path is the canonical source for the UI-facing protobuf contracts?
2. What is the supported browser ingress: gRPC-Web, an HTTP/JSON gateway, or another explicitly documented Platform API interface?
3. Where should generated TypeScript artifacts live: generated at build time only, or published/committed through a controlled pipeline?
4. What existing authentication/session mechanism should the shared shell consume, and how is tenant context validated by the Platform API?
5. Which web framework will `apps/web` use? Record the decision in ADR 0003 before screen migration.
6. What is the migration order after the first ingestion/search vertical slice?

## 13. Decision requested

Approve the direction of one canonical `synanton/ui` monorepo with strict layered dependencies, platform-owned contracts, shared design tokens and app shell, and incremental migration from `platform/ui`. Close the open implementation decisions before finalizing the API client generation pipeline.
