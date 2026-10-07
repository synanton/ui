# Synanton Knowledge Platform Client UI

**System Architecture & Multi-Client Knowledge Workbench Specification**

|                           |                                                              |
| ------------------------- | ------------------------------------------------------------ |
| **Status**                | Design Proposal — v2.1                                       |
| **Project**               | Synanton UI                                                  |
| **Scope**                 | Web Knowledge Workbench + Mobile Knowledge Assistant         |
| **Primary API boundary**  | Synanton Platform API (`synapt`)                             |
| **Architecture position** | Client presentation and interaction layer over authoritative Platform capabilities |

------

## 1. Executive Summary

This proposal defines the client architecture, component model, interaction model, cross-platform contracts, implementation roadmap, and engineering standards for the Synanton Knowledge Platform user interfaces.

Synanton UI is not a generic AI chat frontend. It is the **Knowledge Workbench** for Synanton Platform: a unified environment for asking questions, searching enterprise knowledge, inspecting evidence, navigating source documents and versions, exploring entities and graph relationships, reviewing derived knowledge, monitoring long-running platform operations, evaluating retrieval and AI execution, and administering knowledge-oriented workflows.

The **Web application** is the primary Knowledge Workbench. It provides dense, capability-aware interfaces for knowledge exploration, investigation, review, engineering, operations, analytics, and AI evaluation.

The **Mobile application** is a lighter Knowledge Assistant optimized for conversational discovery, evidence inspection, field workflows, ingestion, notifications, and executive use.

Both clients are thin presentation layers over the Synanton Platform API (`synapt`).

The central architectural principle is:

> **Canonical knowledge is authoritative platform state; UI surfaces are views and interactions over that state.**

The UI must not reimplement search, graph reasoning, ontology inference, document extraction, authorization, AI orchestration, or canonical persistence. It visualizes and interacts with authoritative capabilities exposed by the Platform API.

The core differentiated workflow is:

text

```
KnowledgeContext
      │
      ├── Ask
      ├── Search
      ├── Evidence
      ├── Document
      └── Source Version
```



The initial implementation must prove that an AI answer can be traced through structured citations to authoritative enterprise evidence within a secure, provenance-aware KnowledgeContext. The same citation contract must work on Web and Mobile.

------

## 2. Product Vision

### 2.1 Knowledge Workbench

Synanton UI provides a single coherent environment in which users can move between different representations of the same knowledge without losing:

- security context;
- temporal context;
- provenance;
- source identity;
- evidence relationships;
- operation state;
- investigation context.

Chat, search, documents, graph, timeline, evidence, review, operations, analytics, and AI evaluation are therefore **views over a common knowledge model**, not unrelated applications.

### 2.2 Knowledge-first information architecture

The primary object of the Web application is not a conversation.

The primary object is a **KnowledgeContext** containing the user's current:

- tenant and authorization context;
- temporal context;
- search/query context;
- selected sources;
- selected entities;
- evidence;
- documents;
- investigations;
- processing operations;
- AI execution context.

Chat is one interaction mode within that context.

### 2.3 Product statement

> Synanton UI is the Knowledge Workbench for Synanton Platform: a secure, provenance-aware, temporally consistent interface for exploring, querying, reviewing, operating, and evaluating enterprise knowledge.

### 2.4 Representative user journey

A user opens the Workbench inside the tenant *Acme*, in the saved investigation *European Pricing Investigation*, with temporal context set to *Valid on 2026-03-15*. They ask:

> "What changed in the European pricing policy in 2026?"

The client streams a structured answer. Claims arrive with structured citations. The user clicks a citation; the Evidence Explorer opens with the citation chain already resolved. One citation resolves fully, one resolves at document level but not to a chunk. The UI marks each accordingly. From the resolved citation, the user opens the source document, navigates to the correct page, selects the semantic chunk, then moves to the source version. A version-series selector shows three versions; the user compares the current version with the prior one. Throughout, the tenant, temporal context, investigation, and provenance chain are preserved. The user returns to Ask with the same context and asks a follow-up.

This is the differentiated workflow. Everything else in this proposal supports it.

------

## 3. Architectural Principles

The following principles are normative for the UI architecture.

### 3.1 Platform API boundary

All authoritative application data comes through the Synanton Platform API (`synapt`).

Clients must not call:

- internal storage;
- brokers;
- workflow engines;
- search backends;
- graph databases;
- GPU runtimes;
- internal service endpoints

directly.

The Platform API is the stable external contract. Internal platform topology is not a UI contract.

### 3.2 Canonical terminology

The canonical term is **Platform API (`synapt`)**. This document uses "Platform API" when referring to the application boundary and "`synapt`" when referring specifically to its implementation/API namespace.

### 3.3 Canonical knowledge is authoritative; derived state is observable

Canonical knowledge — sources, source versions, and platform-acknowledged knowledge state — is authoritative.

Search projections, graph retrieval paths, analytics, generated answers, and other derived representations must remain distinguishable from authoritative state.

The UI must preserve provenance supplied by the platform and must not present derived state as if it were canonical.

### 3.4 Security is authoritative

The UI participates in authentication and renders authorization state, but it is not the security boundary.

Authorization is enforced by the Platform. Ambiguous security state must **fail closed**.

### 3.5 Temporal semantics are shared

Temporal context must be consistent across:

- search;
- documents;
- evidence;
- graph;
- timelines;
- generated answers;
- citations;
- investigations.

Historical queries must never silently fall back to current content.

### 3.6 Structured contracts over text inference

The UI must consume structured API events. It must not infer:

- citations from generated text;
- operation completion from progress text;
- authorization from labels;
- graph facts from visual layout;
- temporal state from timestamps embedded in prose.

### 3.7 Resource state and Operation state remain distinct

Long-running operations must expose durable Operation state through the Platform API.

The UI must not equate a resource's current state with the lifecycle of the operation that produced it.

### 3.8 No hidden backend implementation

The UI is responsible for:

- presentation;
- interaction;
- client-side state;
- navigation;
- local caching where appropriate;
- accessibility;
- observability;
- client error handling.

The UI is not responsible for backend business rules.

------

## 4. KnowledgeContext

`KnowledgeContext` is the principal cross-view UI object. It represents the state in which a user is currently exploring or operating on knowledge.

### 4.1 Conceptual model

text

