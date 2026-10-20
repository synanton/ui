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

The canonical `ChunkRow` carries `page_start`/`page_end`, and the legacy `POST /search` hit DTO exposes them; the frozen public `POST /v1/search` `SearchHitResource` and the provenance resource do **not**. Therefore a literal "page 40" provenance check cannot be satisfied through `/v1/search` + `/v1/knowledge/{object_id}/provenance` as currently specified.

Options, in order:

1. **Add `page_start`/`page_end` (and optionally `section_path`) to the public search hit and/or provenance resource.** Additive, backed by existing canonical columns; requires the search-contract owner to accept the extension.
2. **Use the legacy `POST /search` for page-level acceptance in the interim**, while the UI targets `/v1/search` for document/provenance and does not display page numbers until option 1 lands.

The trace records this as an open contract item; it must not be silently "solved" in the UI by reading a non-public field. Tracked as [platform #338](https://github.com/synanton/platform/issues/338).

## Stage 2 acceptance test

Target (`/v1/...`):

1. With tenant A's JWT, create an `upload` source and multipart-upload one real PDF (`Content-Type: application/pdf`).
2. Poll the operation to `SUCCEEDED` with `outcome: FULL`.
3. Rebuild the projection; search a phrase from **page 40**.
4. Assert a hit returns the document and `provenance_ref` resolves with the expected `source_version_ids` and `content_cache_reference`.
5. Page-level check: either the public hit exposes `page_start <= 40 <= page_end` (option 1), or the acceptance records the legacy `/search` page fields as the interim evidence.
6. With tenant B's JWT, the same query must not return tenant A's hit or resolve its provenance.

The shell migration passes when `/ingestion` and `/search` render this flow, all operation/run states above are representable, and the cross-tenant negative holds.

## Out of scope

- Admin/ontology/tenant-management screens.
- Folder-level batch progress (the upload endpoint is one file per request; the client-declared manifest remains a follow-up).
- EPUB-specific extraction behavior (separate end-to-end check).
