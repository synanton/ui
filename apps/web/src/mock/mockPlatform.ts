import {
  BearerAuthAttachment,
  createMockApiClient,
  type ApiClient
} from "@synanton/api-client";
import type { TabSession } from "@synanton/api-client/tab-session";

export interface MockPlatform {
  client: ApiClient;
}

/**
 * Design-time platform used by the A-pre shell. Tenant authority is the verified
 * identity; tenant B intentionally receives no results.
 */
interface SearchFixture {
  tenantId: string;
  hit: {
    object_id: string;
    title: string;
    snippet: string;
    provenance_ref: string;
  };
}

// Tenant-A fixtures only. Tenant-B's empty result must come from the filter,
// not from the absence of fixtures for every tenant.
const searchFixtures: SearchFixture[] = [
  {
    tenantId: "demo",
    hit: {
      object_id: "ref-1:0",
      title: "Software Project Management",
      snippet: "When the map and the terrain disagree, trust the terrain.",
      provenance_ref: "/v1/knowledge/ref-1:0/provenance"
    }
  }
];

export function createMockPlatform(session: TabSession): MockPlatform {
  const { client, transport } = createMockApiClient(
    session,
    new BearerAuthAttachment(() => session.currentToken()),
    () => session.signal()
  );

  transport.on("POST", "/v1/ingestion-runs", () => ({
    status: 202,
    data: { run_id: "run-1", operation_id: "op-1" },
    requestId: "req-run"
  }));
  transport.on("GET", "/v1/operations/op-1", () => ({
    status: 200,
    data: { status: "SUCCEEDED", outcome: "FULL", progress: { completed: 1, total: 1 } },
    requestId: "req-op"
  }));
  transport.on("GET", "/v1/ingestion-runs/run-1", () => ({
    status: 200,
    data: {
      status: "COMPLETED",
      result: { discovered: 1, changed: 1, unchanged: 0, deleted: 0, failed: 0, skipped: 0, quarantined: 0, cancelled: 0 }
    },
    requestId: "req-run-detail"
  }));
  transport.on("POST", "/v1/search", (_request, verified) => ({
    status: 200,
    data: {
      // Load-bearing filter: removing it makes the tenant-B test fail.
      results: searchFixtures
        .filter((fixture) => fixture.tenantId === verified.tenantId)
        .map((fixture) => fixture.hit)
    },
    requestId: "req-search"
  }));
  transport.on("GET", "/v1/knowledge/ref-1:0/provenance", () => ({
    status: 200,
    data: {
      object_id: "ref-1:0",
      content_ref_id: "ref-1",
      source_version_ids: ["v1"],
      content_cache_reference: "v1:tenant_id=demo&artifact_id=a1&digest=sha256%3Aabc",
      source_uri: "file:///books/sample.pdf",
      source_sha256: "abc",
      chunk_sha256: "def",
      processing_run_id: "p1"
    },
    requestId: "req-prov"
  }));

  return { client };
}