```
KnowledgeContext
├── TenantContext
├── AuthorizationContext
├── TemporalContext
├── QueryContext
├── InvestigationContext
├── SourceContext
├── EntityContext
├── EvidenceContext
├── OperationContext
└── AIExecutionContext
```



Not every context must be populated for every workflow.

### 4.2 Minimum viable context

For any knowledge-aware view to render safely, the following sub-contexts are **required**:

- `TenantContext`
- `AuthorizationContext`
- `TemporalContext`

Without these three, the UI must refuse to render knowledge-aware content and must present a context-incomplete state.

### 4.3 TenantContext

Contains the validated tenant scope and the UI-visible tenant identity.

Tenant context must originate from authoritative Platform API state.

### 4.4 AuthorizationContext

Represents authoritative **capabilities** and visibility constraints returned by the platform.

The UI may use capability information to shape navigation and controls, but it must never treat client-side capability state as an authorization decision.

### 4.5 TemporalContext

Defines the user's temporal perspective. Examples include:

- current eligible knowledge;
- as-of timestamp;
- source version;
- validity interval;
- observation time;
- publication time.

The UI must preserve distinctions between temporal concepts rather than reducing them to one timestamp.

### 4.6 QueryContext

Contains:

- query text;
- search mode;
- filters;
- ranking configuration exposed by the API;
- temporal constraints;
- selected retrieval context.

### 4.7 InvestigationContext

Represents a longer-lived user workflow spanning multiple views. An investigation may contain:

- questions;
- search results;
- evidence;
- entities;
- documents;
- source versions;
- notes;
- temporal context;
- generated outputs.

### 4.8 Context continuity

Navigation between Workbench surfaces must preserve relevant `KnowledgeContext`.

text

```
Ask
 │
 └── citation
       │
       ▼
Evidence
       │
       └── source
             │
             ▼
Document
             │
             └── version
                   │
                   ▼
             Timeline / Graph
```



A view must not silently discard the security or temporal semantics of the context from which it was opened.

------

## 5. Knowledge Workbench Shell

The Web application is organized around a persistent Workbench shell.

### 5.1 Shell responsibilities

The shell provides:

- tenant identity;
- user identity;
- capability-aware navigation;
- current `KnowledgeContext`;
- global search/query entry;
- temporal context indicator;
- notifications;
- operation status;
- workspace switching;
- accessibility controls.

### 5.2 Capability model

A **capability** is a server-provided, authoritative statement that the authenticated principal may perform a class of actions.

Capabilities:

- originate from the Platform API on authentication and may be refreshed;
- shape which Workbench surfaces are visible and actionable;
- do **not** constitute authorization decisions;
- must be re-validated by the platform on every protected operation.

The client must render capability-driven navigation, not role-driven navigation. Example capability classes include:

- knowledge consumer;
- analyst;
- reviewer;
- knowledge engineer;
- administrator;
- operations engineer;
- AI evaluator.

### 5.3 Capability discovery

Capabilities must be discoverable before the shell renders. The mechanism is an Open Decision (Section 27), but the contract requires that:

- the authenticated principal is associated with a capability set;
- the capability set is available to the client before or alongside the first protected render;
- capability changes propagate to the client through an authoritative channel;
- the client must not synthesize capabilities from incomplete data.

Until capability discovery is resolved, the shell must render a minimal, capability-neutral state and must not assume access to any surface.

### 5.4 Workbench layout

A representative desktop layout:

text

```
┌──────────────────────────────────────────────────────────────────────┐
│ Tenant │ Context │ Search / Ask │ Temporal │ Notifications │ Ops     │
├────────┬─────────────────────────────────────────────────────────────┤
│        │                                                             │
│ Nav    │                   Active Workspace                          │
│        │                                                             │
│ Ask    │                                                             │
│ Search │                                                             │
│ Docs   │                                                             │
│ Graph  │                                                             │
│ Time   │                                                             │
│ Evid.  │                                                             │
│ Review │                                                             │
│ Studio │                                                             │
│ Ops    │                                                             │
│ AI     │                                                             │
│ Admin  │                                                             │
│        │                                                             │
└────────┴─────────────────────────────────────────────────────────────┘
```



### 5.5 Workbench state

Server state and client interaction state must remain distinct. Provisional Web state model:

- TanStack Query for server state;
- Zustand for client interaction/workbench state;
- URL/search parameters for navigable state;
- dedicated streaming controller/state for long-running AI streams.

These choices are provisional until validated by implementation spikes.

------

## 6. Workbench Surface Model

The Workbench target architecture contains thirteen named Web components.

### 6.1 W1–W13 mapping

| ID   | Component                 | Section |
| ---- | ------------------------- | ------- |
| W1   | KnowledgeWorkbench        | 6.3     |
| W2   | AskWorkspace              | 6.4     |
| W3   | HybridSearchWorkspace     | 6.5     |
| W4   | InteractiveDocumentViewer | 6.6     |
| W5   | RelixGraphExplorer        | 6.7     |
| W6   | TemporalKnowledgeExplorer | 6.8     |
| W7   | EvidenceExplorer          | 6.9     |
| W8   | KnowledgeReviewWorkspace  | 6.10    |
| W9   | KnowledgeStudio           | 6.11    |
| W10  | OntologyStudio            | 6.12    |
| W11  | OperationsConsole         | 6.13    |
| W12  | KnowledgeAnalytics        | 6.14    |
| W13  | AIStudio                  | 6.15    |

W1 is the shell/container rather than an independent business capability.

### 6.2 Surface composition

The thirteen surfaces are not thirteen separate products. They share:

- `KnowledgeContext`;
- Platform API contracts;
- evidence/provenance components;
- temporal components;
- authorization state;
- design system;
- notification infrastructure;
- operation state;
- observability.

### 6.3 W1 — KnowledgeWorkbench

**Objective:** Provide the primary enterprise knowledge workspace.

Responsibilities:

- host workspace navigation;
- manage shared context;
- coordinate cross-view navigation;
- expose global Ask/Search;
- display temporal context;
- expose active operations and notifications;
- provide capability-aware controls.

The Workbench must make transitions between views feel like navigation through one knowledge environment rather than separate applications.

### 6.4 W2 — AskWorkspace

**Objective:** Provide conversational and structured knowledge inquiry.

Capabilities:

- natural-language query;
- structured query context;
- streaming answer rendering;
- citation events;
- evidence inspection;
- query history;
- temporal context;
- investigation attachment;
- cancellation;
- retry;
- degraded-state presentation.

The answer renderer must consume structured stream events.

