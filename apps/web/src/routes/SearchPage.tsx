import * as React from "react";
import { Button, Surface } from "@synanton/ui-primitives";
import { ApiClientError, type ApiClient } from "@synanton/api-client";

interface Hit {
  object_id: string;
  title: string;
  snippet: string;
  provenance_ref: string;
  final_rank?: number;
  final_score?: number;
  bm25_rank?: number | null;
  bm25_contribution?: number;
  dense_rank?: number | null;
  dense_contribution?: number;
  legs_present?: string[];
}

interface SearchResponse {
  query_type?: string;
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

export function SearchPage({ client, initialQuery = "When the map and the terrain disagree", onUnauthorized }: {
  client: ApiClient;
  initialQuery?: string;
  onUnauthorized?: () => Promise<boolean>;
}) {
  const [query, setQuery] = React.useState(initialQuery);
  const [hits, setHits] = React.useState<Hit[] | null>(null);
  const [queryType, setQueryType] = React.useState<string | null>(null);
  const [openProvenanceId, setOpenProvenanceId] = React.useState<string | null>(null);
  const [provenance, setProvenance] = React.useState<Provenance | null>(null);
  const [provenanceError, setProvenanceError] = React.useState<string | null>(null);
  const [provenanceLoading, setProvenanceLoading] = React.useState(false);
  const provenanceRequest = React.useRef(0);
  const [error, setError] = React.useState<string | null>(null);
  const [transient, setTransient] = React.useState<string | null>(null);

  async function requestSearch() {
    return client.request<SearchResponse>({
      method: "POST",
      path: "/v1/demo/search",
      body: { query }
    });
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setTransient(null);
    try {
      let response;
      try {
        response = await requestSearch();
      } catch (failure) {
        if (failure instanceof ApiClientError
            && failure.code === "AUTHENTICATION_REQUIRED"
            && onUnauthorized) {
          const refreshed = await onUnauthorized();
          if (!refreshed) {
            throw failure;
          }
          response = await requestSearch();
        } else {
          throw failure;
        }
      }
      setHits(response.data.results);
      setQueryType(response.data.query_type ?? null);
      setOpenProvenanceId(null);
      setProvenance(null);
      setProvenanceError(null);
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.code === "REQUEST_ABORTED") {
        setTransient("Tenant changed; the in-flight request was cancelled.");
        return;
      }
      setError(failure instanceof Error ? failure.message : "Search failed");
    }
  }

  async function openProvenance(hit: Hit) {
    if (openProvenanceId === hit.object_id) {
      provenanceRequest.current += 1;
      setOpenProvenanceId(null);
      setProvenance(null);
      setProvenanceError(null);
      setProvenanceLoading(false);
      return;
    }

    const request = ++provenanceRequest.current;
    setOpenProvenanceId(hit.object_id);
    setProvenance(null);
    setProvenanceError(null);
    setProvenanceLoading(true);
    try {
      const response = await client.request<Provenance>({
        method: "GET",
        path: hit.provenance_ref
      });
      if (request !== provenanceRequest.current) {
        return;
      }
      setProvenance(response.data);
    } catch (failure) {
      if (request !== provenanceRequest.current) {
        return;
      }
      setProvenanceError(failure instanceof Error ? failure.message : "Provenance failed");
    } finally {
      if (request === provenanceRequest.current) {
        setProvenanceLoading(false);
      }
    }
  }

  return (
    <Surface>
      <h1>Search</h1>
      <form onSubmit={search}>
        <label htmlFor="query">Query</label>
        <input id="query" value={query} onChange={(event) => setQuery(event.target.value)} />
        {queryType ? <span className="syn-query-type" aria-label="Query type">{queryType}</span> : null}
        <Button type="submit">Search</Button>
      </form>
      {transient ? <p role="status">{transient}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {hits
        ? hits.length === 0
          ? <p>No results.</p>
          : (
            <ul>
              {hits.map((hit) => {
                const open = openProvenanceId === hit.object_id;
                return (
                  <li key={hit.object_id}>
                    <h2>{hit.title}</h2>
                    <p>{hit.snippet}</p>
                    {hit.final_rank !== undefined ? (
                      <p className="syn-attribution" aria-label="Retrieval attribution">
                        BM25 {hit.bm25_rank === null || hit.bm25_rank === undefined ? "—" : `#${hit.bm25_rank}`}
                        {" · "}Dense {hit.dense_rank === null || hit.dense_rank === undefined ? "—" : `#${hit.dense_rank}`}
                        {" · "}RRF #{hit.final_rank}
                      </p>
                    ) : null}
                    <Button
                      aria-expanded={open}
                      onClick={() => openProvenance(hit)}
                    >
                      {open ? "Hide provenance" : "Provenance"}
                    </Button>
                    {open ? (
                      <section aria-label={`Provenance for ${hit.title}`}>
                        <h3>Provenance</h3>
                        {provenanceLoading ? <p role="status">Loading provenance…</p> : null}
                        {provenanceError ? <p role="alert">{provenanceError}</p> : null}
                        {provenance ? (
                          <dl>
                            <dt>source</dt><dd>{provenance.source_uri}</dd>
                            <dt>content ref</dt><dd>{provenance.content_ref_id}</dd>
                            <dt>source versions</dt><dd>{provenance.source_version_ids.join(", ")}</dd>
                            <dt>content cache ref</dt><dd>{provenance.content_cache_reference}</dd>
                            <dt>source sha256</dt><dd>{provenance.source_sha256}</dd>
                            <dt>chunk sha256</dt><dd>{provenance.chunk_sha256}</dd>
                            <dt>processing run</dt><dd>{provenance.processing_run_id}</dd>
                          </dl>
                        ) : null}
                        <p>Page ranges are not exposed by the public `/v1` contract yet (#338).</p>
                      </section>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )
        : null}
    </Surface>
  );
}
