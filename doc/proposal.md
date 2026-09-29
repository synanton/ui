# Synanton Knowledge Platform Client UI

## System Architecture & Multi-Client UI Component Specification

**Status:** Design Proposal\
**Project:** Synanton UI\
**Scope:** Web Management/Evaluation Client + Mobile Knowledge Assistant

------------------------------------------------------------------------

## 1. Executive Summary

This proposal defines the client architecture, component model, and
implementation roadmap for the Synanton Knowledge Platform user
interfaces.

Synanton is an AI-native enterprise knowledge platform combining:

-   hybrid search --- BM25 + dense-vector retrieval;
-   knowledge-graph reasoning and GraphRAG;
-   deterministic state recalculation;
-   document extraction and semantic chunking;
-   provenance-aware generated answers;
-   authorization and classification metadata.

The client ecosystem is divided into two target-optimized environments:

1.  **Web Management & Evaluation Dashboard** --- Next.js, React, and
    TypeScript for dense analytical interfaces, document exploration,
    PDF coordinate mapping, search evaluation, and graph visualization.
2.  **Mobile Knowledge Assistant** --- Flutter and Dart for a responsive
    conversational assistant with streaming RAG and compact field-level
    citations.

Both clients are intended to remain thin presentation layers over the
`synapt` public ingress API.

------------------------------------------------------------------------

## 2. Architectural Alignment

The front-end architecture follows the Synanton principle:

> **Knowledge is derived state.**

The UI does not treat search results, generated text, graph structures,
or annotations as isolated static records. They are views derived from
upstream processing pipelines, source provenance, and authorization
state.

### System topology

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
            gRPC-Web / Proto-HTTP│                │Native gRPC
                                 ▼                ▼
┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐
│     Next.js Web Application            │ │       Flutter Mobile Application       │
│                                        │ │                                        │
│ • Dense data grids                     │ │ • Streaming RAG                        │
│ • PDF / coordinate exploration         │ │ • Citation-oriented chat              │
│ • Hybrid search evaluation              │ │ • Mobile ingestion                     │
│ • Knowledge graph visualization        │ │ • iOS / Android                        │
│ • Ontology / pipeline views            │ │ • Lightweight executive workflow      │
└────────────────────────────────────────┘ └────────────────────────────────────────┘
```

The architecture deliberately separates:

-   **platform capabilities** --- implemented by Synanton backend
    services;
-   **API contracts** --- exposed through `synapt`;
-   **presentation and interaction** --- implemented independently by
    web and mobile clients.

------------------------------------------------------------------------

# 3. Web Client

## 3.1 Role

The Web Client is the primary evaluation and administrative workspace.

It is optimized for:

-   complex search evaluation;
-   document and PDF exploration;
-   semantic chunk inspection;
-   knowledge graph visualization;
-   ontology and pipeline inspection;
-   dense tables and diagnostics;
-   enterprise-oriented workflows.

## 3.2 Technical Stack

  Area            Technology
  --------------- ----------------------------
  Framework       Next.js 15+ / App Router
  Language        TypeScript
  Styling         Tailwind CSS
  UI primitives   shadcn/ui / Radix
  Data fetching   TanStack Query
  API             REST + gRPC-Web / protobuf
  PDF             `react-pdf`
  Graph           React Flow or Vis.js

The exact gRPC-Web transport should be selected after validating the
current `synapt` API contract and browser deployment topology.

------------------------------------------------------------------------

## 3.3 Component W1 --- `InteractiveDocumentViewer`

### Objective

Display source documents together with extracted semantic chunks and
their source coordinates.

### Capabilities

-   PDF rendering;
-   page-coordinate overlays;
-   bounding-box highlighting;
-   semantic chunk selection;
-   section hierarchy display;
-   token-count metadata;
-   classification metadata;
-   source/provenance navigation.

### Data relationship

``` text
Source PDF
    │
    ├── page
    │    └── page_coordinates
    │
    └── extracted chunk
          ├── section_path
          ├── token count
          └── classification metadata