Conceptual stream:

text

```
ExecuteStream
    │
    ├── metadata
    ├── progress
    ├── text
    ├── citation
    ├── evidence
    ├── operation update
    ├── completion
    └── error
```



The client must not reconstruct citations from answer text.

### 6.5 W3 — HybridSearchWorkspace

**Objective:** Provide end-user and engineering-grade search exploration.

Capabilities may include:

- lexical retrieval;
- dense retrieval;
- hybrid retrieval;
- unified ranking;
- filters;
- temporal constraints;
- classification-aware results;
- result comparison;
- ranking metrics where exposed;
- query diagnostics where authorized;
- result-to-evidence navigation.

Engineering-oriented retrieval metrics should be progressively disclosed rather than forced into every consumer workflow.

### 6.6 W4 — InteractiveDocumentViewer

**Objective:** Display authoritative source content and extracted representations.

Capabilities:

- document rendering;
- PDF rendering;
- page navigation;
- source-coordinate overlays;
- bounding boxes;
- semantic chunk selection;
- section hierarchy;
- classification metadata;
- provenance navigation;
- source-version navigation;
- citation-to-source navigation.

A citation can navigate to a page or coordinate only when the underlying API contract provides sufficient source-coordinate information. The UI must not invent coordinates.

### 6.7 W5 — RelixGraphExplorer

**Objective:** Explore authoritative graph structures and retrieval context.

Capabilities:

- entity visualization;
- relation visualization;
- one-hop traversal;
- k-hop traversal;
- path exploration;
- GraphRAG context;
- semantic definition panels;
- source/evidence navigation.

The UI must distinguish, where the Platform API provides the distinction:

- persisted ontology entities;
- persisted relationships;
- inferred relationships;
- retrieval-time traversal;
- GraphRAG context.

Retrieval artifacts must not be rendered as permanent knowledge facts.

**Accessible alternative:** every graph interaction must have a non-visual representation such as table, list, or entity/relation inspector. The graph is an optional visualization, not the only access path.

### 6.8 W6 — TemporalKnowledgeExplorer

**Objective:** Make temporal knowledge semantics visible and navigable.

Capabilities:

- point-in-time queries;
- source version selection;
- version-series navigation;
- publication/observation/validity display;
- current eligibility;
- conflicting validity visualization;
- historical comparison;
- temporal query diagnostics.

The UI must preserve the Platform's distinction between publication time, observation time, and validity time.

Historical state must not silently fall back to current content.

**Accessible alternative:** timeline information must have a linear, screen-reader-compatible representation.

### 6.9 W7 — EvidenceExplorer

**Objective:** Provide a unified interface for inspecting evidence supporting a knowledge result.

text

```
Answer
  │
  ├── Citation
  │     └── Evidence
  │           ├── Source
  │           ├── Source Version
  │           ├── Document
  │           ├── Chunk
  │           └── Provenance
  │
  └── Related Evidence
```



Capabilities:

- evidence list;
- evidence detail;
- citation context;
- source navigation;
- provenance chain;
- temporal context;
- authorization/classification state;
- retrieval metrics when authorized;
- unresolved evidence state;
- partially resolved evidence state.

**Invariant:** The UI must never synthesize provenance that the backend did not provide. If a citation cannot be resolved, the UI must show the degraded state rather than reconstructing a plausible chain.

### 6.10 W8 — KnowledgeReviewWorkspace

**Objective:** Support human review of platform-derived knowledge.

Potential workflows:

- review derived knowledge;
- inspect source/evidence;
- compare versions;
- inspect processing runs;
- accept/reject/review where platform contracts expose such actions;
- identify conflicts;
- inspect provenance;
- record review outcomes.

Review decisions must be represented by authoritative Platform operations/resources rather than client-only state.

### 6.11 W9 — KnowledgeStudio

**Objective:** Provide knowledge engineering and derived-state inspection workflows.

Capabilities may include:

- knowledge item inspection;
- annotations;
- derived knowledge;
- dependency exploration;
- processing-run inspection;
- recalculation status;
- provenance;
- impact analysis;
- knowledge state comparison.

The UI visualizes platform behavior; it does not execute hidden recalculation logic.

### 6.12 W10 — OntologyStudio

**Objective:** Provide ontology and semantic-model exploration and administration.

Capabilities depend on Platform API support and authorization:

- ontology entity browsing;
- relation browsing;
- semantic definitions;
- relationship inspection;
- ontology change workflows;
- source/evidence links;
- graph preview.

Ontology inference remains a platform capability.

### 6.13 W11 — OperationsConsole

**Objective:** Expose long-running and asynchronous Platform operations.

Operations may include:

- ingestion;
- recalculation;
- synchronization;
- indexing;
- processing;
- AI execution;
- administrative workflows.

The console must clearly distinguish:

text

```
Resource state
     ≠
Operation state
     ≠
Processing Run
```



Capabilities:

- operation list;
- operation detail;
- progress;
- lifecycle state;
- errors;
- partial success;
- no-op outcomes;
- retries/cancellation where authorized;
- related resources;
- processing-run references.

The UI must not infer completion from polling heuristics when authoritative Operation state is available.

### 6.14 W12 — KnowledgeAnalytics

**Objective:** Visualize derived knowledge and platform observations.

Potential areas:

- search performance;
- retrieval quality;
- knowledge coverage;
- processing metrics;
- operation throughput;
- source health;
- evidence usage;
- temporal changes;
- tenant-level analytics where authorized.

Analytics are derived observations, not canonical knowledge.

### 6.15 W13 — AIStudio

**Objective:** Evaluate and inspect AI execution through authoritative Platform contracts.

Potential capabilities:

- model/version selection where exposed;
- execution inspection;
- prompt/template references where permitted;
- retrieval context;
- citation delivery;
- model/artifact provenance;
- latency;
- token metrics;
- evaluation workflows;
- failure analysis.

AI Studio must not become a second AI runtime.

------

## 7. Mobile Knowledge Assistant

The Mobile client remains intentionally narrower than the Web Workbench.

### 7.1 Role

Mobile is optimized for:

- rapid knowledge discovery;
- conversational interaction;
- evidence inspection;
- field workflows;
- document capture/ingestion;
- notifications;
- executive workflows.

### 7.2 Core mobile surfaces

Target components:

- StreamingChatInterface;
- CitationBadgeCarousel;
- MobileEvidenceView;
- MobileInvestigationView;
- MobileIngestSheet;
- OperationStatusView;
- notification/deep-link handling.

