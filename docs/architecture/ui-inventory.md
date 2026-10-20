# UI surface inventory

- **Status:** Initial verified inventory, 2026-10-20
- **Purpose:** Establish current implementation facts before migration planning.
- **Scope:** Public/default-branch repository files accessible during this audit. “Not found” means no matching implementation was verified in the inspected repository/search results; it is not proof that no prototype exists elsewhere.

## Decision context

The target is **one web workbench** in `synanton/ui`, with feature modules for ingestion, search/evaluation, tenant management, and administration. The target feature names are not claims that separate applications already exist. A capability may remain a route/module until independent deployment has a demonstrated need.

## Current surfaces

| Capability / surface | Verified current location | Framework / stack | Auth handling | Tenant context | API access | Component library | Build / test | Disposition |
|---|---|---|---|---|---|---|---|---|
| Ingestion | No dedicated UI app or route verified in `synanton/ui` or the inspected `platform/ui` workspace. Platform has ingestion implementation docs and demo scripts, which are not themselves UI surfaces. | Not verified | Not verified | Not verified | Platform API boundary is the intended client boundary; exact ingestion UI call path not verified | Not verified | Not verified | Build/extract as a feature module in `apps/web` when the existing demo flow is traced; do not create a separate deployable by assumption |
| Search / retrieval evaluation | No dedicated search UI app verified. `synanton/ui/doc/proposal.md` describes planned Workbench/Search surfaces; `platform/ui/syntology-admin` includes a Chat route, but it was not verified as the canonical search/evaluation UI. | Proposed workbench stack is provisional; existing admin SPA is React/Vite | Existing admin SPA uses local session-presence route guard | Admin shell has a tenant switcher; see tenant row | Existing admin API client uses Axios at `/api/v1/ontology`; this is ontology/admin access, not proof of a search API client | No shared cross-app component system verified | See admin row | Implement as a feature module in `apps/web`; trace the ingestion/search demo and freeze its current behavior before migration |
| Tenant management | No standalone tenant-management app verified. A tenant selector exists inside `platform/ui/syntology-admin/src/components/Layout/Layout.tsx`; it fetches tenants via `getTenants()`. | React/TypeScript, within admin SPA | Uses the admin SPA session | Switcher stores `syntology-active-tenant` in localStorage; current session separately stores `tenantId` in sessionStorage. Selection updates local UI state/storage. | `getTenants()` from `services/adminApi`; exact endpoint not confirmed in this inventory | Inline React/Tailwind UI; no shared tenant component verified | Admin SPA scripts | Security blocker: legacy behavior is not the target convention. Keep real shell tenant context unimplemented until platform issue [#335](https://github.com/synanton/platform/issues/335) answers header authority, canonical tenant conveyance, and unauthorized-tenant response. Do not carry duplicate localStorage/sessionStorage state or client-authoritative X-Tenant-ID behavior forward |
| Administration (Syntology Admin) | `platform/ui/syntology-admin` | React 18, TypeScript, Vite, React Router 7, Tailwind CSS 4, Axios, Vitest | `services/auth.ts` reads/writes `syntology-auth` in sessionStorage; route guard checks whether a session exists. | Session contains a tenantId parsed from the token (with a legacy `demo` fallback); the shell switcher independently stores active tenant in localStorage. API client attaches bearer token and `X-Tenant-ID`. **This is legacy behavior, not the target convention.** Backend exploitability is unverified and is a platform security question tracked in [synanton/platform#335](https://github.com/synanton/platform/issues/335); do not treat the header as authoritative or implement this pattern in the new shell. | Axios base URL `/api/v1/ontology`; API calls are not generated from a verified UI-facing canonical contract in this audit | Bespoke React components and Tailwind classes; no external/shared component library verified | package scripts: `vite build`, `tsc --noEmit`, `vitest run` | Migrate incrementally into an administration feature module after shared shell and ingress decisions; preserve a working SPA during transition |
| Shared UI package | `platform/ui/shared-ui` | Only `package.json` is present in the package directory; manifest points to absent `src/index.ts` | No usable exports verified | Not verified | No implementation verified | No source API to port | `build`, `lint`, and `test` are placeholder echo scripts | **Retire, do not port.** Repository search found no `@synanton/shared-ui` consumers. Before deletion, confirm the directory tree and consumer search once more, then remove the package/workspace entry as part of legacy UI cleanup |

## Workspace facts verified

- `platform/ui/pnpm-workspace.yaml` lists only `shared-ui` and `syntology-admin`.
- The workspace root declares pnpm 9.12.0 and Node >=20; root scripts run recursive build/lint/test and start `@synanton/syntology-admin`.
- No separate `apps/ingestion`, `apps/search`, or `apps/tenant` implementation was verified in `synanton/ui` searches or the inspected platform UI workspace.
- `synanton/ui/doc/proposal.md` is a design proposal (v2.1), not proof that all of its named workbench surfaces are implemented. It describes the web Workbench as primary and the mobile client as a separate, later concern.
- Platform API documentation includes REST/OpenAPI and gRPC/protobuf material, but this audit did not establish one complete UI-facing canonical contract source, TypeScript generator, or supported browser ingress. See [ADR 0002](../decisions/0002-api-contracts-and-browser-ingress.md).

## Duplicate implementations / consolidation candidates

| Area | Evidence observed | Follow-up |
|---|---|---|
| Tenant state / switcher | Session tenant in `sessionStorage` and active tenant in `localStorage` in the admin SPA; API sends `X-Tenant-ID` | **Legacy only; not the desired convention.** Platform security issue [#335](https://github.com/synanton/platform/issues/335) must settle server validation and the canonical tenant contract before the shell wires a real provider. Interface/mock provider only until then; eventual tenant changes must invalidate tenant-scoped caches and stale requests |
| API client | Bespoke Axios client in `syntology-admin`; `shared-ui` manifest describes an API-client base but its implementation/scripts were not validated | After ADR 0002, define a contract-only `api-client` leaf and migrate callers incrementally |
| Navigation / shell | `Layout.tsx` owns bespoke top bar, nav links, logout, tenant selector | Promote shared shell contract; keep feature routes within `apps/web` |
| General UI primitives | Admin UI uses inline Tailwind classes; `shared-ui` build/lint/test scripts are placeholders | Inspect actual exports/consumers before porting; avoid promoting components without stable APIs |
| Design tokens | Admin uses local `brand-*` classes and Tailwind styling; one authoritative token package was not verified | Introduce semantic tokens and CI conformance; inventory all token definitions during migration |
| Dialogs, tables, buttons, modals, classification badges | A complete cross-repo duplicate count was not established in this pass | Add source-level component inventory before deciding promotion candidates; do not claim duplicates without evidence |

## Decisions / next steps

1. Adopt one `apps/web` workbench with feature modules; defer separate deployables until release cadence, audience, or operational constraints justify them.
2. Record the web framework choice in ADR 0003 before migrating screens. Shared packages should not depend on the router/framework.
3. Resolve ADR 0002 with platform API/contract owners via [platform decision request #336](https://github.com/synanton/platform/issues/336) before implementing a real `api-client`; the request includes the browser-demo decision question and generated-client drift CI proposal.
4. Treat `platform/ui/shared-ui` as retire-not-port: its package manifest references a missing `src/index.ts`, its scripts are placeholders, and no consumers were found in repository search. Reconfirm tree/consumer search before removing it.
5. Trace the working ingestion-to-search demo and identify the actual browser-facing endpoints before choosing the first migration slice.
6. Introduce dependency-boundary CI before any app consumes the first shared package.
7. Freeze `platform/ui` for new cross-cutting UI work after Stage 1; retain it only as a migration source until all required surfaces are verified in `synanton/ui`.
