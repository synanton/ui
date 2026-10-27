import * as React from "react";
import type { ApiClient } from "@synanton/api-client";

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

export function OntologyPanel(_props: {
  client: ApiClient;
  onUnauthorized?: () => Promise<boolean>;
}) {
  return (
    <section aria-label="Ontology">
      <h1>Ontology</h1>
    </section>
  );
}