### 7.3 Mobile state architecture

Provisional choices:

- Riverpod for application/server state;
- dedicated stream controller for streaming operations;
- Drift for offline drafts and explicitly supported local persistence.

Offline persistence must never be interpreted as authoritative canonical knowledge storage.

### 7.4 Mobile streaming

The mobile client must consume the same structured stream event semantics as Web. It may render them differently, but must not define different semantic meanings.

------

## 8. Cross-Platform Contract Architecture

### 8.1 Canonical Platform API contracts

All authoritative application data must derive from canonical Platform API contracts.

The UI repository must not maintain independently authored competing versions of request/response semantics.

### 8.2 Generated models

Where protobuf is the canonical contract:

text

```
Canonical .proto
       │
       ├───────────────┐
       ▼               ▼
TypeScript          Dart
generated models    generated models
       │               │
       ▼               ▼
Web client          Mobile client
```



Generated client bindings should be reproducible in CI.

### 8.3 Compatibility

CI should detect:

- breaking schema changes;
- incompatible field changes;
- missing generated artifacts;
- generated-code drift;
- unsupported API versions.

The exact tooling remains an implementation decision.

------

## 9. Unified Knowledge Data Flow

text

```
External Sources
      │
      ▼
Platform Ingestion
      │
      ▼
Canonical Knowledge ──────────────┐
      │                           │
      ├──► Derived Search State   │
      ├──► Derived Graph State    │
      ├──► Analytics              │ observable
      ├──► AI Execution           │ through
      └──► Processing/Operations  │ Evidence
                                  │ and
                                  │ Provenance
                                  ▼
                            Platform API
                                  │
                                  ▼
                          KnowledgeContext
                                  │
             ┌────────────────────┼────────────────────┐
             ▼                    ▼                    ▼
            Ask                 Search              Documents
             │                    │                    │
             └──────────┬─────────┴─────────┬──────────┘
                        ▼                   ▼
                     Evidence             Graph
                        │
                        ▼
                    Provenance
```



All views consume the same `KnowledgeContext` and the same temporal and security semantics. The UI must not create a parallel knowledge lifecycle.

------

## 10. Security and Multi-Tenancy

### 10.1 Security boundary

The Platform is the security boundary. The client may:

- authenticate;
- display tenant identity;
- display capabilities;
- hide unavailable navigation;
- render classification state;
- react to authorization errors.

The client may not:

- decide authorization;
- weaken tenant scope;
- infer access from UI state;
- expose data because a route is directly navigated to.

### 10.2 Fail closed

Ambiguous security state must fail closed. The UI must not render unauthorized:

- metadata;
- counts;
- facets;
- graph relationships;
- search results;
- evidence;
- document content;
- operation details.

### 10.3 Authentication versus authorization

Authentication does not imply authorization. Classification does not imply authorization. The UI must preserve the Platform's distinction.

### 10.4 No-results versus unauthorized

The UI must not reveal whether an empty result is caused by absence of data or by ineligibility under the current authorization context.

- An empty search, empty evidence set, empty graph context, or empty document set must present a uniform "no results" state.
- The client must not attempt to infer which cause applies.
- Counts, facets, and suggestions must not vary in a way that leaks eligibility.
- The uniform state must apply across Web and Mobile.

This is both a privacy property and a UX consistency property.

### 10.5 Multi-tenancy

Tenant context must be explicit and validated. Cross-tenant state must not be retained in shared client caches without an explicit isolation strategy. Client-side cache keys must include security-relevant context where necessary.

### 10.6 Security-sensitive cache behavior

When authorization context changes:

- stale data must be invalidated;
- protected views must revalidate;
- tenant switches must isolate caches;
- previously visible data must not leak into the new context.

### 10.7 Mid-stream authorization changes

If authorization changes while a stream is in progress (for example, role revocation, tenant suspension, or access expiry):

- the client must cancel the stream;
- the cancellation must be distinguishable from user cancel, timeout, and network failure;
- the partial answer must not be persisted as evidence or investigation content;
- the UI must present an explicit authorization-changed state and offer re-authentication or re-evaluation;
- any cached evidence associated with the cancelled stream must be invalidated.

The client may not continue rendering stream output after an authoritative authorization change notification.

------

## 11. Temporal Architecture

Temporal behavior is cross-cutting infrastructure.

### 11.1 Temporal invariants

The UI must respect Platform temporal semantics:

- source versions are immutable;
- publication, observation, and validity times remain distinct;
- current may contain multiple eligible versions;
- conflicts are retained and surfaced;
- temporal filtering precedes ranking where applicable;
- historical queries never silently fall back to current content.

### 11.2 TemporalContext UI

The active temporal context should be visible in the Workbench shell.

text

```
Knowledge Context
────────────────────────────────────
Tenant:          Acme
Time:            As of 2026-09-30
Source Version:  v17
Status:          Historical
```



### 11.3 Temporal navigation

Views opened from a historical context should retain that context unless the user explicitly changes it.

### 11.4 Temporal failures

If a requested historical state is missing or deleted, the UI must show an explicit unavailable/degraded state. It must not display current content as a substitute.

### 11.5 Empty temporal state

If a user selects a temporal point where no version exists at all — as distinct from "no sources" or "no evidence" — the UI must present a **temporal empty state** that explains the temporal model and offers adjacent valid points, rather than implying that knowledge is absent from the platform.

------

## 12. Provenance Architecture

Provenance is first-class UI data.

### 12.1 Provenance model

text

```
Generated Answer
      │
      ▼
Citation
      │
      ▼
Evidence
      │
      ▼
Derived Knowledge / Processing Run
      │
      ▼
Canonical Knowledge
      │
      ▼
Source Version
      │
      ▼
Source
```



The exact model is determined by the Platform API.

### 12.2 No synthesized provenance

The UI must never synthesize provenance that the backend did not provide.

If provenance is incomplete:

- identify the missing relationship;
- show a degraded state;
- do not invent a source chain.

### 12.3 Citation contract

A citation should provide enough structured information to support:

- source/document identity;
- source version where applicable;
- semantic chunk identity;
- section information;
- coordinates where applicable;
- retrieval/match metrics where authorized;
- classification/security metadata where applicable;
- provenance references.

### 12.4 Partial citation resolution

Citations may be resolved at different levels of granularity. The following are all valid states:

