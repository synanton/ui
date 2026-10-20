import * as React from "react";
import { Button, Surface } from "@synanton/ui-primitives";
import type { ApiClient } from "@synanton/api-client";

interface Hit {
  object_id: string;
  title: string;
  snippet: string;
  provenance_ref: string;
}

interface SearchResponse {
  results: Hit[];
}

interface Provenance {
  object_id: string;
  content_ref_id: string;
  source_version_ids: string[];
  content_cache_reference: string;
  source_uri: string;
  source_sha256: string;
  chunk_sha256: string;
  processing_run_id: string;
}

export function SearchPage({ client }: { client: ApiClient }) {
  const [query, setQuery] = React.useState("When the map and the terrain disagree");
  const [hits, setHits] = React.useState<Hit[] | null>(null);
  const [provenance, setProvenance] = React.useState<Provenance | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const response = await client.request<SearchResponse>({
        method: "POST",
        path: "/v1/search",
        body: { query }
      });
      setHits(response.data.results);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Search failed");
    }
  }

  async function openProvenance(hit: Hit) {
    const response = await client.request<Provenance>({
      method: "GET",
      path: hit.provenance_ref
    });
    setProvenance(response.data);
  }

  return (
    <Surface>
      <h1>Search</h1>
      <form onSubmit={search}>
        <label htmlFor="query">Query</label>
        <input id="query" value={query} onChange={(event) => setQuery(event.target.value)} />
        <Button type="submit">Search</Button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {hits
        ? hits.length === 0
          ? <p>No results.</p>
          : (
            <ul>
              {hits.map((hit) => (
                <li key={hit.object_id}>
                  <h2>{hit.title}</h2>
                  <p>{hit.snippet}</p>
                  <Button onClick={() => openProvenance(hit)}>Provenance</Button>
                </li>
              ))}
            </ul>
          )
        : null}
      {provenance ? (
        <section aria-label="Provenance">
          <h2>Provenance</h2>
          <dl>
            <dt>source</dt><dd>{provenance.source_uri}</dd>
            <dt>content ref</dt><dd>{provenance.content_ref_id}</dd>
            <dt>source versions</dt><dd>{provenance.source_version_ids.join(", ")}</dd>
            <dt>content cache ref</dt><dd>{provenance.content_cache_reference}</dd>
            <dt>chunk sha256</dt><dd>{provenance.chunk_sha256}</dd>
          </dl>
          <p>Page ranges are not exposed by the public `/v1` contract yet (#338).</p>
        </section>
      ) : null}
    </Surface>
  );
}