```

A citation originating from a generated answer should be able to
navigate directly to the relevant page and coordinate when the
underlying extraction contract provides sufficient information.

------------------------------------------------------------------------

## 3.4 Component W2 --- `HybridSearchWorkspace`

### Objective

Provide an evaluation environment for the Synanton Search Kernel.

### Primary comparisons

-   BM25 / lexical retrieval;
-   dense-vector retrieval;
-   hybrid fusion;
-   unified ranking.

### UI capabilities

-   split-pane comparison;
-   retrieval result tables;
-   lexical score display;
-   vector-distance display;
-   unified score display;
-   expandable result details;
-   JSON inspection;
-   ingestion/query resource metrics.

Example conceptual layout:

``` text
┌───────────────────────────────┬───────────────────────────────┐
│ BM25                          │ Dense / Hybrid                │
│                               │                               │
│ result 1   score              │ result 1   vector distance   │
│ result 2   score              │ result 2   vector distance   │
│ result 3   score              │ result 3   unified score     │
│                               │                               │
└───────────────────────────────┴───────────────────────────────┘
```

The component is primarily an engineering and evaluation tool rather
than a simplified end-user search box.

------------------------------------------------------------------------

## 3.5 Component W3 --- `RelixGraphExplorer`

### Objective

Visualize knowledge-graph structures and GraphRAG retrieval subgraphs.

### Capabilities

-   ontology entity visualization;
-   Relix relation visualization;
-   `one_hop` traversal;
-   `k_hop_path` traversal;
-   query execution path visualization;
-   semantic-definition side panel;
-   source-reference navigation.

Conceptual model:

``` text
                   [Entity A]
                       │
                 relation X
                       │
                       ▼
                   [Entity B]
                    ╱     ╲
               one_hop    relation Y
                  ╱         ╲
                 ▼           ▼
             [Entity C]   [Entity D]
```

The visualization should distinguish persisted ontology relationships
from inferred/retrieval-time graph paths where the underlying API
provides that distinction.

------------------------------------------------------------------------

# 4. Mobile Client

## 4.1 Role

The Mobile Client is an executive-oriented conversational interface for
rapid knowledge discovery.

It is optimized for:

-   streaming conversational interaction;
-   compact provenance presentation;
-   high responsiveness;
-   mobile document ingestion;
-   iOS and Android deployment.

## 4.2 Technical Stack

  Area          Technology
  ------------- --------------------
  Framework     Flutter
  Language      Dart 3.x
  Safety        Strict null safety
  State         BLoC or Riverpod
  Network       Native Dart gRPC
  File access   `file_picker`

The choice between BLoC and Riverpod should be finalized during the
initial implementation spike.

------------------------------------------------------------------------

## 4.3 Component M1 --- `StreamingChatInterface`

### Objective

Provide the primary conversational RAG workflow.

### Capabilities

-   native gRPC streaming;
-   incremental text rendering;
-   citation-event processing;
-   stream lifecycle state;
-   completion/error state;
-   optional haptic feedback at stream milestones.

Conceptual stream:

``` text
ExecuteStream
     │
     ├──► text token
     ├──► text token
     ├──► citation
     ├──► text token
     └──► completion
```

The UI should maintain a stream state model rather than rebuilding the
complete answer for every incoming event.

------------------------------------------------------------------------

## 4.4 Component M2 --- `CitationBadgeCarousel`

### Objective

Expose provenance without overwhelming a mobile screen.

### Interaction

``` text
┌─────────────────────────────────────────────────────┐
│ Generated answer...                                 │
│                                                     │
│ [Outsourcing Agrmt... §4.2] [Policy §7.1] [Doc B]   │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
                  Tap citation
                         │
                         ▼
               ┌──────────────────┐
               │ Detail bottom    │
               │ sheet            │
               │                  │
               │ Semantic text    │
               │ Match metrics    │
               │ Classification   │
               └──────────────────┘
```

Citation details may include:

-   document identifier/abbreviation;
-   section;
-   semantic chunk;
-   match metrics;
-   tenant classification metadata.

The exact fields must follow the canonical API contract.

------------------------------------------------------------------------

## 4.5 Component M3 --- `MobileIngestSheet`

### Objective

Support ad-hoc document ingestion from a mobile device.

### Processing view

``` text
Document selected
       │
       ▼
Upload
       │
       ▼
Extraction Plane
       │
       ▼
Semantic Chunking
       │
       ▼
Synquest Indexing
       │
       ▼
Available for search
```

The component should expose pipeline progress when the backend provides
corresponding lifecycle events.

------------------------------------------------------------------------

# 5. Cross-Platform Contract Architecture

The web and mobile applications must share a contract-driven integration
model.

## 5.1 Canonical API Contracts

All network models should derive from canonical `.proto` definitions
maintained by Synanton backend repositories.

Potential contract families include:

-   `synapt.v1`;
-   `synanton.gpu.v1`;
-   extraction-related contracts.

The UI repository should consume canonical schemas rather than
maintaining independently authored request/response models.

## 5.2 Generated Client Artifacts

``` text
                  Canonical .proto
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       TypeScript generation    Dart generation
              │                     │
              ▼                     ▼
          Web client            Flutter client
