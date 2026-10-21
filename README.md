# Synanton UI

**Multi-client UI for the Synanton Knowledge Platform**

Synanton UI is the client application layer for the Synanton AI-native
enterprise knowledge platform. It provides two complementary interfaces:

-   **Web Management & Evaluation Dashboard** --- Next.js, React, and
    TypeScript
-   **Mobile Knowledge Assistant** --- Flutter and Dart

Both clients are designed as thin presentation layers over the `synapt`
public ingress API and consume contract-generated REST/gRPC/protobuf
models from the Synanton platform.

> **Runnable Demo (Phase 1, 2026-10-21).** The Vite/React app in `apps/web`
> talks to the real cluster through `RealApiTransport`; it is no longer a
> mock-only shell. Walkthrough:
> [docs/demo/demo-script.md](https://github.com/synanton/platform/blob/main/docs/demo/demo-script.md).

## Phase 1 demo capabilities

- **Search:** BM25 `POST /v1/search`; results with row-expanded provenance
  (source/chunk SHA-256, source versions, processing run).
- **Ingestion:** **Upload files** / **Upload folder** on the Ingestion tab:
  sequential multipart upload with progress, idempotent source registration, and
  operation polling. The Lucentrix CLI remains an alternative path.
- **Real transport:** `VITE_REAL_API=true`; Vite proxies `/v1/search` and
  `/v1/knowledge` to synquest, and `/v1/sources`, `/v1/ingestion-runs`,
  `/v1/operations` to synflux.
- **Not included:** original-file download. The download endpoint/UI was stopped
  before merge for a security and contract review; there is no Download button
  on `main`.
- **Known gaps:** page ranges absent (#338); demo auth is a `DEMO_AUTH_*`
  placeholder (#340); the vector leg waits on gpu-runtime #23 (2026-10-31).

## Why Synanton UI?

Synanton combines:

-   Hybrid search --- BM25 + dense-vector retrieval
-   Knowledge-graph reasoning and GraphRAG
-   Deterministic state recalculation
-   Document extraction and semantic chunking
-   Provenance and field-level citations
-   Multi-tenant authorization and classification
-   GPU-backed streaming inference

The UI should make these capabilities directly observable rather than
hiding them behind a generic chat interface.

The central principle is:

> **Knowledge is derived state.**

Search results, generated answers, graph views, and document annotations
are treated as reactive views of upstream pipelines, provenance, and
authorization state.

## Architecture

``` text
                  ┌──────────────────────────────────────────────┐
                  │            Synanton Backend Core             │
                  │   [Synquest]  [Relix]  [Syntology]  [GPU]    │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │         synapt (Public Ingress API)          │
                  │         REST / gRPC / gRPC-Web Streams       │
                  └──────────────┬────────────────┬──────────────┘
                                 │                │
                  gRPC-Web / Proto-HTTP           │ Native gRPC
                                 ▼                ▼
┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐
│       Next.js Web Application          │ │        Flutter Mobile Application      │
│                                        │ │                                        │
│ • Search & evaluation                  │ │ • Streaming RAG assistant              │
│ • PDF / document exploration           │ │ • Field-level citations               │
│ • Knowledge graph exploration          │ │ • Mobile document ingestion           │
│ • Ontology & pipeline views            │ │ • iOS / Android                        │
└────────────────────────────────────────┘ └────────────────────────────────────────┘
```

## Web Application

### Stack

-   Next.js 15+ / App Router
-   React / TypeScript
-   Tailwind CSS
-   shadcn/ui / Radix primitives
-   TanStack Query
-   Protobuf / gRPC-Web clients
-   `react-pdf`
-   React Flow or Vis.js

### Core components

#### `InteractiveDocumentViewer`

Explores source documents together with extracted semantic chunks.

-   PDF rendering with coordinate overlays
-   Bounding-box highlighting from `page_coordinates`
-   Section hierarchy via `section_path`
-   Token counts
-   Classification metadata
-   Chunk-level provenance

#### `HybridSearchWorkspace`

Evaluation workspace for comparing retrieval strategies.

-   BM25 vs. dense vector vs. hybrid retrieval
-   Side-by-side retrieval streams
-   Lexical weights, vector distances, unified scores
-   Expandable JSON/resource-consumption details
-   Ingestion and query timing information

#### `RelixGraphExplorer`

Interactive visualization of knowledge-graph and GraphRAG structures.

-   Syntology entities
-   Relix relations
-   `one_hop` and `k_hop_path` traversal
-   Query execution paths
-   Semantic definitions and source references

## Mobile Application

### Stack

-   Flutter
-   Dart 3.x
-   Strict null safety
-   BLoC or Riverpod
-   Native Dart gRPC
-   `file_picker`

### Core components

#### `StreamingChatInterface`

Conversational RAG interface backed by streaming gRPC.

-   Incremental response rendering
-   Streaming text tokens
-   Citation events
-   Completion state
-   Haptic feedback for important stream milestones

#### `CitationBadgeCarousel`

Compact provenance presentation for generated answers.

-   Horizontal citation badges
-   Document and section identification
-   Tap-to-expand details
-   Semantic chunk text
-   Match metrics
-   Tenant/classification metadata

#### `MobileIngestSheet`

Ad-hoc document ingestion from mobile devices.

-   File selection
-   Upload state
-   Extraction progress
-   Semantic chunking status
-   Synquest indexing status
-   Validation feedback

## Contract-Driven Integration

Both clients consume canonical Synanton protobuf contracts.

``` text
Canonical .proto schemas
          │
          ├──────────────► TypeScript / Web client
          │
          └──────────────► Dart / Flutter client
```

The generated models and client stubs should be produced as part of the
build pipeline to prevent contract drift.

The unified RAG flow is:

``` text
[User Query]
     │
     ▼
[Client Ingress Call]
     │
     ▼
[synapt.v1.QueryRequest]
     │
     ▼
[Streaming Response]
     ├──► Text tokens ──► Chat state
     │
     └──► Citations ────► Provenance registry
                              │
                              ▼
                         Citation UI
                         ├── Web: PDF/section focus
                         └── Mobile: detail sheet
```

## Security

Synanton UI is a client. It does not decide authorization; it carries a
server-issued, tenant-bound access token and displays what the server
returns. The shared model is in
[platform docs/security/security-model.md](https://github.com/synanton/platform/blob/main/docs/security/security-model.md).

### Guarantees

- **The tenant travels as a token claim, not a header or parameter.**
  `ApiRequest` has no tenant field; `AuthAttachment` adds only
  `Authorization`. `X-Tenant-ID` is rejected client-side
  (`TENANT_HEADER_NOT_SUPPORTED`); `tenant_id` in the request body is
  rejected (`TENANT_IN_REQUEST_BODY`). [ADR 0005, ADR 0007] — **Implemented**
- **Tenant selection is server-validated and fail-closed.**
  `TabSession.selectTenant(id)` targets `POST /v1/auth/tenant`; the server
  validates against `authorizedTenantIds` and returns a tenant-bound token.
  Selection outside the set is rejected uniformly (anti-oracle). [ADR 0007]
  — **Design fixed**; contract acceptance runs against
  `ConformanceTenantIssuanceDouble`.
- **Per-tab token isolation.** Each tab holds its own tenant-bound token in
  `sessionStorage`; tokens are not shared across tabs. Cross-tab
  coordination is registered at session construction, before the first
  request. [ADR 0006] — **Implemented** (dormant at N=1).
- **Switch is a session lifecycle event.** Issue-first: a failed issuance
  leaves the old tenant/token untouched (`TENANT_SWITCH_FAILED`); the
  abort/transient state is only emitted after a successful switch
  (`REQUEST_ABORTED`). Concurrent switches are rejected
  (`SWITCH_IN_PROGRESS`). Revocation is asynchronous and never blocks the
  switch. — **Implemented**
- **Tenant identity is branded.** `TenantId` is a branded type; the only cast
  lives inside `tenantId(...)`. A CI scan fails on `as TenantId` /
  `as unknown as TenantId` outside that factory. A registry-coverage test
  fails if any `AuthAttachment` implementation is unregistered. — **Implemented**

### Development authentication (placeholder)

The Vite dev server mints a development token for `POST /v1/auth/login`.
This is not a production path; it is replaced by the tenant-bound token
issuance contract (RS256 + JWKS) in [#340].

Configuration is server-side (`apps/web/.env`, see `.env.example`):
`DEMO_AUTH_USER`, `DEMO_AUTH_PASSWORD`, `DEMO_AUTH_TENANT`, and
`SYNANTON_JWT_SECRET`. If any is missing, the endpoint returns
`503 DEMO_AUTH_NOT_CONFIGURED` and issues no token. The tenant in the token
comes from `DEMO_AUTH_TENANT`, not from a code default.

`VITE_DEMO_AUTH_USER` and `VITE_DEMO_AUTH_TENANT` may prefill the login form
and are visible to the browser. The password is never a `VITE_*` value.

### What UI does not own

- Identity model (`authorizedTenantIds`) — Identity 1.29 [#341]
- Token issuance and the tenant claim schema — security-provider [#340]
- Request-time claim validation and data-layer enforcement — platform [#339]

### Accepted risks (with revisit triggers)

- **`sessionStorage` token XSS.** A stolen tenant-bound token reaches one
  tenant at N=1 — equivalent to a stolen single-tenant session. **Revisit
  before relaxing the membership policy to N>1**: migrate to in-memory
  access + HttpOnly refresh (optionally behind a BFF). Do not relax the
  policy without scheduling that migration. [ADR 0006]
- **IdP multi-context unexercised.** Per-tab tenant contexts require the
  identity provider to support multiple simultaneous contexts. Not exercised
  at N=1. Verify before policy relaxation; tracked in #336.

### Deferred

- Client-side cache tenant prefixing — required before the tenant switcher
  ships; not needed while there is no client cache and N=1.

### References

- [ADR 0002](docs/decisions/0002-api-contracts-and-browser-ingress.md) — browser ingress and generated contracts (Accepted)
- [ADR 0005](docs/decisions/0005-tenant-identity-server-derived.md) — tenant identity is server-derived
- [ADR 0006](docs/decisions/0006-session-bound-tenant-lock.md) — per-tab tenant-bound token model
- [ADR 0007](docs/decisions/0007-tenant-token-claim.md) — token claim and error matrix (acceptance contract)
- [UI inventory](docs/architecture/ui-inventory.md), [vertical slice trace](docs/architecture/ingestion-search-vertical-slice-trace.md)

## Development Phases

  -----------------------------------------------------------------------
  Phase                   Scope                   Deliverables
  ----------------------- ----------------------- -----------------------
  1                       Contract validation     Next.js and Flutter
                                                  scaffolds; protobuf
                                                  generation; ingress
                                                  integration

  2                       Core RAG                Search workspace;
                                                  streaming chat;
                                                  citation badges

  3                       Deep exploration        PDF/chunk viewer; Relix
                                                  graph explorer; mobile
                                                  ingestion

  4                       Security & polish       JWT/session
                                                  integration;
                                                  multi-tenant flows;
                                                  stress testing
  -----------------------------------------------------------------------

## Repository Structure

A proposed repository layout:

``` text
synanton/ui
├── web/                    # Next.js application
├── mobile/                 # Flutter application
├── proto/                  # Generated/shared contract integration
├── docs/                   # Architecture and UI documentation
└── README.md
```

The exact protobuf ownership and generation mechanism should follow the
existing Synanton repository structure rather than duplicating canonical
schemas.

## Current Status

**Runnable demo (Phase 1).** See the Phase 1 section above. The broader
Next.js/mobile descriptions in this README document the longer-term product;
the demo client is the Vite/React application in `apps/web`. The vector leg is
pending the gpu-runtime #23 decision (2026-10-31).

## Related Synanton Components

The UI is intended to integrate with:

-   `synapt` --- public API ingress
-   `Synquest` --- search and retrieval
-   `Relix` --- knowledge graph and graph reasoning
-   `Syntology` --- ontology and semantic definitions
-   GPU / inference services
-   `content_extractor` --- document extraction and coordinates

## Design Principles

1.  **Thin clients** --- business and authorization logic stays in the
    backend.
2.  **Contract-driven development** --- generated clients derive from
    canonical protobuf definitions.
3.  **Provenance by default** --- generated knowledge remains traceable
    to source material.
4.  **Reactive derived state** --- UI reflects pipeline state rather
    than duplicating backend state.
5.  **Web for exploration** --- dense analytical and document-oriented
    workflows belong on the web.
6.  **Mobile for interaction** --- conversational knowledge discovery
    belongs on mobile.
7.  **Observable AI** --- retrieval, citations, graph context, and
    processing state should be inspectable.

