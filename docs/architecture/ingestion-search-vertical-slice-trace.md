# Ingestion-to-search vertical slice trace

- **Status:** Stage 2 entry artifact / shell acceptance definition — 2026-10-20
- **Sources:** `synanton/platform` `tests/integration/vertical-slice.sh` (executed demo), `docs/api/source-model.md`, `docs/api/search-model.md`, `docs/api/operation-model.md`, `docs/implementation/source-lifecycle-fixture.md`
- **Related:** [RFC 0001](../decisions/0001-ui-monorepo-unification.md), [ADR 0002](../decisions/0002-api-contracts-and-browser-ingress.md), [ADR 0003](../decisions/0003-web-framework.md), [UI inventory](./ui-inventory.md)

This trace records the routes, calls, tenant handling, and operation states of the working ingestion-to-search demo. It is the concrete exit criterion for Stage 2: the shared shell must render this flow without a big-bang rewrite.

## Scope

One slice: **create a source → ingest one document → poll the operation → search → resolve provenance**. Admin/ontology/tenant-management surfaces are out of scope.

Two ingestion entry points converge on the same run/operation/provenance model:

1. **Server-side source (demo):** `connector_type=file`, `source_endpoint=file://...`, JSON `POST /v1/ingestion-runs`.
2. **Caller-pushed bytes (UI/crawler target):** `connector_type=upload`, multipart `POST /v1/ingestion-runs` with `connector_id`, `source_id`, `resource_id`, and a `file` part whose `Content-Type` is the media type ([#328](https://github.com/synanton/platform/pull/334)).

## Verified flow and endpoints

| # | Step | Service | Call | Notes |
|---|---|---|---|---|
| 1 | Session | security provider → synflux/synquest | `Authorization: Bearer <JWT>` | Tenant and subject come only from the verified token; no `X-Tenant-ID` authority, no client storage as truth |
| 2 | Create source | synflux | `POST /v1/sources` | `{source_id, connector_id, connector_type, source_endpoint, capability_flags}`; response `201` |
| 3 | Submit run | synflux | `POST /v1/ingestion-runs` | JSON `{source_id, resource_id}` **or** multipart (bytes + identity + media type); response `202` with `run_id`, `operation_id` |
| 4 | Poll operation | synflux | `GET /v1/operations/{operation_id}` | Terminal: `SUCCEEDED` / `FAILED` / `CANCELLED` / `EXPIRED`; `outcome` is `FULL` or `PARTIAL` on success |
| 5 | Run detail | synflux | `GET /v1/ingestion-runs/{run_id}` | `IngestionRun.status` + `SyncResult` counters (`discovered/changed/unchanged/deleted/failed/skipped/quarantined/cancelled`) |
| 6 | Versions | synflux | `GET /v1/sources/{source_id}/versions` | Immutable `SourceVersion`: `version_id`, `content_digest`, `content_cache_reference`, `source_revision`, `observed_at` |
| 7 | Rebuild projection | synquest | `POST /v1/search-projection/rebuild` | Idempotent; returns `chunk_count` |
| 8 | Search | synquest | `POST /v1/search` | `{query}`; results carry `object_id`, `title`, `snippet`, `provenance_ref`, `source_version_ids` |
| 9 | Provenance | synquest | `GET {provenance_ref}` (i.e. `/v1/knowledge/{object_id}/provenance`) | `content_ref_id`, `source_version_ids`, `content_cache_reference`, `source_uri`, `source_sha256`, `chunk_sha256`, `processing_run_id` |
| 10 | Cross-tenant negative | synquest | `POST /v1/search` with tenant B's token | Must not return tenant A's hits or resolve A's provenance |

## UI routes for the slice

| Route | Responsibility | Reads |
|---|---|---|
| `/ingestion` | Source list/create, submit run, per-file state, operation progress, run result | Steps 2–6 |
| `/search` | Query, result list, open provenance | Steps 7–9 |

The shell provides layout, navigation filtering, auth boundary, error boundary, loading state, and capability-aware visibility. Tenant context is a port; the mock provider is test/story only until platform #335 settles tenant authority.

## State surfaces the UI must render

**Operation** (`/v1/operations`): `ACCEPTED`, `QUEUED`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCEL_REQUESTED`, `CANCELLED`, `EXPIRED`; `progress {completed,total}`; `outcome` on success.

**Ingestion run** (`/v1/ingestion-runs`): `DISCOVERED`, `SCHEDULED`, `ACQUIRING`, `VALIDATING`, `PUBLISHED`, `COMPLETED`, `FAILED`, `CANCELLED`, `SKIPPED`, `UNCHANGED`, `DELETED`, `QUARANTINED`.

**SyncResult**: discovered, changed, unchanged, deleted, failed, skipped, quarantined, cancelled.

The UI must show `PARTIAL`/quarantined outcomes explicitly (feature-state details), not collapse them into a generic failure.

## Tenant and auth

- Tenant/principal come from the verified session (JWT). The UI must not read tenant scope from `sessionStorage`/`localStorage` or treat a client header as authority.
- The legacy `syntology-admin` dual storage and `X-Tenant-ID` are legacy behavior only ([platform #335](https://github.com/synanton/platform/issues/335)).
- Until #335 answers authority and conveyance, `app-shell` exposes `TenantContextPort` with the mock adapter; no production provider.
- Cross-tenant access must fail closed; the exact status (403/404/silent filter) is #335's answer and is recorded in ADR 0002.

## Known gap: page provenance is not on the public search surface

The demo's search assertions resolve `provenance_ref` and check `source_version_ids`/`content_cache_reference`. They do **not** assert a page number.

The canonical `ChunkRow` carries `page_start`/`page_end`, and the legacy `POST /search` hit DTO exposes them; the frozen public `POST /v1/search` `SearchHitResource` and the provenance resource do **not**.

Current public field set:

- hit: `object_id`, `score`, `title`, `snippet`, `provenance_ref`, `source_version_ids`
- provenance: `content_ref_id`, `source_version_ids`, `content_cache_reference`, `source_uri`, `source_sha256`, `chunk_sha256`, `processing_run_id` Therefore a literal "page 40" provenance check cannot be satisfied through `/v1/search` + `/v1/knowledge/{object_id}/provenance` as currently specified.

Options, in order:

1. **Add `page_start`/`page_end` (and optionally `section_path`) to the public search hit and/or provenance resource.** Additive, backed by existing canonical columns; requires the search-contract owner to accept the extension.
2. **Use the legacy `POST /search` for page-level acceptance in the interim**, while the UI targets `/v1/search` for document/provenance and does not display page numbers until option 1 lands.

The trace records this as an open contract item; it must not be silently "solved" in the UI by reading a non-public field. Tracked as [platform #338](https://github.com/synanton/platform/issues/338).

## Stage 2 acceptance criteria

The slice is split into two independently passable criteria so the page-provenance gap does not block shell migration.

### A — Shell migration

#### A-pre — start now (design-time, not blocked on #335/#336/#338)

1. `/ingestion` and `/search` render inside the shared shell, navigation, status components, and error boundary.
2. The operation/run states above are all representable; `PARTIAL`/quarantined outcomes are explicit, not collapsed into "failed".
3. Tenant context comes from the single `TenantContextPort` seam (mock adapter today); never browser storage or a client `X-Tenant-ID`.
4. The client consumes the transport-neutral `api-client` interface with `MockApiTransport`.
5. With tenant B's mock session, the same query does not return tenant A's hit or resolve its provenance.

A-pre needs no page ranges, no real ingress, and no real tenant provider. It is executable today against the mocks.

#### A-post — blocked on #335

1. The real tenant adapter plugs into `TenantContextPort` (validated identity/conveyance per #335; multi-tenant membership adds `authorizedTenantIds` + `selectTenant`).
2. The swap test proves call sites do not move.
3. Acceptance runs against the real backend (integration-time; also needs #336 for the real generated client).

**Status:** A-pre scaffold complete (routes, shared status components, mock transport, cross-tenant negative); A-post blocked on #335.

### B — Provenance fidelity (blocked on #338)

1. The citation/provenance interaction surfaces exactly the evidence fields the platform exposes — the current set recorded above — with correlation/provenance identifiers preserved.
2. Page ranges (`page_start`/`page_end`) are displayed only when the public contract provides them. Until #338 resolves, the test asserts the current field set and does **not** silently substitute a non-public field.
3. When #338 lands, extend this criterion to assert `page_start <= 40 <= page_end` for the page-40 document.

### Design-time vs integration-time

Both criteria have two executable forms:

- **Design-time:** route/contract/state mapping executed against `MockApiTransport` — no cluster required.
- **Integration-time:** the same assertions against the running pipeline (`/v1/...` on synflux/synquest).

Node1/cluster recovery is an **integration-time** dependency, not a Stage 2 design blocker. The design-time form is what lets shell migration proceed while #335/#336/#338 are open.

### Stage 1 gaps (recorded, not blockers)

- `design-tokens` now covers spacing-scale monotonicity and light text-contrast (PR #3). The light/dark resolution test is pending a dark palette; **dark mode is not a Stage 2 criterion A blocker** — the test lands before the first dark-mode screen.
- `api-client` ships the verified-identity envelope and `MockApiTransport`; the real generated client remains blocked by #336.


## Out of scope

- Admin/ontology/tenant-management screens.
- Folder-level batch progress (the upload endpoint is one file per request; the client-declared manifest remains a follow-up).
- EPUB-specific extraction behavior (separate end-to-end check).