- fully resolved (document, source version, chunk, coordinates);
- resolved to document but not to chunk;
- resolved to chunk but not to coordinates;
- resolved to source version but not to document;
- unresolved (metadata present, referenced object unavailable).

The UI must display which parts of the chain are resolved and which are not. The UI must not present a partially resolved citation as fully resolved, nor as fully unresolved.

### 12.5 Citation interaction

Citations must be first-class interactive objects.

Web may navigate to:

- document;
- page;
- coordinate;
- evidence;
- source version.

Mobile may navigate to:

- evidence sheet;
- document detail;
- source/version detail.

### 12.6 Unresolved citation

text

```
Citation unavailable

The platform returned citation metadata, but the referenced
evidence could not be resolved in the current authorization
or temporal context.

[Retry]  [View available evidence]
```



The client must not attempt reconstruction.

------

## 13. Client State Architecture

### 13.1 State categories

The UI distinguishes:

1. **Server state** — authoritative Platform resources and queries.
2. **Streaming state** — transient execution streams.
3. **Workbench state** — navigation and interaction.
4. **URL state** — shareable/navigable parameters.
5. **Local draft state** — explicitly supported local work.
6. **Presentation state** — transient UI concerns.

### 13.2 Local draft state

Local drafts are client-side working artifacts that have not been submitted to the platform. Examples:

- an investigation outline not yet saved;
- an unsent query;
- an annotation draft awaiting submission;
- a review decision pending confirmation;
- a mobile ingestion capture before upload.

Local drafts:

- are never treated as canonical knowledge;
- are namespaced by tenant and, where required, by authorization context;
- are cleared or isolated when tenant or authorization context changes;
- are submitted to the platform through authoritative operations, not promoted client-side.

### 13.3 KnowledgeContext lifecycle

`KnowledgeContext` is **ephemeral per session** unless explicitly saved as an Investigation.

| Event                     | Behavior                                                     |
| ------------------------- | ------------------------------------------------------------ |
| Session start             | Context initialised from authenticated principal (tenant, capabilities, default temporal context). |
| Navigation within session | Context preserved across Workbench surfaces.                 |
| User saves investigation  | Context persisted as an Investigation via authoritative operation. |
| Tenant switch             | Context reset. Caches isolated. In-flight streams cancelled. |
| Authorization change      | Affected caches invalidated. In-flight streams cancelled. Context retained for unaffected sub-contexts. |
| Session end               | Ephemeral context discarded. Saved investigations remain.    |

Saved investigations are platform resources, not client state.

### 13.4 Web

Provisional:

- Next.js App Router;
- TanStack Query for server state;
- Zustand for interaction/workbench state;
- URL state for shareable filters and temporal context;
- dedicated stream controller.

### 13.5 Mobile

Provisional:

- Flutter;
- Riverpod;
- dedicated stream controller;
- Drift for offline drafts where justified.

### 13.6 State isolation

Server state must not be copied into uncontrolled global client state without a reason. Security and tenant context must be included in cache invalidation semantics.

------

## 14. Error Handling and Degraded Mode

Error handling is part of the architecture, not polish.

### 14.1 Error classes

The UI distinguishes:

- authentication failure;
- authorization failure;
- tenant-context failure;
- validation error;
- unavailable resource;
- unresolved provenance;
- partially resolved provenance;
- temporal-state failure;
- operation failure;
- operation no-op;
- partial success;
- stream interruption;
- network failure;
- backend failure;
- unsupported capability;
- client rendering failure.

### 14.2 Fail closed

Security ambiguity must fail closed.

### 14.3 No hidden fallback

The UI must not silently replace:

- historical data with current data;
- unresolved evidence with approximate evidence;
- unauthorized data with partial cached data;
- failed operations with guessed state.

### 14.4 Stream interruption

Streaming interfaces must distinguish:

- normal completion;
- user cancellation;
- authorization-driven cancellation;
- transient disconnect;
- backend error;
- partial answer;
- citation delivery failure.

### 14.5 Partial success

Ingestion, recalculation, and other bulk operations may partially succeed.

- Partial success is a distinct outcome, not a degraded form of success or failure.
- The UI must identify which items succeeded and which did not.
- The UI must not collapse partial success into either success or failure.
- Partial success must be observable in the Operations Console and in notifications.

### 14.6 Operation no-op

A requested operation may result in no change (for example, recalculation when nothing is affected).

- No-op is a valid outcome.
- It must be represented distinctly from success and from failure.
- The UI must not present a no-op as an error.

### 14.7 Degraded state

Every major surface should define an explicit degraded state. A degraded state should explain:

- what failed;
- what remains trustworthy;
- what action is available;
- whether retry is safe;
- whether the underlying operation continues.

------

## 15. Accessibility and Internationalization

Accessibility is a core Workbench requirement.

### 15.1 Keyboard navigation

All primary Web workflows must be keyboard navigable. This includes navigation, search, Ask, citations, evidence, document navigation, dialogs, and operation controls.

### 15.2 Graph accessibility

`RelixGraphExplorer` must provide a table/list alternative.

### 15.3 Timeline accessibility

`TemporalKnowledgeExplorer` must provide a linear screen-reader-compatible representation.

### 15.4 Temporal announcements

Changes to `TemporalContext` must be announced appropriately to assistive technology.

### 15.5 Citation accessibility

Citation badges and citation references must be keyboard navigable and expose meaningful accessible names.

### 15.6 Streaming live-region semantics

Streaming content must use live-region semantics that inform without overwhelming:

| Event                              | ARIA live   | Notes                                        |
| ---------------------------------- | ----------- | -------------------------------------------- |
| Answer text delta                  | `polite`    | Coalesced into sentence-level announcements. |
| Citation arrival (user-actionable) | `polite`    | Announced once per citation, not per token.  |
| Citation resolution                | `polite`    | Announced as state change.                   |
| Operation state change             | `polite`    | Summary announcement, not per-event.         |
| Authorization change               | `assertive` | Immediate.                                   |
| Error requiring user action        | `assertive` | Immediate.                                   |

Raw token streams must never be announced verbatim.

### 15.7 Internationalization

The UI architecture must support:

- locale-aware formatting;
- time-zone-aware temporal display;
- translated interface strings;
- right-to-left layouts where required;
- locale-safe numbers and dates.

Canonical knowledge content must not be altered merely for UI localization.

------

## 16. Client-Side Observability

Observability must make client failures diagnosable without becoming a data-exfiltration channel.

