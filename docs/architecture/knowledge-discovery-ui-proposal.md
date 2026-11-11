# Knowledge Discovery UI — Design Proposal

- **Status:** Proposed design for review
- **Date:** 2026-11-04
- **Scope:** Web workbench search, ontology navigation, and knowledge-graph exploration
- **Implementation home:** `apps/web` in this repository
- **API boundary:** Synanton Platform API (`synapt`)
- **Related:** [UI architecture proposal](../../doc/proposal.md), [UI inventory](./ui-inventory.md), [vertical-slice trace](./ingestion-search-vertical-slice-trace.md), [ADR 0002 — API contracts and browser ingress](../decisions/0002-api-contracts-and-browser-ingress.md), [ADR 0003 — Web framework](../decisions/0003-web-framework.md)

---

## 1. Executive summary

This proposal defines a coherent knowledge-discovery experience across three connected workspaces:

1. **Search** — find documents, chunks, and entities; inspect ranking and source evidence.
2. **Ontology** — browse semantic classes, properties, and class hierarchies; understand how entities are typed.
3. **Graph** — explore concrete entities and their relationships, follow paths, and inspect the evidence behind connections.

These are not three independent products. They are different views of the same tenant-scoped, time-aware, provenance-aware knowledge context.

The primary interaction loop is:

> Search for a concept → inspect a result → open an entity → understand its ontology type → explore its relationships → verify the supporting source evidence.

The UI must make that loop feel continuous. Moving between views must preserve the user's query, selected entity, temporal context, filters, and navigation history where applicable.

The first implementation target is the existing React/Vite web workbench in `apps/web`. This proposal does not introduce another application, a new backend service, or direct browser access to internal databases.

### Product principles

- **Knowledge first, not chat first.** Search and structured exploration are first-class workbench capabilities.
- **Progressive disclosure.** Show useful end-user information by default; expose retrieval diagnostics and graph detail when requested and authorized.
- **Evidence over visual implication.** A drawn edge is not proof. Every relationship must expose its source, status, and provenance when supplied by the platform.
- **Ontology is the semantic map; graph is the instance map.** Ontology explains the types and allowed meanings; graph shows actual entities and observed relationships.
- **Start from a focused subgraph.** Never render the entire tenant graph by default.
- **Graceful capability degradation.** If a retrieval leg, ontology endpoint, graph traversal, or provenance lookup is unavailable, explain what is unavailable rather than fabricating results.
- **The platform remains authoritative.** The UI renders platform-returned facts and never implements authorization, inference, ranking, or canonical persistence itself.

## 2. Scope and non-goals

### In scope

- Shared workbench shell and navigation for Search, Ontology, and Graph.
- Search results with source and chunk provenance.
- Entity summaries and ontology classification.
- Ontology class tree, class detail, properties, and instance entry points.
- Focused graph exploration with one-hop and bounded multi-hop expansion where supported.
- Relationship inspection and evidence navigation.
- URL-addressable state for useful views and selected objects.
- Loading, empty, partial, unavailable, and error states.
- Responsive and accessible alternatives to graph-only interaction.

### Out of scope for this proposal

