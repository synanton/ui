import * as React from "react";
import type { ApiClient } from "@synanton/api-client";
import { requestWithReauth } from "../real/requestWithReauth";

export interface OntologyEntity {
  entity_id: string;
  canonical_form: string;
  entity_class: string;
  type: string;
  soft_subtype?: string | null;
  entity_kind: string;
  df: number;
  df_band: string;
}

interface OntologyResponse {
  entities: OntologyEntity[];
  count: number;
}

const CLASSES = ["hard", "soft_glossary", "soft_doctrinal"] as const;
type EntitySection = typeof CLASSES[number];

const BANDS = [
  { value: "all", label: "All" },
  { value: "graph_useful", label: "Useful (3–15)" },
  { value: "df_1", label: "Seen once" },
  { value: "pair", label: "Seen twice" },
  { value: "df_16_50", label: "Background (16–50)" },
  { value: "df_over_50", label: "Ubiquitous (>50)" }
];

const CLASS_OPTIONS = [
  { value: "all", label: "All classes" },
  { value: "hard", label: "Hard" },
  { value: "soft_glossary", label: "Soft glossary" },
  { value: "soft_doctrinal", label: "Soft doctrinal" }
];

const DEFAULT_EXPANDED: Record<EntitySection, boolean> = {
  hard: true,
  soft_glossary: false,
  soft_doctrinal: false
};

export function OntologyPanel({ client, onUnauthorized }: {
  client: ApiClient;
  onUnauthorized?: () => Promise<boolean>;
}) {
  const [entities, setEntities] = React.useState<OntologyEntity[]>([]);
  const [dfBand, setDfBand] = React.useState("all");
  const [entityClass, setEntityClass] = React.useState("all");
  const [expanded, setExpanded] = React.useState(DEFAULT_EXPANDED);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  React.useEffect(() => {
    let current = true;
    const params = new URLSearchParams({ df_band: dfBand, entity_class: entityClass });
    setLoading(true);
    setError(null);
    requestWithReauth(
      () => client.request<OntologyResponse>({
        method: "GET",
        path: `/v1/demo/ontology/all?${params.toString()}`
      }),
      onUnauthorized
    )
      .then((response) => {
        if (!current) {
          return;
        }
        setEntities(response.data.entities);
      })
      .catch((failure) => {
        if (current) {
          setError(failure instanceof Error ? failure.message : "Ontology failed to load");
        }
      })
      .finally(() => {
        if (current) {
          setLoading(false);
        }
      });
    return () => {
      current = false;
    };
  }, [client, dfBand, entityClass, onUnauthorized, reloadToken]);

  function toggle(section: EntitySection) {
    setExpanded((previous) => ({ ...previous, [section]: !previous[section] }));
  }

  if (loading && entities.length === 0) {
    return (
      <section aria-label="Ontology">
        <h1>Ontology</h1>
        <p data-testid="ontology-loading" role="status">Loading ontology…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Ontology">
        <h1>Ontology</h1>
        <p role="alert">{error}</p>
        <button type="button" onClick={() => setReloadToken((value) => value + 1)}>Retry</button>
      </section>
    );
  }

  return (
    <section aria-label="Ontology">
      <h1>Ontology</h1>
      <p>
        <strong data-testid="ontology-total">{entities.length}</strong> entities
      </p>
      <label htmlFor="df_band">df_band</label>
      <select id="df_band" value={dfBand} onChange={(event) => setDfBand(event.target.value)}>
        {BANDS.map((band) => <option key={band.value} value={band.value}>{band.label}</option>)}
      </select>
      <label htmlFor="entity_class">entity_class</label>
      <select id="entity_class" value={entityClass} onChange={(event) => setEntityClass(event.target.value)}>
        {CLASS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {entities.length === 0 ? <p data-testid="ontology-empty">No ontology entities for this filter.</p> : null}
      {CLASSES.map((section) => {
        const rows = entities.filter((entity) => entity.entity_class === section);
        return (
          <section key={section} aria-label={section}>
            <button
              type="button"
              aria-expanded={expanded[section]}
              onClick={() => toggle(section)}
            >
              {section} (<span>{rows.length}</span>)
            </button>
            <ul hidden={!expanded[section]}>
              {rows.map((entity) => (
                <li key={entity.entity_id} data-testid="ontology-row">
                  <span>{entity.canonical_form}</span>
                  <span>df {entity.df}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </section>
  );
}