```

Build/CI pipelines should regenerate client bindings and fail on
incompatible contract changes.

The exact generation tooling is intentionally left open until the
current Synanton repository and protobuf ownership model are validated.

------------------------------------------------------------------------

# 6. Unified RAG Data Flow

``` text
[ User Query Input ]
         │
         ▼
[ Client Ingress Call ]
         │
         ▼
[ synapt.v1.QueryRequest ]
         │
         ▼
[ Streaming Response ]
         │
         ├──► Text Tokens
         │       │
         │       ▼
         │   Chat View State
         │
         └──► Citations
                 │
                 ▼
          Provenance Registry
                 │
        ┌────────┴─────────┐
        ▼                  ▼
      Web                Mobile
        │                  │
        ▼                  ▼
 Focus PDF / section   Detail bottom sheet
```

The key design requirement is that citation events remain first-class
data rather than being reconstructed by the clients from generated text.

------------------------------------------------------------------------

# 7. Security and Multi-Tenancy

The client participates in authentication but is not the security
boundary.

Authorization remains enforced by the Synanton backend.

The UI should expose relevant authorization context without making
security decisions locally.

### Planned areas

-   JWT-based client sessions;
-   tenant identity;
-   classification metadata;
-   provenance-aware access;
-   session lifecycle;
-   unauthorized/expired-session handling.

The proposal references `alice` / `bob` profiles as development/test
identities. These should be treated as test fixtures, not production
identity semantics.

------------------------------------------------------------------------

# 8. Development Phases

## Phase 1 --- Contract Validation

**Weeks 1--2**

### Web

-   scaffold Next.js application;
-   establish project conventions;
-   validate `synapt` API access;
-   configure protobuf/gRPC-Web generation;
-   establish authentication/session integration boundary.

### Mobile

-   scaffold Flutter application;
-   establish Dart architecture;
-   compile protobuf contracts;
-   validate native gRPC connectivity.

### Exit criteria

A minimal request/response and streaming round trip works against a real
or representative `synapt` endpoint.

------------------------------------------------------------------------

## Phase 2 --- Core RAG

**Weeks 3--5**

### Web

-   implement `HybridSearchWorkspace`;
-   integrate search result contracts;
-   display retrieval metrics;
-   integrate streaming response bindings where required.

### Mobile

-   implement `StreamingChatInterface`;
-   implement `CitationBadgeCarousel`;
-   establish stream lifecycle/error handling.

### Exit criteria

A user can execute a query, observe streamed output, and inspect
returned citations on both clients.

------------------------------------------------------------------------

## Phase 3 --- Deep Exploration

**Weeks 6--8**

### Web

-   implement `InteractiveDocumentViewer`;
-   implement PDF coordinate navigation;
-   implement `RelixGraphExplorer`;
-   connect semantic/provenance navigation.

### Mobile

-   implement `MobileIngestSheet`;
-   integrate upload and extraction status;
-   add file validation.

### Exit criteria

Users can navigate from generated knowledge to its underlying source
material and graph context where the backend contracts provide the
necessary provenance.

------------------------------------------------------------------------

## Phase 4 --- Security and Polish

**Weeks 9--10**

-   JWT/session integration;
-   multi-tenant flows;
-   authorization-state UX;
-   error and empty-state handling;
-   performance profiling;
-   stress testing with representative PDF corpora such as OHR-Bench;
-   rendering and streaming optimization.

------------------------------------------------------------------------

# 9. Proposed Repository Structure

``` text
synanton/ui
├── web/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
│
├── mobile/
│   ├── lib/
│   ├── test/
│   └── ...
│
├── proto/
│   └── generated/
│
├── docs/
│   ├── architecture.md
│   ├── api-contracts.md
│   └── development.md
│
└── README.md
```

A critical implementation decision is whether `proto/` should contain
generated artifacts or only generation configuration. Canonical `.proto`
ownership should remain with the appropriate Synanton backend repository
unless there is an explicit reason to centralize it.

------------------------------------------------------------------------

# 10. Engineering Concerns to Resolve Before Implementation

The following questions should be treated as architecture decisions
rather than implementation details.

## 10.1 API Boundary

-   Which functionality is exposed through `synapt`?
-   Which operations are REST?
-   Which operations are native gRPC?
-   Which streams must be browser-compatible?
-   Is gRPC-Web sufficient for the complete web use case?

## 10.2 Protobuf Ownership

-   Where are canonical `.proto` definitions maintained?
-   How are breaking changes versioned?
-   Are generated TypeScript/Dart clients committed or generated during
    CI?
-   How are compatible and incompatible contract changes detected?

## 10.3 Authentication

-   Where does browser authentication terminate?
-   How are JWTs acquired and refreshed?
-   Can mobile use the same session/token model?
-   Which claims are required by UI components?
-   How is tenant context propagated?

## 10.4 Streaming Semantics

The UI needs a stable event model for:

-   text tokens;
-   citations;
-   metadata;
-   progress events;
-   completion;
-   cancellation;
-   errors.

The client should not infer event semantics from arbitrary text
payloads.

## 10.5 Citation Contract

A citation should ideally contain enough information to support both
clients:

``` text
Citation
├── source/document identity
├── semantic chunk identity
├── section information
├── source coordinates (when applicable)
├── match/retrieval metrics
└── authorization/classification metadata
```

The exact schema must come from the canonical Synanton API contract.

## 10.6 PDF Coordinate Model

The web viewer depends on stable source-coordinate semantics.

The contract needs to establish:

-   page numbering convention;
-   coordinate origin;
-   units;
-   page rotation handling;
-   bounding-box representation;
-   relationship between extracted chunk and source coordinates.

Without this, accurate citation-to-PDF navigation cannot be guaranteed.

## 10.7 Graph Visualization Contract

The graph API should distinguish, where applicable:

-   persisted ontology entities;
-   persisted relations;
-   inferred relations;
-   retrieval-time traversal paths;
-   GraphRAG context.

This distinction prevents the visualization from presenting retrieval
artifacts as permanent knowledge-graph facts.

------------------------------------------------------------------------

# 11. Non-Goals

The UI project should not become a second implementation of the Synanton
backend.

Specifically, the clients should not own:

-   search ranking algorithms;
-   vector retrieval;
-   GraphRAG reasoning;
-   ontology inference;
-   document extraction;
-   authorization decisions;
-   LLM orchestration;
-   persistence of canonical knowledge state.

The UI is responsible for presentation, interaction, client-side state
management, and observability of backend-derived state.

------------------------------------------------------------------------

# 12. Success Criteria

The initial implementation should demonstrate the following end-to-end
capabilities:

### Web

1.  Execute a hybrid search.
2.  Compare retrieval results and metrics.
3.  Inspect a source document.
4.  Navigate from a result/citation to extracted content.
5.  Visualize a graph retrieval context.

### Mobile

1.  Submit a conversational query.
2.  Receive streamed generated text.
3.  Observe citations as they arrive.
4.  Open citation details.
5.  Initiate document ingestion.

### Platform-wide

1.  Web and mobile consume the same canonical contracts.
2.  Streaming behavior is consistent across clients.
3.  Authorization is enforced by the backend.
4.  Provenance remains attached to generated knowledge.
5.  Client implementations do not duplicate backend business logic.

------------------------------------------------------------------------

# 13. Open Decisions

Before implementation begins, the following decisions should be made:

1.  **Web API transport:** REST, gRPC-Web, or a combination.
2.  **Mobile state management:** BLoC vs. Riverpod.
3.  **Graph library:** React Flow vs. Vis.js.
4.  **Protobuf generation:** repository ownership and CI workflow.
5.  **Authentication:** browser/mobile token acquisition and refresh
    model.
6.  **Streaming event schema:** exact `ExecuteStream` event types.
7.  **Citation schema:** minimum cross-client provenance payload.
8.  **PDF coordinate contract:** coordinate system and page semantics.
9.  **Initial MVP:** determine which components are required for the
    first demonstrable release.

------------------------------------------------------------------------

# 14. Recommended MVP Boundary

A practical first vertical slice is:

``` text
                  ┌─────────────────────────┐
                  │       synapt            │
                  └────────────┬────────────┘
                               │
                    Query + stream + citations
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
       ┌─────────────────┐          ┌─────────────────┐
       │ Web Search      │          │ Mobile Chat     │
       │ Workspace       │          │ Interface       │
       └────────┬────────┘          └────────┬────────┘
                │                            │
                ▼                            ▼
       Search result view             Streaming answer
                │                            │
                └──────────┬─────────────────┘
                           ▼
                    Citation model
                           │
                           ▼
                 Source/provenance data
```

This slice validates the most important architectural assumptions before
investing in the PDF canvas, graph visualization, and mobile ingestion
workflows.

------------------------------------------------------------------------

# 15. Conclusion

Synanton UI should be implemented as a contract-driven multi-client
presentation layer rather than as a generic frontend around an AI API.

The Web client provides the depth required for enterprise search
evaluation, document exploration, graph analysis, and administration.
The Mobile client provides a compact conversational interface for rapid
knowledge discovery.

The common foundation is the `synapt` API and canonical protobuf
contracts, with provenance and authorization treated as first-class data
throughout the UI lifecycle.

The first implementation milestone should therefore validate the
**contract → streaming RAG → citation → source navigation** path before
expanding into the complete administrative and graph-oriented workspace.