- A new graph database or ontology service.
- Client-side ontology reasoning, graph inference, or retrieval ranking.
- Ontology authoring, editing, or approval workflows. Those require separate product and API decisions.
- A general-purpose graph analytics/BI canvas.
- A full redesign of ingestion, administration, mobile, or the Ask experience.
- Promising page-level document navigation until the public API exposes page/section coordinates. The current vertical-slice trace records this as an API gap (#338).

## 3. Design direction

### 3.1 Visual language

Use a restrained, high-density **light developer-console shell** as the default visual language, consistent with the OpenCode brief. The graph canvas is the deliberate exception: it may use a dark neutral surface inside the otherwise light workspace.

- Shell, navigation, search results, ontology tree/tables, toolbars, and inspectors use light neutral surfaces.
- The graph canvas alone may use a dark neutral background. Keep its toolbar, breadcrumbs, inspector, and surrounding panels in the light shell so the boundary is clear rather than switching the entire page theme.
- Separate the canvas from panels with a persistent border/gutter and a labeled graph workspace header. Keep selected entity/edge details in the light inspector; do not place essential controls only on the dark canvas.
- Use compact typography, deliberate spacing, thin borders, subtle elevation, quiet separators, and no oversized hero sections or decorative gradients.
- Use consistent, recognizable icons. Give icon-only graph controls accessible names and tooltips.
- Use motion only to communicate state transitions; respect reduced-motion preferences and avoid continuous layout animation.
- Color is never the only signal for entity type, relationship type, confidence, selection, or status. Pair it with labels, shape, line style, and focus treatment.

**Contrast and token rule:** OpenCode reference values are visual inspiration, not approved accessibility tokens. Do not use muted text `#A3A3A3` or accent `#FF6B3D` for essential text, icons, focus indicators, or selected-state boundaries on white. Define semantic tokens and verify actual foreground/background pairs against WCAG 2.2 AA: 4.5:1 for normal text and 3:1 for large text and meaningful non-text UI. A practical starting point is muted text near `#737373` and a darkened accent such as `#C2410C` on white, subject to measured contrast in the final palette. Decorative use does not waive contrast where the decoration conveys meaning.

For the dark graph canvas, independently test node labels, edge labels, relationship lines, focus rings, selected nodes/edges, hover states, and disabled states. Do not assume a token that passes on white will pass on the canvas. Record tested color pairs in the design-system token documentation.

### 3.2 Reference-product decisions

Use these products as pattern references, not implementation dependencies. Adopt the useful interaction pattern and deliberately avoid importing complexity that does not fit Synanton's scope.

| Reference | Adopt | Adapt | Reject |
|---|---|---|---|
| [Neo4j Bloom](https://neo4j.com/product/bloom/) | Search-to-focused-subgraph flow, contextual node actions, progressive neighbor expansion | Start from Synanton search/entity identity and preserve evidence context during expansion | Bloom-style perspective/configuration complexity unless a validated user task requires it |
| [Linkurious](https://linkurious.com/) | Right-side inspector, edge-first investigation, explicit relationship filtering | Make evidence available directly from the selected relationship inspector | Heavy investigation/case-management workflow or case semantics Synanton does not provide |
| [WebVOWL](https://service.tib.eu/webvowl/) | Semantic legend and visual distinction between classes and properties/relations | Keep the visualization read-only and link selected classes to structured detail | Ontology-editing affordances |
| [WebProtégé](https://webprotege.stanford.edu/) | Class hierarchy, property panels, annotations, structured class detail | Use a compact browse-and-inspect workflow within the shared workbench | Full ontology-authoring, collaboration, and change-management UI |

Avoid copying a graph-first experience that assumes users already know the entity they want. Synanton should let users enter from search, ontology, a document, or an entity link.

## 4. Workbench information architecture

### 4.1 Primary navigation

Keep the three capabilities in one persistent workbench shell:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ SYNANTON     Workspace / Context       Search knowledge…     User / Session │
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │                                                              │
│  Discover    │  Search       Ontology       Graph                           │
│  ──────────  │  ───────────────────────────────────────────────────────     │
│  Search      │                                                              │
│  Ontology    │                    Active workspace                          │
│  Graph       │                                                              │
│              │                                                              │
│  Sources     │                                                              │
│  Ingestion   │                                                              │
│  Operations  │                                                              │
│              │                                                              │
│  Settings    │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

The top-level left navigation remains compact. Search, Ontology, and Graph may also use local tabs when they are part of the same discovery session. Avoid duplicate navigation systems that compete for attention.

### 4.2 Shared KnowledgeContext

The existing `KnowledgeContext` model remains the cross-view state boundary. For this feature set it should carry, where available:

- validated tenant and authorization context;
- temporal context (current or explicit as-of view);
- query text and search filters;
- selected result, document, or entity;
- selected ontology class;
- graph root, expansion depth, and selected relationship;
- evidence/provenance references;
- return location and navigation history.

Not every field is populated on every route. A route must not invent missing values.

### 4.3 Routes and deep links

Proposed route shape (final route conventions should follow the existing router):

| Route | Purpose | Shareable | Authorization scope | Canonical |
|---|---|---|---|---|
| `/search?q=...` | Search results | Yes, only safe query/filter state | Every search request is authorized for the authenticated tenant/session | No; query view |
| `/ontology` | Ontology landing / class tree | Yes | Ontology read permission for the authenticated tenant/session | No; workspace |
| `/ontology/classes/:classId` | Class detail | Yes | Class and related metadata authorized server-side | Class resource |
| `/entities/:entityId` | Canonical entity record: properties, classifications, relationship list, and evidence list | **Yes; preferred URL for tickets and external references** | Entity and each nested relationship/evidence resource authorized server-side | **Yes; only canonical entity URL** |
| `/graph?entity=:entityId&depth=...` | Exploratory graph workspace rooted at the entity; filters and selected node/edge are view state | Yes, as a workspace deep link; not the canonical entity reference | Same entity authorization plus independent authorization for every returned edge and evidence reference | No; transient exploration |
| `/documents/:documentId` | Document and evidence view | Yes, subject to safe location state | Document/version/location authorized server-side | Document resource |

Only stable identifiers and non-sensitive view state belong in URLs. Do not put access tokens, tenant authority, private query diagnostics, or sensitive content in query parameters. Server authorization is required on every request.

Route decision:
1. `/entities/:entityId` is the only canonical entity URL. It is the stable record view intended for tickets, chat, and external references.
2. `/graph?entity=:entityId&depth=...` is an exploratory workspace URL. It may preserve root, bounded depth, safe filters, and selected node/edge, but is not the canonical entity reference and must not be used as the primary external reference.
3. Entity detail exposes an explicit **Explore in graph** action. Graph node selection exposes **Open canonical entity** and navigates to `/entities/:entityId`.
4. Browser back restores the graph workspace selection and then the originating search/ontology context.
7. A relationship may be deep-linked from the canonical entity record with a URL fragment (`/entities/:entityId#relationship-:relationshipId`). The fragment is a navigation hint, not an authorization token or a separate canonical resource route: the entity page must resolve the relationship through the authorized platform contract, scroll to it when present, and retain the same 404/no-metadata-leak behavior for unknown or unauthorized references.
5. Both routes apply the same server-side entity authorization; graph additionally authorizes every edge and evidence reference. Unknown and unauthorized entity IDs return the same externally observable 404 response shape.
6. Opening `/graph` without a focus entity shows an entity search/picker; it never loads a default or tenant-wide graph.


## 5. Shared workspace layout

Search, Ontology, and Graph should share a predictable three-part layout:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Workspace title / breadcrumbs                 Context / temporal indicator │
├─────────────────────┬────────────────────────────────┬─────────────────────┤
│                     │                                │                     │
│  Navigation /       │       Main working area        │  Inspector /        │
│  filters / tree     │       results / canvas         │  evidence details   │
│                     │                                │                     │
│                     │                                │                     │
└─────────────────────┴────────────────────────────────┴─────────────────────┘
```

- Left rail: 260–300 px desktop target; collapsible.
- Main canvas: flexible; owns the primary task.
- Inspector: 320–380 px desktop target; collapsible.
- On smaller screens, left rail and inspector become drawers/sheets; the main task remains usable.
- Keep the main content width and density consistent across routes.
- Preserve selected item when the inspector opens/closes.

Do not force all three columns to remain visible at narrow widths.

## 6. Search workspace

### 6.1 Purpose

Search is the default entry point for knowledge discovery. It should support ordinary users who want relevant documents and analysts who need to understand why results were returned.

The current runnable UI already has a BM25 search path and provenance expansion. The proposal extends that experience without assuming that dense or hybrid retrieval is fully available in every environment.

### 6.2 Proposed desktop layout

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Search                                                                      │
│ [ What connects Acme to the European pricing policy?                 ] [↵] │
│                                                                            │
│ [All] [Documents] [Entities] [Sources]       Filters ▾       Sort: Relevance│
├──────────────────────┬─────────────────────────────────────────────────────┤
│ FILTERS              │  24 results                         Search details ▾ │
│                      │                                                     │
│ Content type         │  DOCUMENT                                           │
│ □ Documents          │  European Pricing Policy                            │
│ □ Entities           │  ...relevant excerpt with query terms highlighted...│
│ □ Sources            │  Source · Version · Updated · Access classification │
│                      │  [Open document] [View evidence] [Explore entities] │
│ Source               │  ─────────────────────────────────────────────────  │
│ ▾ Select source      │  ENTITY                                             │
│                      │  Acme Corporation                                   │
│ Ontology class       │  Organization · 18 relationships · 7 sources       │
│ ▾ Select class       │  [Open entity] [Explore graph] [Ontology class]      │
│                      │  ─────────────────────────────────────────────────  │
│ Time                 │  DOCUMENT                                           │
│ ○ Current            │  Regional Commercial Terms                         │
│ ○ As of…             │  ...excerpt...                                      │
│                      │  [Open document] [View evidence]                     │
└──────────────────────┴─────────────────────────────────────────────────────┘
```

This is a conceptual layout. Result types and filters are shown only when supported by the API and authorized for the current user.

### 6.3 Search interaction model

**Query entry**
- A prominent search field with submit, clear, and keyboard shortcut affordances.
- Preserve query text when navigating to an entity or graph and returning to results.
- Search suggestions may include recent queries and known entities only when the platform exposes them.
- Do not silently reinterpret query syntax.

**Result types**
- Document/source result: title, excerpt, source identity, source version, and available provenance.
- Entity result: canonical label, ontology type, concise description, and relationship/source counts only if returned.
- Chunk/evidence result: excerpt and provenance reference; never imply a full document match if only a chunk matched.

**Filters**
- Content type.
- Source or source group.
- Ontology class (if class metadata is returned by the search contract).
- Supported temporal filter.
- Classification/access filter only where server-provided and meaningful to the user.
- Clear all and visible active-filter chips.

Filters must be server-backed when they affect result membership. Client-side filtering is acceptable only for already-loaded display fields and must be labeled accordingly.

**Ranking**
- Default to the platform's selected ranking.
- Present BM25/dense/hybrid selection only when those retrieval modes are enabled by the environment and accepted by the API.
- Do not show fabricated dense or hybrid scores.
- Keep technical diagnostics behind a disclosure panel for authorized engineering/evaluation users.
- If one retrieval leg is unavailable, show a partial/degraded status and explain which leg did not contribute.

### 6.4 Search result inspector

Selecting a result opens a right-hand inspector without losing the result list:

- title and canonical identity;
- result kind;
- ontology class, if known;
- source and source version;
- snippet / matching passage;
- provenance identifiers and hashes where appropriate for the audience;
- processing run or freshness details only if supplied;
- available actions: open document, open entity, explore graph, view ontology class.

Do not show internal identifiers as the primary label. Make them copyable in a technical-details section.

### 6.5 Search states

| State | Required behavior |
|---|---|
| Initial | Explain what can be searched; focus query input |
| Loading | Keep query visible; show stable skeletons |
| Empty | Show query and active filters; suggest removing filters or broadening query |
| No access | Explain that content is unavailable without exposing its existence or metadata |
| Partial retrieval | Identify the missing retrieval capability; show only valid returned results |
| Error | Preserve query and filters; offer retry |
| Stale/refreshing | Keep prior results visibly marked as stale until replacement succeeds |
| Provenance unresolved | Show unresolved/partial evidence state; never synthesize a source chain |

### 6.6 Search acceptance criteria

- Query, filters, and selected result survive route transitions and browser back/forward.
- Search results show only fields present in the active public contract.
- Provenance navigation is deterministic and does not invent page numbers or source coordinates.
- BM25 remains a valid mode when vector retrieval is unavailable.
- Partial retrieval is distinguishable from complete retrieval.
- Search and provenance requests remain tenant-isolated by server authorization.

## 7. Ontology workspace

### 7.1 Purpose and mental model

Ontology is the semantic map of the knowledge domain. It answers:

- What kinds of things does the platform recognize?
- How are classes related?
- Which properties describe a class or entity?
- Which entities are instances of a class?
- Which documents provide evidence for an entity or classification?

Ontology navigation must be useful even when the user does not understand OWL terminology. Technical details can be disclosed progressively.

### 7.2 Proposed layout

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Ontology                                             Search classes…       │
├──────────────────────┬────────────────────────────────┬────────────────────┤
│ CLASS HIERARCHY      │ CLASS: Organization            │ DETAILS            │
│                      │                                │                    │
│ ▾ Thing              │ Organization                   │ Identifier         │
│   ▾ Entity           │ Organizations are entities…    │ Description        │
│     ▾ Agent          │                                │ Namespace          │
│       Person         │ SUBCLASSES                      │                    │
│       Organization  ◉│  Company                        │ Properties         │
│     Concept          │  Government Agency              │  name              │
│   Document           │                                │  jurisdiction      │
│                      │ PROPERTIES                     │  foundedAt         │
│ [Classes] [Props]    │  name · string                  │                    │
│                      │  memberOf · Organization        │ Instances          │
│                      │                                │  128 entities      │
│                      │ [View class graph] [View instances]                │
└──────────────────────┴────────────────────────────────┴────────────────────┘
```

The labels and sample fields above are illustrative. Render only class/property information actually exposed by the ontology contract.

### 7.3 Ontology navigation

**Hierarchy**
- Expand/collapse class tree nodes.
- Clearly distinguish root classes, subclasses, equivalent classes, and other relation kinds if the API supplies them.
- Preserve expansion state while navigating class details.
- Provide a breadcrumb path from the root to the selected class.
- Search/filter the class tree by label and identifier.

**Class detail**
- Human-readable label and description.
- Stable identifier/IRI in a secondary technical section.
- Parent and child classes.
- Declared properties grouped by semantic role when available.
- Equivalent/disjoint class relationships only when explicitly represented by the API.
- Instance count only if supplied by the server and consistent with the current authorization/temporal context.
- Links to instances and a class-focused graph view.

**Property detail**
- Property label and description.
- Property kind (e.g. object/data/annotation property) when the source contract distinguishes it.
- Domain and range.
- Cardinality or constraints only when explicitly supplied.
- Example values/instances only when the user is authorized to see them.
- Navigate from a property to classes that use it.

**Instances**
- Show a paginated list/table of entities belonging to the selected class.
- Columns should be class-aware but configurable.
- Selecting an instance opens the shared entity inspector and offers graph exploration.
- Do not load every instance into the ontology graph.

### 7.4 Ontology visualization

Provide a dedicated “Class graph” mode, but keep the hierarchy tree and table as primary accessible navigation surfaces.

Visual rules:
- Class nodes use one consistent shape and semantic color family.
- Properties/relationships use distinct edge styles and labels.
- Subclass-of, equivalent-to, and domain-specific object properties must not look identical.
- Use a legend with text labels.
- Show direction on directed relations.
- Avoid rendering every property by default; allow the user to select relation categories.
- Provide fit, zoom, reset, and keyboard navigation.
- Selecting a node opens the same class inspector as the tree view.

### 7.5 Ontology states

- Ontology unavailable: explain that semantic browsing is not enabled in this environment.
- Empty ontology: distinguish genuinely empty from failed retrieval.
- Class not found: show a stable not-found state; do not substitute a similarly named class silently.
- Partial metadata: label missing descriptions/properties rather than inventing them.
- Unauthorized class/instance: rely on server filtering and avoid leaking hidden counts or identifiers.
- Large hierarchy: virtualize tree rendering and load branches lazily.

### 7.6 Ontology acceptance criteria

- Every class and property shown has a stable platform identifier.
- Tree and graph views represent the same selected class.
- Parent/child and property direction are unambiguous.
- Instance lists are paginated and server-authorized.
- Entity-to-class and class-to-instance navigation preserve the workbench context.
- Ontology graph has a keyboard- and screen-reader-accessible tree/list alternative.

## 8. Graph workspace

### 8.1 Purpose and mental model

Graph is the instance-level map of relationships between concrete knowledge entities. It answers:

- What is this entity connected to?- Through which relationship?
- How was the relationship established?
- Which sources support it?
- What is the shortest relevant path between two entities?

Graph exploration is an investigation surface, not a decorative network visualization.

### 8.2 Start with a focus entity

Never load the whole graph. Entry points are:
- Search result → Explore graph.
- Ontology class → View instances / class-filtered graph.
- Document or evidence → Open related entities.
- Entity detail → Explore relationships.

If the user opens Graph without a focus entity, present a search/selection state rather than a random or unbounded graph.

### 8.3 Proposed layout

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Graph  /  Acme Corporation                    Depth 1 ▾   Layout ▾   Reset │
├───────────────────┬────────────────────────────────┬───────────────────────┤
│ EXPLORE           │                                │ ENTITY INSPECTOR      │
│                   │          [Person]              │ Acme Corporation     │
│ Find entity…      │              │                 │ Organization         │
│                   │       [FOUNDED_BY]             │                      │
│ Entity types      │              │                 │ Description          │
│ ☑ Organization    │        [Company]               │                      │
│ ☑ Person          │          /     \               │ Relationships        │
│ ☑ Concept         │ [LOCATED_IN] [OWNS]             │ 18 total             │
│                   │      /           \             │                      │
│ Relationship      │ [Country]       [Product]       │ Evidence             │
│ ☑ related-to      │                                │ Source A · Source B  │
│ ☑ founded-by      │                                │                      │
│ ☑ located-in      │                                │ [Open entity]        │
│                   │                                │ [View ontology class]│
│                   │                                │ [View sources]       │
├───────────────────┴────────────────────────────────┴───────────────────────┤
│ Selected: Acme Corporation  ·  6 visible nodes  ·  7 visible relationships │
│ [List view] [Export selection*]                              *if supported │
└────────────────────────────────────────────────────────────────────────────┘
```

All entities and relations above are illustrative; actual graph semantics and counts must come from the platform.

### 8.4 Graph interactions

**Node selection**
- Click or keyboard-select a node to open its inspector.
- Visually distinguish selected, focused, hovered, and expanded nodes.
- Keep labels readable; truncate long labels with a tooltip/inspector.
- Provide a stable entity identifier in technical details.

**Neighbor expansion**
- Expand one hop from a selected node.
- Let the user select relationship categories and entity types before expansion.
- Make expansion bounded and explicit (e.g. depth 1, then depth 2); no unbounded traversal.
- Deduplicate entities and relationships across expansion requests.
- Indicate loading at the selected node and allow cancellation.
- If result limits are reached, show a clear truncation notice and offer narrower filters.

**Edge selection**
- Selecting an edge opens a relationship inspector with:
  - source entity and target entity;
  - relationship type and direction;
  - attributes/properties supplied by the platform;
  - provenance/evidence references;
  - temporal validity/observation metadata where supplied;
  - status/derivation category if the platform distinguishes persisted, inferred, or retrieval-time relationships.
- Never make an edge look more certain than the underlying data supports.
- Distinguish “no evidence returned” from “relationship has no evidence”.

**Path exploration**
- Allow the user to choose a target entity and request a path only if the API supports it.
- Display each hop with its relationship type.
- Make path direction and hop count explicit.
- Show evidence per edge, not only for the path as a whole.
- Do not invent shortest-path semantics or path ranking; use the platform contract.

**Canvas controls**
- Fit graph, zoom in/out, reset layout, pause/restart layout if the chosen renderer supports it.
- Toggle labels and relation categories.
- Switch between force-directed and hierarchical layouts only if both are implemented and usable.
- Keep layout changes local; they do not change graph facts.

### 8.5 Graph visual encoding

Use a deliberately small visual vocabulary:
- Entity type: shape and restrained color family, with a visible legend.
- Relationship type: edge label and optional line style.
- Selected entity: accent outline and higher contrast.
- Focus path: emphasized edges; unrelated context subdued but still legible.
- Inferred or retrieval-time relation: visually distinct from persisted relation only when the API provides that classification.
- Missing/unknown type: neutral fallback with a text label.

Do not assign semantic meaning to colors that the API does not provide. Do not encode confidence as node size unless a defined, comparable confidence measure is available.

### 8.6 Graph list alternative

Every graph state must have a corresponding table/list:
- entities and their types;
- outgoing/incoming relationships;
- relationship type and target/source;
- evidence availability;
- pagination or bounded result count.

This is required for accessibility, large graphs, and users who prefer structured inspection.

### 8.7 Graph states

| State | Required behavior |
|---|---|
| No focus entity | Prompt to search/select an entity |
| Loading neighbors | Preserve existing graph; mark expanding node |
| No neighbors | Explain no relationships were returned for selected filters |
| Partial graph | Show returned subgraph and explain truncation/failed legs |
| Graph unavailable | Keep entity details and list view usable where possible |
| Stale graph | Mark snapshot as stale if API provides freshness metadata |
| Missing provenance | Show relationship but explicitly mark evidence unavailable |
| Traversal limit | Show server limit and offer narrower filters or lower depth |
| Error | Keep graph state; allow retry without resetting the investigation |

### 8.8 Graph acceptance criteria

- Graph opens from a real entity identifier and starts with a bounded subgraph.
- Every visible node and edge maps to a platform-returned entity/relationship.
- Edge direction and relationship type are explicit.
- The inspector exposes available provenance and temporal metadata.
- Expansion is bounded, cancellable, and deduplicates results.
- A list/table alternative represents the same selected subgraph.

#### List/table as a first-class graph alternative

The Graph / List switch is a view toggle over the same bounded result set, not a separate query or a fallback that loses selection.

- Place the switch in the graph workspace toolbar and expose it through keyboard-accessible workspace controls.
- Keep root entity, active filters, temporal context, loaded neighborhood, and selected entity/relationship synchronized when switching views.
- Selecting a row highlights/selects the corresponding graph node or edge when switching back; selecting a graph object scrolls to and selects its row in list mode.
- Provide clearly grouped Nodes and Relationships tables. Relationship rows include source, predicate, target, direction, and evidence availability when returned.
- Use server pagination/cursor loading where supported. For already-loaded graph data, virtualize long tables; never fetch an unbounded tenant-wide relationship list to populate the alternative.
- Display traversal limits, partial results, and “load more” state consistently in both views.
- If graph rendering is unavailable or disabled, list mode remains a usable inspection surface with the same entity and edge inspectors.

- Graph layout never changes the underlying knowledge state.

## 9. Shared entity and relationship inspector

Search, Ontology, and Graph should reuse a common inspector model.

### Entity inspector

Sections:
1. **Identity:** label, entity kind, stable identifier.
2. **Semantic type:** ontology class and class path.
3. **Description:** platform-supplied description/summary.
4. **Properties:** typed values, with null/unknown distinct from empty.
5. **Relationships:** incoming/outgoing counts or returned subset.
6. **Evidence:** source documents, chunks, and provenance references.
7. **Temporal context:** validity/observation/publication fields where returned.
8. **Technical details:** IDs, namespaces, processing references, and diagnostics for authorized users.

Actions:
- Open ontology class.
- Explore graph around this entity.
- Search for this entity.
- Open supporting documents/evidence.
- Copy canonical identifier.

### Relationship inspector

Sections:
- subject/source and object/target;
- predicate/type;
- direction;
- properties/qualifiers;
- evidence references;
- temporal metadata;
- persisted/inferred/retrieval-time status if known.

The inspector should not claim that an edge is a verified real-world fact solely because it is present in a graph response.

#### Relationship inspector contract and evidence interaction

A selected edge is a first-class selectable object, not merely a line decoration. When returned by the public API, show:

1. **Identity:** stable relationship ID, copyable in technical details.
2. **Endpoints:** subject/source and object/target labels, each linking to its canonical entity route.
3. **Predicate:** human-readable relationship type and canonical predicate identifier where useful.
4. **Direction:** explicit “subject —predicate→ object” presentation; never rely on arrow geometry alone.
5. **Attributes:** returned qualifiers/properties with typed values; distinguish absent, null, and empty.
6. **Confidence:** value, scale, and interpretation only when the API defines them; never invent a percentage or normalize an undocumented score.
7. **Status/origin:** persisted, inferred, or retrieval-time only when explicitly represented by the contract.
8. **Temporal context:** validity/observation timestamps and active as-of context when supplied.
9. **Evidence:** source/chunk references, evidence status, and supported location metadata returned for the relationship.

“Provenance one click away” means the selected edge inspector presents an **Evidence** section immediately, without requiring another navigation mode. Each evidence row exposes source title/identity, source version, excerpt or supported snippet, and an “Open source” action. If the API returns only an opaque evidence reference, show its availability/status and open the platform-backed evidence detail; do not manufacture a snippet or source location. Returning from evidence restores the same graph root, selected edge, and inspector state. Missing evidence is explicitly labeled “No evidence reference returned”.


## 10. Cross-workspace journeys

These journeys define the intended product behavior more clearly than isolated screen specifications.

### Journey A — Search to graph

1. User searches for “European pricing policy”.
2. Results include a document and one or more entities, if returned by search.
3. User opens a document result and inspects its provenance.
4. User opens a related entity from the evidence/entity panel.
5. Entity inspector shows its ontology class and available evidence.
6. User selects “Explore graph”.
7. Graph opens centered on that entity with bounded one-hop context.
8. User expands one relationship and opens the supporting document.
9. Browser back returns to the same graph state, then the same search result context.

### Journey B — Ontology to instances

1. User opens Ontology.
2. Searches for a class or browses the hierarchy.
3. Selects a class and reads its description, parent/child relationships, and properties.
4. Opens the paginated instance list.
5. Selects an entity and opens the entity inspector.
6. Opens Graph to explore that instance's relationships.
7. Returns to the class and instance list without losing the tree selection.

### Journey C — Graph to evidence

1. User opens Graph from an entity.
2. Selects a relationship.
3. Relationship inspector shows its type and evidence references.
4. User opens an evidence reference.
5. Evidence/document view opens at the location supported by the public contract.
6. User can return to the same selected edge.

### Journey D — Search with partial retrieval

1. User submits a query.
2. BM25 returns valid results while dense retrieval is unavailable or times out.
3. UI displays the available results and a clear partial-retrieval indicator.
4. Technical details identify the missing leg only if authorized.
5. User can still inspect documents and provenance.
6. The UI does not label the response as a complete hybrid result.

## 11. Interaction, state, and navigation rules

### 11.1 State ownership

- **Server state:** TanStack Query (or the existing agreed server-state mechanism) owns API results, caching, cancellation, and invalidation.
- **Workbench interaction state:** selected entity, open inspector, expanded tree nodes, graph layout, and local panel visibility.
- **URL state:** shareable query, filters, selected stable IDs, and supported view state.
- **Session/security state:** remains under the existing session/tenant boundary. Never copy tokens into URLs or feature state.
- **Visual layout state:** graph coordinates and panel sizes are presentation state, not canonical platform data.

Do not duplicate authoritative tenant context in feature-local storage. Tenant switching and cache isolation must follow the existing session/tenant decisions.

#### State ownership boundaries and KnowledgeContext limits

`KnowledgeContext` is a small navigation/context envelope, **not** a global application store or god object. It may carry only the serializable context needed to move between workspaces: safe current/return route, selected stable entity/class/evidence IDs, intentionally shared query/filter state, and a temporal-view reference when supported.

It must not own API result collections, graph node/edge payloads, caches, request lifecycles, authorization decisions, graph coordinates, open-panel state, or feature-specific transient UI state.

- Search owns query execution, result pages, ranking metadata, and search-local selection.
- Ontology owns tree expansion, class/property detail, and paginated instance state.
- Graph owns its bounded neighborhood, layout coordinates, selected node/edge, expansion requests, and graph-local filters.
- Entity/evidence features own their detail payloads and provenance presentation.
- Router owns shareable navigation state; TanStack Query (or the established equivalent) owns server state and cache lifecycle.
- Shared navigation exposes typed intents and stable IDs, not mutable references to feature stores.

Prefer a small typed context object and explicit navigation parameters. Add fields only when at least two real journeys need them. Feature modules remain independently testable and must not import another feature's internal store. Tenant/session context remains in the existing authentication boundary and is never copied into `KnowledgeContext`.


### 11.2 Navigation context

Use typed navigation intents rather than feature modules reaching into each other's internal state. Conceptual intents:

- `OpenSearch(query, filters, resultId?)`
- `OpenEntity(entityId, returnTo?)`
- `OpenOntologyClass(classId, returnTo?)`
- `OpenGraph(entityId, depth?, returnTo?)`
- `OpenEvidence(evidenceRef, returnTo?)`

These are UI navigation concepts, not claims about existing API methods.

### 11.3 Browser behavior

- Back/forward restores navigable state.
- Refreshing a deep link either restores the view or shows a clear unavailable/not-found state.
- Opening a link in a new tab preserves only safe, non-sensitive context.
- Do not serialize huge graph payloads or all node coordinates into the URL.
- Use a bounded local navigation history for return-to-origin behavior.

## 12. API and contract requirements

The UI must consume the public Platform API only. Do not call Neo4j, Cassandra, Kafka, internal search services, or ontology stores directly from the browser.

Before each feature is marked integrated, the platform/API owners must confirm the relevant public contract. This proposal intentionally does not invent endpoint paths or response schemas for ontology and graph operations.

### Search contract checklist

- Search request, supported filters, sort, pagination, and temporal semantics.
- Explicit retrieval-mode/capability metadata.
- Result kind and stable resource identity.
- Source/source-version references.
- Provenance reference and supported evidence fields.
- Partial retrieval / per-leg failure semantics.
- No page/section display until the public contract provides those fields.

### Ontology contract checklist

- Ontology identity/version and namespace.
- Class list/tree with stable IDs and pagination/lazy loading.
- Class detail: labels, descriptions, parents, children.
- Property detail: type, domain, range, and constraints where modeled.
- Instance listing by class with pagination.
- Entity-to-class mapping.
- Authorization and temporal behavior.
- Explicit semantics for equivalent/disjoint/subclass relations if supported.

### Graph contract checklist

- Entity detail and stable entity identifiers.
- Bounded neighbor traversal with direction, relation filters, and pagination/limits.
- Relationship identity, type, direction, and attributes.
- Evidence/provenance references per relationship.
- Distinction between persisted, inferred, and retrieval-time relationships.
- Path query semantics and limits, if supported.
- Temporal semantics and freshness metadata.
- Partial-result and traversal-limit signaling.

### Contract rule

If the API does not expose a field, the UI must not derive it from internal storage or infer it from labels. Display “not available” or omit the field. Contract gaps should become explicit platform issues/ADRs rather than UI-only workarounds.

## 13. Security, tenancy, and provenance

- The platform is the authorization boundary. Hiding a button is not authorization.
- Tenant identity comes from the validated session/token context, not a caller-supplied header or query parameter.
- Every search, entity, ontology, graph, and evidence request must be authorized server-side.
- Client caches must be scoped to the authenticated session/tenant context and invalidated on session/tenant lifecycle changes.
- Do not persist sensitive query text, graph contents, or entity metadata in local storage by default.
- Avoid leaking hidden entity counts, names, or relationship metadata in empty/error messages.
- Provenance is rendered from platform-returned references; the UI must not reconstruct source chains.
- Classification and visibility labels are informational; server authorization remains decisive.
- Do not present inferred/retrieval-time relationships as persisted facts.
- Preserve temporal distinctions; do not silently fall back from a historical view to current data.

### 13.1 Threat-oriented security verification

Treat Search, Ontology, Graph, Entity, and Evidence as separate resource surfaces under one authorization boundary. The UI is not a security boundary; every API request and every returned reference must be authorized by the platform.

| Threat | Surface | Test case | Expected control |
|---|---|---|---|
| Cross-tenant data leak | `/entities/:id`, `/graph?entity=`, evidence refs | Tenant A requests Tenant B entity using a guessed ID | 404 with identical response shape; no metadata leakage |
| IDOR on provenance | Evidence-reference fetch | Enumerate evidence IDs across tenants | Server-side authorization on every evidence fetch; no client-only checks |
| Enumeration via autocomplete | Search suggestions | Rapid sequential queries across ID ranges | Rate-limited, authorization-scoped suggestions; no existence oracle |
| Token leakage via URL | Entity/graph routes | Inspect URL, history, referrer, copied links | No tokens or tenant authority in URLs; session state only |
| XSS via document content | Evidence/chunk rendering | Render source content containing script/HTML payloads | Treat content as text; sanitize explicitly supported rich text; CSP; no unsafe HTML injection |
| Graph injection | Node/edge labels and attributes | Return malicious markup in server-provided labels | Escape as text in canvas, tables, and inspectors |
| Cache poisoning/leakage | Client query cache | Switch tenant/session while stale data is cached | Cache keys partitioned by auth context; hard invalidation on logout, expiry, and tenant switch |
| CSRF/session misuse | Any mutation, if present | Cross-origin mutation attempt | Existing CSRF/SameSite controls; explicitly inventory whether this UI has mutations |
| Clickjacking | Whole application | Attempt iframe embedding | CSP `frame-ancestors` and/or `X-Frame-Options` per deployment policy |
| DoS/enumeration via expansion | Graph expansion | Deep/wide requests against a high-degree entity | Server depth/count/rate limits; bounded client rendering; actionable partial state |
| SSRF through evidence opening | Evidence “Open source” action | Attempt to make the platform fetch an attacker-controlled remote URL | The action opens platform-backed evidence detail only; never fetch an arbitrary client-supplied URL. If a future feature proxies remote sources, require a strict destination allow-list, redirect/IP-range validation, and platform-mediated fetch controls |

Add a negative-authorization test for every route/resource family. A tenant-switch browser test must verify that cached data, selected entity/edge, inspector contents, and provenance references from the previous tenant are cleared before the next tenant's data is rendered. Unknown and unauthorized entity IDs must be indistinguishable to the caller (404), and the same rule applies to nested relationship/evidence references.

The Evidence **Open source** action navigates to platform-backed evidence/document detail using a platform-returned reference; it does not ask the server to fetch a client-supplied remote URL. If remote fetching is introduced later, treat SSRF as a new security requirement and require destination allow-listing, redirect and resolved-IP validation, and platform-mediated fetch controls.

Before rollout, include automated authorization tests for each resource family, browser tests for tenant/session transitions, dependency and CSP checks under the existing application security policy, and manual review of URL/referrer and telemetry leakage. Unresolved security assumptions are release blockers, not follow-up polish.


## 14. Accessibility and responsive behavior

### Accessibility

- All actions available on graph nodes/edges must also be available through a keyboard-accessible list/tree/inspector.
- Visible focus and selected states.
- Semantic labels for nodes, edges, controls, filters, and status changes.
- Do not rely on color alone; combine color with shape, labels, and line style.
- Respect reduced-motion preferences; graph layout must not continuously animate by default.
- Announce graph expansion results and errors to assistive technology without flooding the live region.
- Ensure search filters, ontology tree, and inspector can be operated without a pointer.
- Provide sufficient contrast for node labels and edge labels.

### Responsive

- Desktop: three-column workbench with collapsible rails.
- Tablet: main content plus one drawer/inspector at a time.
- Mobile: list-first experience; graph canvas is optional and supports a focused entity view. Do not squeeze a desktop graph workspace into a narrow viewport.
- Preserve the same entity/evidence navigation semantics across breakpoints.

## 15. Technical implementation guidance

### 15.1 Feature modules

Keep one web application and organize features by capability:

```text
apps/web/src/
  app/                  # router, shell, route boundaries
  features/
    search/
      components/      hooks/
      routes/
      model/
    ontology/
      components/
      hooks/
      routes/
      model/
    graph/
      components/
      hooks/
      routes/
      model/
    entities/
      components/
      hooks/
      model/
    evidence/
      components/
      hooks/
      model/
  shared/
    navigation/
    inspectors/
    filters/
    provenance/
    design-system/
    api/
```

This is a proposed organization; align with the current repository structure before moving files. Avoid speculative shared abstractions until two consumers demonstrate the same stable need.

### 15.2 Graph rendering

Evaluate React Flow and a graph visualization library against:
- 100–300 node interaction performance on target hardware;
- edge label readability;
- directional edges and multiple relation types;
- keyboard navigation and accessible fallback;
- deterministic layout and stable node identity;
- incremental graph expansion;
- custom node/edge renderers;
- bundle size and maintenance activity.

Use React Flow if the product needs highly interactive, application-like node controls and custom inspectors. Consider Cytoscape.js if graph topology/layout performance and graph algorithms are the dominant requirements. A renderer is a view layer only; it must not become the graph data model.

Do not commit to a library until a small spike validates the actual graph payload and target interactions.

### 15.3 Large data sets

- Lazy-load ontology branches and instances.
- Paginate search results and instance tables.
- Request graph neighborhoods incrementally.
- Bound graph depth and node/edge count.
- Cancel stale requests when the selected root changes.
- Deduplicate entities/edges by stable platform identifiers.
- Avoid full-graph client caching.
- Keep rendering responsive during layout and expansion.

### 15.4 Observability

Capture client-side operational signals without collecting sensitive content:
- route and feature load failures;
- request duration and status class;
- graph expansion duration and returned node/edge counts;
- canceled/stale request counts;
- provenance resolution success/partial/unavailable;
- UI error-boundary events.

Do not log access tokens, raw document content, or unrestricted query text.

### 15.5 Initial performance budgets

These are **initial budgets to validate against the existing synapt API and the web renderer**, not guarantees before measurement. The proposal commits to instrumenting them, establishing a baseline, and reporting deviations before tuning.

| Area | Workload / measurement point | Initial budget |
|---|---|---:|
| Search | Submit → first result row rendered | p50 ≤ 400 ms; p95 ≤ 1.2 s; p99 ≤ 2.5 s |
| Search | Server-backed filter application | p95 ≤ 800 ms |
| Search | Autocomplete suggestion response/render | p95 ≤ 250 ms |
| Search | First paint of 50 already-received rows | ≤ 100 ms; result list virtualized |
| Graph | Focused subgraph, ≤ 200 nodes / ≤ 600 edges, payload available → interactive | p95 ≤ 1.5 s |
| Graph | Progressive expansion adding ≤ 100 nodes, response available → visible | p95 ≤ 800 ms |
| Graph | Layout switch without refetch | p95 ≤ 600 ms |
| Graph | Hard client cap per focused view | 1,000 nodes / 5,000 edges; beyond this, switch to table and show “Refine to visualize” |
| Graph | Selection → local inspector populated | ≤ 100 ms |
| Graph | Provenance fetch after selection | p95 ≤ 600 ms |
| Ontology | Initial class tree, ≤ 2,000 classes | p95 ≤ 1 s |
| Ontology | Class detail/property panel | p95 ≤ 400 ms |
| Ontology | Server-supplied instance-count enrichment | Lazy; p95 ≤ 1 s; never blocks tree render |

For each workload and test environment, calculate percentiles over at least 1,000 measured requests after separating materially different workload classes; report p50/p95/p99 per class rather than pooling unlike workloads. Record sample count, warm/cold-cache condition, concurrency, payload-size band, browser/device, and environment with each result. Do not claim a p99 budget is met from fewer than 1,000 observations.

Measurement points must be recorded separately: API round-trip, payload transfer/parse, first content paint, renderer/layout, and interactive state. Graph budgets assume a representative developer laptop and must be validated on the project's agreed reference browser/device; record the actual test environment. The 1,000/5,000 cap is a defensive UI ceiling, not a recommended initial payload. The normal focused view remains at or below 200/600.

The graph list/table alternative uses the **light workspace surface and light-shell contrast tokens**, including its toolbar, rows, selection, focus, and inspector; dark-canvas tokens apply only to the graph visualization surface.

For graph payloads over the hard cap, do not silently discard edges or imply completeness. Retain the bounded result metadata, switch to the paginated/virtualized table alternative, and prompt the user to refine the focus, filters, or depth. The API should enforce limits too; client limits are defense in depth.

### 15.6 Product success metrics

These metrics are hypotheses to validate, not contractual commitments. Instrument the leading indicators immediately; define lagging targets only after a stable baseline.

**Leading indicators — instrument in the first release**
- **Time to first evidence:** median time from query submit to first evidence panel open. Establish a four-week baseline, then set a reduction target.
- **Cross-workspace transition rate:** percentage of sessions that visit at least two of Search, Ontology, and Graph.
- **Evidence-open rate:** percentage of graph edge selections followed by a provenance view within 30 seconds.
- **Partial-retrieval incidence:** percentage of search/graph requests marked partial, reviewed alongside abandonment and task completion.
- **Query refinement rate:** average query refinements per successful evidence open; interpret with task success to avoid rewarding premature stopping.
- **List-alternative adoption:** percentage of graph sessions that open the table alternative; use as a signal to tune graph defaults, not as a failure metric.

**Lagging indicators — define after baseline**
- Completion rate for the four end-to-end journeys in Section 10.
- Return rate for users who complete a multi-workspace journey compared with single-workspace sessions.
- Support/feedback volume tagged to discovery, normalized by active usage.

Event names, required properties, sampling, retention, and dashboards belong in the implementation epic and telemetry schema, not this design proposal. Events should contain feature/action/status and coarse duration/count buckets only—never raw query text, document content, entity labels, access tokens, or unredacted identifiers. Metrics are reviewed as tenant-safe aggregates and must follow existing consent, retention, and access policy.


## 16. Delivery plan

This work follows the current project direction: stabilize the first end-to-end vertical slice, then polish and expand the user experience. Do not let this proposal become a reason to widen the current implementation rush.

### Stage 0 — Stabilize existing slice

- Keep the existing ingestion and BM25 search flow working.
- Resolve known vertical-slice integration and provenance gaps.
- Confirm the current app shell, session boundary, and real API transport.
- Add regression coverage before changing shared navigation or design primitives.

**Exit:** existing demo can be repeated; search/provenance regressions are caught automatically.

### Stage 1 — Shared discovery shell and entity inspector

- Refine workbench shell, breadcrumbs, tabs, panel behavior, and design tokens.
- Introduce shared entity/relationship inspector contracts.
- Add typed cross-workspace navigation intents.
- Create fixture-backed component stories/tests for loading, empty, partial, and error states.

**Exit:** search can open a stable entity detail view and return without losing query state.

### Stage 2 — Search polish

- Improve result hierarchy, filters, source metadata, and provenance disclosure.
- Add entity result actions and partial-retrieval presentation.
- Keep engineering diagnostics progressive and permission-aware.

**Exit:** a user can find a result, understand its source, and open a related entity.

### Stage 3 — Ontology browser

- Confirm ontology API contract and capability availability.
- Implement class tree, class detail, property view, and paginated instances.
- Add class graph visualization only after tree/list navigation works.
- Link instances to shared entity detail and graph.

**Exit:** class → instance → entity → graph journey works against a real or contract-conformant API.

### Stage 4 — Graph exploration

- Validate graph contract and real data/provenance quality.
- Spike and select graph renderer.
- Implement focused graph, bounded neighbor expansion, edge inspector, and list alternative.
- Add path exploration only if the API contract supports it.

**Exit:** entity → neighbors → relationship evidence → source journey works repeatedly.

### Stage 5 — Cross-workspace polish

- Validate all four journeys in Section 10.
- Keyboard/accessibility and responsive review.
- Performance test with representative graph sizes.
- Visual consistency and interaction polish.
- Browser-level E2E across Search, Ontology, Graph, and Evidence.

**Exit:** the user can move between the three views without losing security, temporal, or provenance context.

## 17. Quality gates and acceptance matrix

| Area | Acceptance gate |
|---|---|
| Visual consistency | Light shell/dark canvas transition specified; all semantic token pairs pass WCAG 2.2 AA on each surface |
| Search | Query/filter state retained; provenance is truthful; partial retrieval explicit |
| Ontology | Stable class/property identity; tree and graph agree; instances are paginated |
| Graph | Bounded traversal; stable node/edge identity; edge evidence inspectable; switching between graph and list preserves the selected entity/edge and inspector state |
| Cross-navigation | Search ↔ entity ↔ ontology ↔ graph ↔ evidence round trip |
| Security | Threat matrix passes cross-tenant, IDOR, enumeration, XSS, cache, URL/referrer, and expansion-abuse tests |
| Provenance | No fabricated source, page, relationship, or evidence |
| Temporal | Historical context retained; no silent fallback |
| Accessibility | Keyboard/list alternatives for all graph interactions |
| Performance | Search/ontology/graph budgets instrumented; graph cap and list fallback verified at target sizes |
| Reliability | Loading/empty/partial/unavailable/error states covered by tests |

### Minimum end-to-end acceptance scenario

Given a tenant-authorized user and a known entity with an ontology class, at least one graph relationship, and supporting source evidence:

1. Search returns the entity or a document containing it.
2. User opens the entity inspector.
3. Inspector shows its ontology class and available source references.
4. User opens the ontology class and can navigate to its instances.
5. User opens Graph centered on the entity.
6. User expands a relationship and selects an edge.
7. Relationship inspector displays the relationship type and returned evidence references.
8. User opens a supporting source/evidence view.
9. Browser back returns to the same graph selection and then the original search context.
10. A user from another tenant cannot retrieve the entity, relationship, or evidence using guessed identifiers.

The test must run against a contract-conformant mock at design time and against the real public API at integration time.

## 18. Open decisions

These items must be resolved before the corresponding implementation is treated as integrated:

1. Which ontology read capabilities are exposed by the public Platform API, and which are currently operational?
2. Which graph read capabilities are exposed (entity detail, neighbors, path, relationship evidence), with what limits?
3. How are persisted, inferred, and retrieval-time graph relationships represented in the contract?
4. Which temporal semantics are supported consistently across search, ontology, graph, and evidence?
5. Which fields are available for source-level and chunk-level provenance, including page/section location?
6. Which graph renderer best fits the real payload and accessibility requirements?
7. Which user capabilities permit technical retrieval diagnostics and graph metadata?

Track these as API/design decisions with platform owners. Do not solve them by coupling the UI to backend implementation details.

## 19. Recommended first implementation slice

After the existing vertical slice is stable, implement this narrow, demonstrable journey:

**Search result → entity inspector → ontology class → graph around entity → relationship evidence → source document.**

It exercises the three requested workspaces while keeping scope bounded. It also forces the most important shared contracts—entity identity, ontology classification, relationship identity, provenance, and navigation context—to become explicit.

The first polished release should favor a small number of real, explainable relationships over a visually impressive but semantically unreliable graph.

---

## Appendix A — Design review checklist

- [ ] The three workspaces share the same shell and navigation model.
- [ ] Search is the primary entry point; Graph never opens an unbounded whole-tenant graph.
- [ ] Ontology class hierarchy remains usable without a graph canvas.
- [ ] Every entity and relationship has stable identity from the API.
- [ ] Every displayed relationship has an explicit type and direction.
- [ ] Evidence/provenance availability is visible and honest.
- [ ] Partial retrieval and partial graph results are explicit.
- [ ] Tenant and temporal context survive navigation.
- [ ] No UI behavior depends on direct access to internal services or stores.
- [ ] Keyboard and list/tree alternatives exist for graph interactions.
- [ ] Existing ingestion/search vertical slice remains regression-tested.

## Appendix B — Terminology

| Term | Meaning in this proposal |
|---|---|
| Entity | A concrete instance/thing represented by the platform |
| Ontology class | A semantic type used to classify entities |
| Property | A typed attribute or semantic relation defined by the ontology |
| Relationship / edge | A concrete connection between entity instances |
| Evidence | A platform-returned reference to source material supporting a result or relationship |
| Provenance | The traceable origin and processing lineage of derived knowledge |
| Focus entity | The entity around which a bounded graph view is requested |
| Partial retrieval | A search result where one or more retrieval capabilities did not contribute |
| Derived view | A search or graph projection that must not be confused with canonical source state |

## Appendix C — Competitive research and renderer decision

The competitive benchmark and frontend architecture research is maintained separately in [Synanton Knowledge Workspace — Competitive UX and Frontend Architecture Research](../research/knowledge-workspace-competitive-benchmark.md).

The research refines the implementation direction as follows:

- Product direction: one modular Knowledge Workspace connecting Search, Entity, Graph, Ontology, and Evidence.
- Graph UX: focused subgraphs, progressive expansion, explicit relationship inspection, and a synchronized list/table alternative.
- Ontology UX: read-first class/property/instance browsing; authoring remains a separately gated future capability.
- Frontend architecture: feature-owned state, typed domain contracts, a narrow navigation context, and a renderer-neutral graph adapter.
- Renderer decision: **not yet selected**. Benchmark Cytoscape.js and AntV G6 using the same Synanton API-shaped fixture and existing performance budgets. Keep Sigma.js as a scale alternative. Reactodia and Zazuko Graph Explorer are semantic references but declare LGPL-2.1 and require license review before adoption.
- Current repository fact: apps/web/package.json does not currently declare a graph-renderer dependency. Do not describe any candidate as already integrated into the active workbench.

The renderer spike is a decision gate, not a commitment to replace an existing implementation. If the simpler candidate meets the functional, accessibility, and performance requirements, prefer it over a rewrite.