### 16.1 Metrics

Track where applicable:

- API latency;
- API failure rates;
- time-to-first-stream-event;
- stream completion;
- stream interruption;
- authorization-driven cancellation;
- citation delivery;
- citation resolution (fully, partially, unresolved);
- search latency;
- document rendering latency;
- graph rendering latency;
- operation lifecycle;
- UI error rates;
- mobile startup time.

### 16.2 Correlation

Client operations should carry correlation identifiers supplied by the Platform where available. Long-running operations should be traceable to authoritative Operation/Processing Run identifiers.

### 16.3 Telemetry content restrictions

Telemetry must not include canonical knowledge content, user queries, citations, or document text unless explicitly permitted by tenant policy and user consent.

Prefer:

- identifiers;
- timings;
- event types;
- error codes;
- capability identifiers;
- operation IDs;
- trace IDs.

Identifiers included in telemetry must be limited to those required for correlation and must be documented in the telemetry schema. Identifiers that may constitute personal data under applicable regulation must be minimized, hashed where feasible, and subject to the same retention policy as the surrounding telemetry.

### 16.4 Privacy

Telemetry collection must respect:

- tenant policy;
- authorization;
- consent requirements;
- data minimization;
- retention policy.

------

## 17. Performance Budgets

Initial targets are engineering budgets, not guarantees. They must be validated with representative workloads.

| Interaction          | Target   | Maximum |
| -------------------- | -------- | ------- |
| First stream event   | < 500 ms | 2 s     |
| Citation render      | < 200 ms | 1 s     |
| Search result        | < 1 s    | 3 s     |
| Document page render | < 300 ms | 1 s     |
| Graph: 1k nodes      | < 1 s    | 3 s     |
| Graph: 10k nodes     | < 3 s    | 8 s     |
| Timeline render      | < 500 ms | 2 s     |
| Evidence view        | < 800 ms | 2 s     |
| Mobile cold start    | < 2 s    | 4 s     |

### 17.1 Performance principles

The client should prefer:

- incremental rendering;
- virtualization;
- pagination;
- progressive disclosure;
- bounded graph rendering;
- lazy document pages;
- server-side filtering;
- stable cache keys;
- cancellation of obsolete requests.

### 17.2 Large-graph strategy

Graph rendering at 10k+ nodes requires an explicit strategy. The current provisional approach is:

- WebGL-based rendering with level-of-detail culling;
- server-side subgraph queries with bounded node/edge budgets;
- hard client-side caps with progressive expansion on demand;
- non-visual (tabular) alternative always available.

The exact library and thresholds remain an Open Decision (Section 27).

------

## 18. Design System

The Workbench requires a shared design system.

### 18.1 Design tokens

Define shared tokens for typography, spacing, density, borders, elevation, radii, motion, semantic colors, and focus states.

### 18.2 Semantic state tokens

The design system must represent:

- success;
- warning;
- error;
- unavailable;
- loading;
- degraded;
- authorized;
- restricted;
- historical;
- current;
- conflicting;
- processing;
- completed;
- cancelled;
- unsaved / dirty;
- no-op.

### 18.3 Knowledge-specific patterns

Reusable components should include:

- citation;
- provenance chain;
- evidence card;
- temporal context;
- source version;
- operation status;
- classification state;
- confidence/metric presentation;
- degraded-state panel;
- partial-success panel;
- temporal-empty panel.

### 18.4 Platform-native implementations

Shared semantic tokens should support Web and Flutter implementations. The visual systems need not be pixel-identical.

------

## 19. Notifications

Notifications are a first-class cross-platform surface.

### 19.1 Notification categories

- ingestion completed;
- ingestion failed;
- ingestion partially succeeded;
- recalculation completed;
- review required;
- review outcome;
- operation failed;
- operation no-op;
- saved investigation changed;
- evidence changed;
- source version changed;
- authorization changed;
- platform event.

### 19.2 Notification semantics

Notifications should link to authoritative resources or operations. A notification is not the source of truth.

### 19.3 Persistence model

Notifications are persisted per user and per tenant.

- The Workbench shell exposes a notification center with history.
- Dismissal removes the notification from the active view but preserves history for a bounded retention window.
- Retention window is tenant-configurable.
- Notification history is subject to the same authorization and temporal semantics as the resources it references.

### 19.4 Deep links

Notification navigation must reconstruct or validate the required `KnowledgeContext` before rendering protected content. Deep links must not bypass authorization.

------

## 20. Onboarding and Empty States

### 20.1 Capability-aware onboarding

The first-run experience is adapted to the authenticated principal's capabilities. Capabilities not present are not shown.

### 20.2 KnowledgeContext onboarding

The initial walkthrough establishes:

1. tenant/context;
2. Ask/Search;
3. evidence;
4. source document;
5. provenance;
6. temporal context.

### 20.3 Representative investigation

A guided first investigation demonstrates the core differentiated workflow:

text

```
Question
   ↓
Search / Ask
   ↓
Answer
   ↓
Citation
   ↓
Evidence
   ↓
Document
   ↓
Source Version
```



### 20.4 Empty states

Empty states must be domain-aware:

- no evidence;
- no sources;
- no historical version (temporal empty state);
- no active operations;
- no accessible graph context;
- no investigations;
- no search results;
- no applicable capability.

They must not imply that the platform is broken when the user simply has no authorized or applicable data. Where the uniform no-results pattern from Section 10.4 applies, the empty state must not distinguish absence from ineligibility.

------

## 21. Testing Strategy

Testing must validate architectural invariants, not only visual correctness.

### 21.1 Contract tests

Validate:

- protobuf compatibility;
- generated client compatibility;
- required fields;
- stream event semantics;
- citation schema;
- temporal fields;
- Operation/resource distinction.

### 21.2 Web tests

Include component tests, state tests, API integration, streaming tests, E2E, accessibility, tenant isolation, temporal navigation, and provenance navigation.

### 21.3 Mobile tests

Include widget tests, stream lifecycle, poor-network behavior, offline draft behavior, upload flows, deep links, and accessibility.

### 21.4 Security tests

Explicitly test:

- tenant isolation;
- authorization failure;
- ambiguous authorization;
- no hidden fallback;
- historical access;
- revoked access;
- mid-stream authorization change;
- stale-cache invalidation;
- classification/authorization separation;
- uniform no-results behavior.

### 21.5 Fault injection

Fault injection must validate degraded-mode contracts from Section 14:

