# Synanton Knowledge Workspace — Competitive UX and Frontend Architecture Research

- **Status:** Research and architecture recommendation for review
- **Reviewed:** 2026-11-12
- **Scope:** Enterprise knowledge discovery, semantic graph exploration, ontology browsing, evidence/provenance UX, and reusable frontend visualization components
- **Implementation target:** Existing React 18 + Vite workbench in apps/web
- **Related proposal:** [Knowledge Discovery UI design proposal](../architecture/knowledge-discovery-ui-proposal.md)
- **Related tracker:** [UI architecture tracker #1](https://github.com/synanton/ui/issues/1)
- **Related design PR:** [#25](https://github.com/synanton/ui/pull/25)

---

## 1. Executive recommendation

Build Synanton as a **modular Knowledge Workspace**, not as a search page with an attached graph tab and not as a generic chat application.

The product should connect four user tasks in one continuous investigation:

1. **Search** — find relevant documents, chunks, and entities; understand retrieval coverage and ranking.
2. **Entity and graph exploration** — inspect canonical entities, follow bounded relationships, and understand edge direction and status.
3. **Ontology exploration** — understand classes, properties, constraints, and the semantic meaning of instances.
4. **Evidence and provenance** — inspect the source material and processing lineage supporting a result or relationship.

The primary interaction is:

> Search → inspect result → open entity → understand its ontology type → explore bounded relationships → inspect relationship evidence → open source.

The strongest product patterns come from combining:
- Neo4j Bloom's search-first focused-subgraph exploration and business perspectives;
- Stardog Explorer's text/query-builder entry points and list/graph result modes;
- Glean's permission-aware source discovery and inline evidence previews;
- Linkurious's investigation-oriented inspectors, filtering, and synchronized tabular view;
- WebProtégé's structured ontology detail and revision-aware editing model;
- metaphactory's configurable knowledge-graph workspaces and ontology/SHACL integration.

No single product should be copied wholesale. Synanton's differentiator is the integration of **retrieval attribution, canonical entity identity, ontology semantics, graph relationships, and source-level provenance**.

### Decision summary

| Decision | Recommendation | Status |
|---|---|---|
| Product shape | One Knowledge Workspace with feature-owned Search, Entity, Graph, Ontology, and Evidence modules | Recommended |
| Navigation | Search-first, with stable entity URLs and contextual graph/ontology navigation | Aligns with existing proposal |
| Graph interaction | Focused subgraphs, progressive expansion, explicit edge inspector, synchronized list alternative | Recommended |
| Ontology UX | Read-first class/property/instance browser before authoring | Recommended |
| Evidence | First-class, immediately accessible from result and relationship inspectors | Required |
| Graph renderer | Do not select from screenshots or stars; run a bounded Cytoscape.js vs AntV G6 spike | Open pending evidence |
| Reactodia | Keep as a semantic-graph reference; do not adopt before LGPL-2.1 review and integration spike | Not selected |
| Future workflow editor | Consider React Flow / XYFlow for processing pipelines, not as the semantic graph renderer | Deferred |

---

## 2. Research method and limitations

This is a desk-research benchmark based on current public product documentation, project repositories, release pages, and license files reviewed on 2026-11-12. It is not a hands-on usability study, vendor proof-of-concept, performance comparison, or legal opinion.

Repository stars and commit counts are contextual signals only. They are not quality, security, accessibility, or maintenance guarantees. Before adopting a dependency, re-check its exact package version, license, transitive dependencies, release activity, security posture, and integration model.

The market products are not all direct competitors. Some are enterprise applications; others are specialist ontology editors or graph-investigation tools. They are included because each demonstrates a useful part of the target experience.

---

## 3. Market product benchmark

### 3.1 Neo4j Bloom — graph exploration interaction reference

**Sources:** [Bloom overview](https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-overview/), [Perspectives](https://neo4j.com/docs/bloom-user-guide/current/bloom-perspectives/bloom-perspectives/), [Aura Explore](https://neo4j.com/docs/aura/explore/introduction/).

Bloom starts from search and exploration, shows only the graph scene discovered so far, and supports contextual actions on nodes and relationships. Its Perspective concept configures a business-facing lens over categories, properties, relationship visibility, styling, and search phrases.

**Adopt**
- Search-to-focused-subgraph interaction.
- Progressive neighbor exploration rather than tenant-wide graph rendering.
- Contextual actions on selected nodes and edges.
- Configurable semantic presentation of entity and relationship types.

**Adapt**
- Replace database-specific Perspectives with Synanton ontology-aware display configuration.
- Preserve search query, entity identity, evidence context, and authorization-safe navigation across graph expansion.
- Keep graph editing out of the first discovery release.

**Reject**
- Importing Bloom's full configuration and editing complexity before Synanton has corresponding user workflows.

### 3.2 Stardog Explorer — search/query-to-graph workflow reference

**Sources:** [Stardog Explorer documentation](https://docs.stardog.com/stardog-applications/explorer/), [product overview](https://www.stardog.com/explorer/).

Explorer combines text search with a visual Query Builder, uses the data model to guide query construction, and supports list and graph result views. Its graph view supports filtering, grouping, relationship expansion, and layout choices.

**Adopt**
- Search and structured query entry points in one workspace.
- List/graph as two views over the same result set.
- Model-aware filters and relationship exploration.
- Progressive details rather than exposing query language by default.

**Adapt**
- Keep Synanton's retrieval diagnostics as a permission-aware engineering disclosure.
- Use the existing platform API for graph and ontology data; do not add a client-side SPARQL/query engine merely to mimic Explorer.

**Reject**
- Assuming the Synanton backend already supports arbitrary model-driven path queries. The current entity-neighbor API is bounded one-hop; richer query-builder behavior requires explicit API support.

### 3.3 Glean — enterprise search and evidence UX reference

**Sources:** [Glean citations](https://docs.glean.com/user-guide/assistant/glean-chat/glean-chat-citations/glean-citations), [how Glean accesses information](https://docs.glean.com/user-guide/assistant/how-glean-accesses-info), [search FAQ](https://docs.glean.com/administration/search/faq).

Glean documents permission-aware search and source citations that provide previews and open only resources the user is already authorized to access.

**Adopt**
- Fast, predictable search as the default entry point.
- Source previews close to the claim or result they support.
- Permission-aware source opening and consistent access behavior.
- Clear distinction between a citation reference and authorization to view the source.

**Adapt**
- Present retrieval attribution (BM25, Dense, RRF) as a progressive technical detail, not as the default user-facing result hierarchy.
- Extend evidence inspection to entity relationships and extraction assertions, not only generated answers.

**Reject**
- Making a conversational assistant the only navigation model. Synanton needs direct structured search and graph/ontology inspection.

### 3.4 Linkurious — investigation workflow reference

**Sources:** [Linkurious user manual](https://doc.linkurious.com/user-manual/latest/page.html), [feature comparison](https://linkurious.com/pricing/).

Linkurious emphasizes graph investigation, filtering, grouping, multiple layouts, tabular inspection, node/edge detail, and collaborative case workflows.

**Adopt**
- Strong node and edge inspectors.
- Filtering and grouping that do not obscure the underlying data.
- Tabular alternatives to visual graph exploration.
- Explicit investigation context.

**Adapt**
- Keep the inspector evidence-first and linked to Synanton's provenance model.
- Consider saved investigation workspaces only after users need durable shared investigations.

**Reject**
- Case assignment, comments, alerting, and case-management complexity in the initial Knowledge Workspace.

### 3.5 metaphactory — extensible knowledge-graph application reference

**Source:** [AWS Neptune integration overview](https://docs.aws.amazon.com/neptune/latest/userguide/visualization-metaphacts.html).

metaphactory is described as a configurable platform for building knowledge-graph applications, with ontology modeling, OWL/SHACL, SPARQL query tooling, and reusable web components for search, graph exploration, visualization, and authoring.

**Adopt**
- Configurable, reusable domain-specific workspaces.
- Ontology-aware components and semantic display rules.
- Clear separation between generic platform primitives and domain-specific application composition.

**Adapt**
- Use Synanton's typed API/domain contracts and feature modules rather than a broad low-code configuration framework.
- Add ontology-driven display configuration only after stable ontology metadata contracts exist.

### 3.6 WebProtégé — ontology engineering reference

**Sources:** [Protégé software](https://protege.stanford.edu/software/), [WebProtégé repository](https://github.com/protegeproject/webprotege).

WebProtégé supports OWL 2 ontology editing, collaborative viewing/editing, permissions, discussions, watches, and revision history.

**Adopt**
- Structured class/property detail.
- Explicit annotations and relationships.
- Revision/change context if ontology editing becomes a product capability.

**Adapt**
- Begin with a read-first ontology browser: class hierarchy, properties, constraints, and paginated instances.
- Treat authoring, approval, and collaboration as a separate product phase.

**Reject**
- Building a full ontology-authoring environment before the read/explore experience and backend editing contracts are established.

### 3.7 Microsoft Ontology Playground — modern ontology UX reference

**Sources:** [repository](https://github.com/microsoft/Ontology-Playground), [README and implementation notes](https://github.com/microsoft/Ontology-Playground#readme).

The project is a preview, static web application with an ontology catalogue, Cytoscape.js graph exploration, a visual designer, RDF import/export, preservation of source statements not represented in the visual projection, SHACL-aware source preservation, deep links, and performance testing for large ontology projections.

**Adopt**
- Treat a graph canvas as a projection of a richer semantic source, not the authoritative model.
- Preserve source semantics that cannot be represented visually.
- Separate browse/catalogue, visual exploration, and authoring modes.
- Use immutable source artifacts and explicit validation.
- Build measurable performance tests into the graph experience.

**Adapt**
- Use its interaction and data-preservation ideas, not its static-site architecture.
- Keep Synanton ontology data and validation authoritative on the platform.

**Caution**
- The repository labels the application Preview and notes AI-assisted development. Its feature set is a valuable UX/engineering reference, not evidence that it is production-ready as a dependency or application foundation.

---

## 4. Open-source frontend and graph library benchmark

### 4.1 Candidate comparison

| Project | Strength | License / ecosystem signal | Synanton disposition |
|---|---|---|---|
| [Cytoscape.js](https://github.com/cytoscape/cytoscape.js) | Mature graph model, selectors, analysis, layout ecosystem, broad browser support | MIT; established project with regular releases | Baseline candidate; include in renderer spike |
| [AntV G6](https://github.com/antvis/G6) | Rich graph visualization framework, plugins, custom elements, layouts, behaviors | MIT; active v5 release line | Main challenger; prototype against the same graph contract |
| [Sigma.js + Graphology](https://github.com/jacomyal/sigma.js) | WebGL renderer and separate graph data model; designed for large networks | v4 release line; verify package and dependency licenses at adoption | Scale-oriented alternative if actual workloads exceed current renderer budgets |
| [Reactodia Workspace](https://github.com/reactodia/reactodia-workspace) | Semantic/RDF-aware graph workspace, custom React components, data providers, worker-backed layout | LGPL-2.1; small public GitHub footprint at review time | Strong domain reference; license and integration review required |
| [Zazuko Graph Explorer](https://github.com/zazuko/graph-explorer) | RDF/SPARQL graph exploration, context-aware navigation, customizable node/link templates | LGPL-2.1; niche RDF-focused project | Useful semantic UX/code reference; not a default dependency |
| [Microsoft Ontology Playground](https://github.com/microsoft/Ontology-Playground) | End-to-end ontology browse/design UX; Cytoscape-based visual projection | MIT; preview application | UX and source-preservation reference, not application foundation |
| [React Flow / XYFlow](https://github.com/xyflow/xyflow) | Excellent node-based editor primitives, custom nodes, interactions, minimap | MIT; active ecosystem | Future processing-pipeline/dependency editor, not the canonical entity graph |

### 4.2 Important license and adoption findings

- **Reactodia is not MIT/BSD/Apache**: its repository declares LGPL-2.1. It has the closest semantic graph workspace concept, but Synanton should not adopt it until the project's distribution model and LGPL obligations have been reviewed.
- **Zazuko Graph Explorer also declares LGPL-2.1**, and is an RDF/SPARQL-oriented fork of Ontodia. It is useful for understanding semantic graph navigation, but should not be mistaken for a broadly adopted general-purpose React component.
- **Cytoscape.js and AntV G6 declare MIT** in their project materials. They are the lower-friction candidates for a commercial product, subject to normal dependency/license inventory.
- **Sigma.js is a rendering alternative, not a complete graph UX**. It uses Graphology as its graph data structure and WebGL for rendering. It does not provide Synanton's semantic inspector, evidence, authorization, or ontology workflows.
- **React Flow is a node-based editor**, which makes it a better fit for future pipeline composition than for a read-mostly knowledge graph.

### 4.3 Current repository baseline

The repository README lists Cytoscape.js among the proposed web technologies. However, the current apps/web/package.json does not declare Cytoscape.js, G6, Sigma.js, or Reactodia as direct dependencies. Therefore, the benchmark must not assume that a renderer is already integrated into the current workbench.

The current application remains React 18 + Vite. Keep that foundation. Do not migrate frameworks or introduce a graph library until a small spike demonstrates a concrete benefit.

---

## 5. Recommended Synanton UX model

### 5.1 One workspace, feature-owned modules

Primary navigation:

- **Search** — documents, chunks, and entity discovery.
- **Entities** — canonical entity detail and relationship inventory.
- **Graph** — focused, bounded graph exploration.
- **Ontology** — class/property browser and instance entry points.
- **Evidence** — source and provenance detail, normally opened contextually rather than as a disconnected destination.
- **Processing** — future operational view for ingestion, extraction, validation, promotion, and recalculation.

These should be feature modules inside one workbench, not independent deployables.

### 5.2 Investigation loop

1. User searches for a term, document, or entity.
2. Results show relevant content and source context.
3. User opens a canonical entity detail page.
4. Entity detail shows ontology class, properties, relationship summary, and available evidence.
5. User opens a focused graph around the entity.
6. User expands a bounded set of neighbors and selects a relationship.
7. The relationship inspector shows direction, predicate, status, and evidence availability.
8. User opens the platform-backed evidence/source view.
9. Browser back returns to the same graph selection and then the original search state.

The UI must preserve stable IDs and safe view state, not duplicate backend state or authorization.

### 5.3 Graph workspace behavior

- Start from a selected entity or explicit search; never load a tenant-wide graph by default.
- Keep node and relationship selection stable across expansion and layout changes.
- Make edge direction explicit in text, not only through arrows.
- Treat evidence as a first-class edge-inspector section.
- Show partial/truncated graph responses and the reason for the bound.
- Provide synchronized Nodes and Relationships list/table views.
- Support keyboard navigation and a non-canvas route to every important action.
- Keep layout coordinates and viewport state separate from semantic graph data.
- Do not imply multi-hop path query support until the public API exposes it.

### 5.4 Ontology workspace behavior

Start with a read-first experience:
- searchable class hierarchy;
- class and property detail;
- superclass/subclass relationships;
- domain/range and constraints only when exposed by the API;
- paginated instances;
- links from class → instance → entity → graph;
- explicit validation/unknown states.

Ontology authoring, editing, approval, and revision workflows are a later capability requiring explicit platform contracts.

---

## 6. Frontend architecture and extension boundaries

### 6.1 Layers

1. **Application shell:** routing, session boundary, command palette, navigation, design tokens, layout.
2. **Feature modules:** Search, Entity, Graph, Ontology, Evidence, and later Processing.
3. **Shared domain contracts:** stable IDs and typed data models for Entity, Relationship, OntologyClass, EvidenceReference, SearchTrace, and validation/status values.
4. **API adapters:** consume generated/approved public API contracts; never call internal services or databases from the browser.
5. **Visualization adapter:** translate bounded graph domain data into renderer-specific elements and events.

### 6.2 State ownership

- Router owns shareable route state.
- TanStack Query or the established server-state layer owns API results, caching, cancellation, and invalidation.
- Search owns query execution, result pages, ranking metadata, and local selection.
- Entity owns canonical entity detail and relationship summaries.
- Graph owns bounded neighborhoods, layout coordinates, viewport, selected node/edge, and expansion requests.
- Ontology owns tree expansion, class/property detail, and paginated instances.
- Evidence owns source/evidence detail and supported location.
- A small navigation context may carry stable selected IDs and safe return context only.

Do not create a global KnowledgeContext containing graph payloads, API caches, request lifecycles, layout coordinates, authorization decisions, or every feature's transient state.

### 6.3 Renderer adapter contract

Define a small renderer-neutral interface before adopting a library. It should support:
- mount/unmount and deterministic cleanup;
- replace/update a bounded node/edge set;
- preserve stable semantic IDs;
- selection and focus events for nodes and edges;
- fit, zoom, pan, and viewport snapshot/restore;
- style mapping from ontology/entity/relation metadata;
- expansion/loading/truncation overlays;
- accessible list/table synchronization;
- cancellation and disposal of layout work.

Renderer-specific node objects, coordinates, and internal graph models must not leak into domain contracts or API models.

### 6.4 Extension model

Future capabilities should extend through feature modules and typed adapters:
- new graph renderers without rewriting entity/evidence flows;
- new ontology formats without coupling them to the canvas;
- new processing views without turning the graph renderer into a workflow engine;
- AI-assisted investigation as an optional command/tool surface over authorized platform operations;
- saved workspaces only when a persistence and sharing contract exists.

---

## 7. Graph renderer spike: Cytoscape.js vs AntV G6

Do not decide the renderer in this research document. Run a bounded comparison using the same Synanton data adapter and acceptance cases.

### 7.1 Candidates

**Cytoscape.js**
- Mature graph model and selector API.
- Broad layout and extension ecosystem.
- MIT license.
- Strong candidate for structured graph interaction and analysis.

**AntV G6**
- Modern visualization framework with plugin, behavior, custom element, and layout extensibility.
- MIT license.
- Strong candidate for a highly customized graph canvas.

**Sigma.js + Graphology**
- Keep as a scale benchmark only if the first two fail representative performance targets.
- It is not the first candidate for the evidence-rich graph inspector experience.

**Reactodia**
- Optional semantic UX spike only if its RDF model and React workspace materially reduce implementation work.
- Do not add to production dependency tree until LGPL-2.1 obligations and maintenance risk are accepted.

### 7.2 Shared test fixture

Use the same API-shaped fixture and interaction script for both primary candidates:

| Workload | Required behavior |
|---|---|
| 200 nodes / 600 edges | Initial render, selection, inspector, and layout interaction |
| Expansion by up to 100 nodes | Incremental update without losing focus or viewport |
| 1,000 nodes / 5,000 edges | Defensive maximum; offer list/table fallback if canvas is not responsive |
| Dense local neighborhood | Avoid label/edge overload; preserve selection and inspectability |
| Parallel/directional edges | Show predicate and direction unambiguously |
| Partial/truncated API result | Communicate bounds and allow a supported continuation |
| Keyboard-only use | Reach/select nodes and edges through a synchronized accessible list |
| Unmount/remount | Release workers, listeners, observers, and renderer resources |

### 7.3 Existing performance targets

Retain the current proposal's initial budgets as targets to validate, not guarantees:

- Search submit → first result: p50 ≤ 400 ms, p95 ≤ 1.2 s, p99 ≤ 2.5 s.
- Server-backed filter: p95 ≤ 800 ms.
- Autocomplete: p95 ≤ 250 ms.
- First paint of 50 virtualized rows: ≤ 100 ms after payload.
- Graph initial render: ≤ 200 nodes / 600 edges, p95 ≤ 1.5 s to interactive.
- Expansion by up to 100 nodes: p95 ≤ 800 ms.
- Layout switch without refetch: p95 ≤ 600 ms.
- Defensive graph cap: 1,000 nodes / 5,000 edges, then synchronized list/table fallback.

Measure API latency separately from renderer/layout latency. Segment by browser, hardware class, graph density, payload size, and cold/warm state. Report p99 only with at least 1,000 representative requests; otherwise label the sample insufficient.

### 7.4 Spike decision gate

Choose the renderer only if it:
1. passes all correctness and identity tests;
2. preserves accessible list-based navigation;
3. meets the budgets on the same hardware and fixture;
4. supports custom semantic node/edge styling and interaction without invasive forks;
5. has acceptable license, maintenance, security, bundle-size, and integration characteristics.

If Cytoscape.js meets the requirements, keep it. A rewrite is not a product outcome.

---

## 8. Phased implementation roadmap

### Phase 0 — Research and contract alignment

- [x] Review market products and open-source graph/ontology projects.
- [x] Record a modular Knowledge Workspace direction.
- [x] Define renderer candidates and spike criteria.
- [ ] Confirm current public API support for entity detail, neighbor expansion, relationship evidence, ontology class/property detail, and source navigation.
- [ ] Reconcile the existing UI proposal with the current deployed Entity Graph behavior and real API response shapes.

**Exit:** proposal accepted; API-backed capabilities and gaps are explicit; no renderer is selected by assumption.

### Phase 1 — Unified discovery journey

- Search → canonical entity detail.
- Entity detail → bounded graph.
- Graph relationship → evidence inspector.
- Evidence → source view.
- Preserve browser back/forward and search context.
- Add loading, empty, partial, unavailable, error, and retry states.

**Exit:** one repeatable, real-API investigation journey with tenant-isolation and provenance tests.

### Phase 2 — Ontology browser

- Read-only class tree and search.
- Class/property detail.
- Paginated instances.
- Class → entity → graph navigation.
- Validation and unsupported-capability states.

**Exit:** ontology navigation works against a real or contract-conformant API without client-side inference.

### Phase 3 — Graph renderer selection and hardening

- Implement the shared renderer adapter.
- Benchmark Cytoscape.js and G6 against the same fixture.
- Select only after performance, accessibility, and license review.
- Add synchronized list/table fallback and graph expansion tests.

**Exit:** renderer decision is evidence-based and reversible at the adapter boundary.

### Phase 4 — Engineering and governance workspaces

- Ontology editing and approval only after platform contracts exist.
- Processing/extraction/recalculation views.
- Saved investigation workspaces if persistence/sharing is supported.
- AI-assisted investigation as an optional, auditable layer.

**Exit:** new capabilities extend the same shell and typed contracts without creating another monolithic context or independent application.

---

## 9. Product success and telemetry

Use the metrics already proposed in the Knowledge Discovery UI design:
- time-to-first-evidence;
- evidence-open rate;
- cross-workspace transition rate;
- partial-retrieval incidence;
- query refinement rate;
- list-alternative adoption.

Add graph-specific measures:
- graph expansion completion and cancellation;
- proportion of selected relationships with evidence references;
- evidence-open success rate;
- time from entity selection to evidence;
- list/table fallback rate by graph size;
- graph interaction errors and renderer initialization failures.

Telemetry must not capture access tokens, raw document content, or unrestricted query text. Use event categories, stable non-sensitive identifiers where permitted, and aggregate latency/count fields.

---

## 10. Risks and explicit non-goals

| Risk | Mitigation |
|---|---|
| Renderer choice based on visual demos rather than real payloads | Shared fixture and measured spike |
| Renderer lock-in | Renderer-neutral adapter and stable semantic IDs |
| Graph suggests unsupported facts | Explicit relationship status, direction, and evidence |
| Large graph overwhelms users | Focused subgraphs, expansion bounds, list/table fallback |
| UI assumes unsupported backend capability | API capability inventory; graceful unavailable states |
| Ontology editor becomes a second product prematurely | Read-first ontology phase; authoring is separately gated |
| LGPL obligations are overlooked | Legal/license review before Reactodia or Graph Explorer adoption |
| Global state becomes a god object | Feature-owned state and narrow navigation envelope |
| UI duplicates authorization | Server-side authorization on every resource; UI is presentation only |

Non-goals for the first Knowledge Workspace release:
- general-purpose graph analytics canvas;
- unrestricted Cypher/SPARQL editor;
- tenant-wide graph visualization;
- ontology authoring/approval;
- broad agent builder;
- workflow/pipeline editor;
- replacement of the existing React/Vite stack.

---

## 11. Source register

### Market products
- Neo4j Bloom overview: https://neo4j.com/docs/bloom-user-guide/current/bloom-visual-tour/bloom-overview/
- Neo4j Bloom Perspectives: https://neo4j.com/docs/bloom-user-guide/current/bloom-perspectives/bloom-perspectives/
- Stardog Explorer: https://docs.stardog.com/stardog-applications/explorer/
- Stardog Explorer product page: https://www.stardog.com/explorer/
- Glean citations: https://docs.glean.com/user-guide/assistant/glean-chat/glean-chat-citations/glean-citations
- Glean permission-aware access: https://docs.glean.com/user-guide/assistant/how-glean-accesses-info
- Linkurious user manual: https://doc.linkurious.com/user-manual/latest/page.html
- metaphactory on Amazon Neptune: https://docs.aws.amazon.com/neptune/latest/userguide/visualization-metaphacts.html
- WebProtégé / Protégé: https://protege.stanford.edu/software/

### Open-source projects
- Cytoscape.js: https://github.com/cytoscape/cytoscape.js
- AntV G6: https://github.com/antvis/G6
- Sigma.js: https://github.com/jacomyal/sigma.js
- Graphology: https://graphology.github.io/
- Reactodia Workspace: https://github.com/reactodia/reactodia-workspace
- Zazuko Graph Explorer: https://github.com/zazuko/graph-explorer
- Microsoft Ontology Playground: https://github.com/microsoft/Ontology-Playground
- React Flow / XYFlow: https://github.com/xyflow/xyflow

### Synanton project context
- [Knowledge Discovery UI proposal](../architecture/knowledge-discovery-ui-proposal.md)
- [UI surface inventory](../architecture/ui-inventory.md)
- [UI architecture tracker #1](https://github.com/synanton/ui/issues/1)
- [Design proposal PR #25](https://github.com/synanton/ui/pull/25)

---

## 12. Final decision

The recommended direction is a **custom, modular Knowledge Workspace** with search-first navigation, stable entity detail, focused graph exploration, read-first ontology browsing, and evidence available directly from the selected result or relationship.

Keep the existing React 18 + Vite foundation. Do not adopt Reactodia or replace the renderer on the strength of semantic fit alone: Reactodia and Zazuko Graph Explorer are LGPL-2.1, while Cytoscape.js and AntV G6 are MIT. Run a fair Cytoscape.js-vs-G6 spike against Synanton's actual API-shaped workloads. Keep Sigma.js as a scale alternative and React Flow for a future processing workflow editor.

The first product milestone is:

**Search → Entity → Graph → Evidence**, with ontology navigation integrated into the same journey.

This delivers a coherent experience now while keeping renderer, ontology authoring, processing workflows, and AI-assisted investigation extensible for later phases.
