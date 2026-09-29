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

Client authentication and authorization are part of the integration
contract.

The design includes:

-   JWT-based client sessions
-   Tenant-aware authorization
-   Classification metadata
-   Provenance-aware access
-   Backend-enforced authorization

The UI should never be treated as the security boundary. Authorization
decisions remain enforced by the Synanton backend.

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

**Design / architecture proposal**

The project is ready for implementation planning. The main decisions
still to be finalized are the API contract boundary, protobuf generation
workflow, web/mobile authentication flow, and the initial MVP component
set.

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