- malformed API responses;
- out-of-order stream events;
- citations referencing non-existent documents;
- operation state regressions (completion then running);
- clock skew between client and platform;
- partial-success payloads;
- no-op operation results;
- authorization change notifications arriving mid-stream.

### 21.6 Performance tests

Representative workloads must include large documents, large result sets, large graphs, long streams, high-frequency operation updates, historical queries, and mobile poor-network conditions.

------

## 22. Development Phases

The target architecture contains W1–W13, but implementation must remain vertically sliced.

### Phase 1 — Platform Contract Validation

Validate Platform API access, authentication boundary, capability discovery, protobuf generation, Web transport, Mobile gRPC, streaming event model, and citation contract.

**Exit criteria:**

- a real or representative Platform API endpoint supports request/response and streaming round trips using canonical contracts;
- capability discovery is available to the shell on first render;
- citation schema supports fully resolved and partially resolved states.

### Phase 2 — Knowledge Workbench MVP

Implement the contractual vertical slice:

text

```
KnowledgeContext
      ↓
     Ask
      ↓
    Search
      ↓
   Evidence
      ↓
  Document
      ↓
Source Version
```



Web and Mobile must share the same citation/evidence contract.

**Exit criteria:**

- an AI answer can be traced to authoritative evidence and a source version under the correct tenant and temporal context;
- partial citation resolution is rendered explicitly;
- mid-stream authorization change behaviour is defined and tested.

### Phase 3 — Deep Knowledge Exploration

Implement `InteractiveDocumentViewer`, `RelixGraphExplorer`, `TemporalKnowledgeExplorer`, and richer `EvidenceExplorer`.

### Phase 4 — Knowledge Engineering

Implement `KnowledgeReviewWorkspace`, `KnowledgeStudio`, and `OntologyStudio`.

### Phase 5 — Operations and AI

Implement `OperationsConsole`, `KnowledgeAnalytics`, and `AIStudio`.

### Phase 6a — Accessibility and Internationalization

Complete WCAG 2.2 AA compliance, keyboard navigation, screen-reader alternatives for graph and timeline, live-region semantics, and i18n including RTL.

### Phase 6b — Security and Multi-Tenancy Hardening

Complete tenant isolation validation, delegated administration UX, mid-stream authorization handling, uniform no-results behaviour, and security testing.

### Phase 6c — Performance, Observability, and Reliability

Complete performance budget validation, client telemetry, notification persistence, fault-injection coverage, and platform support matrix.

------

## 23. Repository Structure

text

```
synanton/ui
├── web/
│   ├── app/
│   │   ├── ask/
│   │   ├── search/
│   │   ├── investigations/
│   │   ├── documents/
│   │   ├── entities/
│   │   ├── graph/
│   │   ├── timeline/
│   │   ├── evidence/
│   │   ├── sources/
│   │   ├── ontology/
│   │   ├── review/
│   │   ├── operations/
│   │   ├── analytics/
│   │   └── admin/
│   ├── components/
│   │   ├── workbench/
│   │   ├── evidence/
│   │   ├── provenance/
│   │   ├── temporal/
│   │   ├── security/
│   │   ├── search/
│   │   ├── graph/
│   │   ├── documents/
│   │   └── operations/
│   ├── lib/
│   └── tests/
│
├── mobile/
│   ├── lib/
│   │   ├── ask/
│   │   ├── evidence/
│   │   ├── investigations/
│   │   └── ingest/
│   └── test/
│
├── contracts/
├── proto/
│   └── generated/
├── design-system/
├── e2e/
├── scripts/
├── docs/
└── .github/
    └── workflows/
```



Canonical `.proto` ownership should remain with the authoritative Platform repository unless explicitly centralized.

------

## 24. Engineering Decisions

The following are provisional engineering decisions intended to provide implementation direction. They remain subject to validation during implementation spikes.

| Area                     | Provisional decision                                         |
| ------------------------ | ------------------------------------------------------------ |
| Web framework            | Next.js / App Router                                         |
| Web language             | TypeScript                                                   |
| Web server state         | TanStack Query                                               |
| Web interaction state    | Zustand                                                      |
| Mobile framework         | Flutter                                                      |
| Mobile language          | Dart                                                         |
| Mobile state             | Riverpod                                                     |
| Mobile local persistence | Drift for explicitly supported offline drafts                |
| API contracts            | Canonical protobuf / Platform API contracts                  |
| Web API transport        | Connect-Web over gRPC-Web, with REST fallback where gRPC-Web is unavailable (provisional, pending Phase 1 spike) |
| Mobile API transport     | Native Dart gRPC where supported                             |
| Design system            | Shared semantic tokens with Web and Flutter implementations  |
| Streaming                | Dedicated structured stream controller                       |
| E2E                      | Browser/device E2E against representative Platform API       |
| Observability            | Correlated client telemetry using platform operation/trace identifiers |
| Graph rendering          | WebGL-based with level-of-detail culling and server-side bounded subgraphs (provisional, pending Phase 3 spike) |

These choices are provisional until implementation spike results are available.

------

## 25. Non-Goals

The UI project must not become a second implementation of the Synanton backend.

Clients do not own:

- search ranking;
- vector retrieval;
- graph reasoning;
- GraphRAG reasoning;
- ontology inference;
- document extraction;
- authorization;
- LLM orchestration;
- canonical knowledge persistence;
- workflow semantics;
- recalculation algorithms;
- source synchronization;
- temporal version authority.

The UI may provide controls for these capabilities when exposed by the Platform API, but execution remains platform-owned.

------

## 26. Success Criteria

### 26.1 MVP success

The MVP succeeds if a user can:

1. establish a secure `KnowledgeContext`;
2. ask a question;
3. receive a structured streamed answer;
4. inspect structured citations, including partially resolved citations;
5. resolve a citation to evidence;
6. navigate to a source document;
7. identify the authoritative source version;
8. preserve tenant and temporal semantics throughout the workflow.

### 26.2 Cross-platform success

Web and Mobile must:

- consume compatible canonical contracts;
- interpret stream events consistently;
- expose the same citation semantics;
- preserve provenance;
- respect authorization;
- respect temporal semantics.

### 26.3 Workbench success

The mature Workbench should enable users to move between:

text

```
Ask ↔ Search ↔ Evidence ↔ Document ↔ Graph ↔ Timeline
        ↕          ↕           ↕
      Review ↔ Knowledge ↔ Operations ↔ AI
```



without losing context.

### 26.4 Quality success

The platform must demonstrate:

- no synthesized provenance;
- explicit partial citation resolution;
- no hidden historical fallback;
- fail-closed security;
- uniform no-results behaviour;
- tenant isolation;
- mid-stream authorization handling;
- observable client failures;
- accessible alternatives for non-visual views;
- agreed performance budgets;
- contract compatibility.

------

## 27. Open Decisions

Open decisions are grouped by phase-blocking severity.

### Blocking for Phase 1

- Contract generation and compatibility-validation pipeline.
- Canonical protobuf ownership and release workflow.
- Authentication/token acquisition and refresh model.
- Capability discovery mechanism and refresh channel.
- Minimum citation payload shared by Web and Mobile.
- Streaming event schema, cancellation semantics, and authorization-change notification.

### Blocking for Phase 2

- Exact browser transport combination for Platform API.
- PDF coordinate model and citation navigation implementation.
- Graph rendering library (Phase 3 spike may run in parallel).

### Blocking for Phase 3 and later

- Offline persistence scope on Mobile.
- Push notification provider.
- Design token tooling and pipeline.
- Exact multi-tenant UX for delegated administration.
- Temporal conflict visualization patterns.
- Exact boundaries between Knowledge Studio, Review, Operations, Analytics, and AI Studio.
- Browser/device support matrix finalisation.

Each decision should be resolved through an ADR or equivalent engineering decision record once implementation begins.

------

## 28. Platform Support Matrix

The initial support matrix is provisional and will be confirmed during Phase 1.

**Web:**

- last two major versions of Chrome, Firefox, Edge, Safari;
- desktop and laptop primary;
- tablet where practical.

**Mobile:**

- iOS 16+;
- Android 13+;
- tablet layouts where practical.

The dense Workbench should not be forced into a mobile layout. Mobile-specific workflows belong in the Flutter application.

------

## 29. Glossary

**Synanton** — The enterprise knowledge platform described by the Platform architecture.

**Platform API** — The stable external application boundary through which clients access authoritative Synanton capabilities.

**synapt** — The implementation/API namespace used for the Synanton Platform API.

**KnowledgeContext** — The shared UI context containing tenant, authorization, temporal, query, evidence, investigation, source, entity, operation, and AI execution context.

**Capability** — A server-provided, authoritative statement that a principal may perform a class of actions. Capabilities shape UI presentation but do not themselves constitute authorization decisions.

**Canonical Knowledge** — Authoritative knowledge state owned by the Knowledge plane.

**Derived State** — Search projections, analytics, retrieval structures, generated outputs, and other representations derived from authoritative state.

**Provenance** — The structured relationship explaining the origin and derivation of knowledge or evidence.

**Evidence** — Authoritative or platform-described material supporting a result, answer, or knowledge representation.

**Source** — An external or platform-registered origin of knowledge.

**Source Version** — An immutable version of source state with temporal and provenance semantics.

**Operation** — Durable state representing long-running platform work.

**Processing Run** — A record of substantial derived processing.

**Syntology** — Synanton's ontology/semantic modeling capability.

**Relix** — Synanton's graph/relationship capability.

**Resolutor** — The platform capability responsible for determining affected derived state.

**Equalix** — The controlled recalculation/execution capability used to coordinate derived-state recalculation.

**Investigation** — A user-oriented workflow spanning queries, evidence, entities, sources, documents, and related context.

------

## 30. Relationship to Open WebUI

Open WebUI is a useful UX benchmark for conversational AI interaction, but it should not define Synanton's information architecture.

The distinction is fundamental:

| Open WebUI-style model          | Synanton model                                           |
| ------------------------------- | -------------------------------------------------------- |
| Conversation-centric            | Knowledge-centric                                        |
| Chat is primary object          | KnowledgeContext is primary object                       |
| Documents support chat          | Evidence/documents are first-class views                 |
| Retrieval is mostly behind chat | Retrieval/search is inspectable                          |
| Citations support answers       | Provenance is shared infrastructure                      |
| Current state is dominant       | Temporal state is explicit                               |
| Operations are secondary        | Operations are first-class                               |
| Graph is optional               | Graph is a knowledge view                                |
| Administration is separate      | Administration is capability-driven within the Workbench |

Synanton may borrow interaction patterns from conversational AI products, but the architecture must remain knowledge-native.

------

## 31. Final Product Position

Synanton UI should be implemented as a Knowledge Workbench, not as a generic chat frontend and not as a collection of independent management screens.

The **Web client** is the primary enterprise knowledge environment.

The **Mobile client** is a focused Knowledge Assistant.

Both share:

- Platform API contracts;
- `KnowledgeContext`;
- evidence;
- provenance;
- temporal semantics;
- authorization semantics;
- operation state;
- design-system semantics;
- observability conventions.

The UI does not reimplement platform capabilities. It visualizes them.

It does not decide authorization. It renders authoritative authorization state.

It does not infer semantic events from generated text. It consumes structured contracts.

It does not invent provenance. It renders platform-provided provenance and exposes explicit degraded states when provenance cannot be resolved.

It does not silently substitute current knowledge for historical knowledge. It preserves temporal semantics and fails explicitly when requested historical state is unavailable.

The defining architectural flow is:

text

```
                    ┌───────────────────────┐
                    │     Platform API      │
                    │       (`synapt`)      │
                    └───────────┬───────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
        Canonical Knowledge              Derived State
        (authoritative)                  (observable through
                                          evidence & provenance)
                │                               │
                └───────────────┬───────────────┘
                                ▼
                    ┌───────────────────────┐
                    │   KnowledgeContext    │
                    └───────────┬───────────┘
                                │
       ┌───────────────┬────────┼────────┬───────────────┐
       ▼               ▼        ▼        ▼               ▼
      Ask            Search   Evidence  Document       Graph
       │               │        │        │               │
       └───────────────┴────────┼────────┴───────────────┘
                                │
                                ▼
                         Source Version
                                │
                                ▼
                           Provenance
```



The first implementation milestone must prove this contract:

> A user can ask a question and trace the resulting knowledge through structured citations to authoritative enterprise evidence and a source version, under the correct security and temporal context.

That vertical slice is the foundation.

Everything else — graph exploration, temporal visualization, knowledge review, ontology engineering, operations, analytics, and AI Studio — should be built as extensions of the same contract-driven Knowledge Workbench rather than as parallel architectures.