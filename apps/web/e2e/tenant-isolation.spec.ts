import { expect, test, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * P1 tenant-isolation negatives for synanton/platform#539.
 *
 * Seeds two independent tenants through the public API, projects both, then
 * proves: search results never cross tenants, provenance is row-level scoped
 * (IDOR returns 404), and the X-Tenant-ID header cannot override the verified
 * token identity. Self-contained so it passes on the warm cluster and the cold
 * Compose stack.
 */
const baseURL = process.env.E2E_BASE_URL;
const appUrl = (pathname: string) => new URL(pathname, baseURL!).toString();
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

test.describe("tenant isolation", () => {
  test.skip(!baseURL, "Set E2E_BASE_URL to the deployed UI origin");

  test("search and provenance never cross tenant boundaries", async ({ request }) => {
    const runId = randomUUID().replace(/-/g, "").slice(0, 8);
    const tenantA = `iso-a-${runId}`;
    const tenantB = `iso-b-${runId}`;
    const tokenA = await mint(request, tenantA);
    const tokenB = await mint(request, tenantB);

    const dir = await mkdtemp(path.join(tmpdir(), "synanton-isolation-"));
    try {
      const docA = await seed(request, dir, tokenA, tenantA, `iso-a-${runId}`, "A");
      const docB = await seed(request, dir, tokenB, tenantB, `iso-b-${runId}`, "B");

      // Each tenant can retrieve its own secret.
      const ownA = await search(request, tokenA, docA.secret);
      expect(ownA.status()).toBe(200);
      const ownABody = await ownA.json();
      expect(ownABody.results.some((hit: Hit) => hit.object_id === docA.objectId)).toBeTruthy();

      const ownB = await search(request, tokenB, docB.secret);
      expect(ownB.status()).toBe(200);
      const ownBBody = await ownB.json();
      expect(ownBBody.results.some((hit: Hit) => hit.object_id === docB.objectId)).toBeTruthy();

      // Tenant A cannot observe tenant B's document or secret, on any leg.
      const crossA = await search(request, tokenA, docB.secret);
      expect(crossA.status()).toBe(200);
      const crossABody = await crossA.json();
      assertNoLeak(crossABody.results, docB);

      // And the reverse direction.
      const crossB = await search(request, tokenB, docA.secret);
      expect(crossB.status()).toBe(200);
      assertNoLeak(await crossB.json().then((body: { results: Hit[] }) => body.results), docA);

      // Provenance IDOR: the owner resolves it, the other tenant gets 404.
      const ownProvenance = await request.get(appUrl(docB.provenanceRef), {
        headers: auth(tokenB)
      });
      expect(ownProvenance.status()).toBe(200);
      const crossProvenance = await request.get(appUrl(docB.provenanceRef), {
        headers: auth(tokenA)
      });
      expect([403, 404]).toContain(crossProvenance.status());

      // The tenant header is not an authorization input.
      const headerSpoof = await request.post(appUrl("/v1/search"), {
        headers: { ...auth(tokenA), "X-Tenant-ID": tenantB },
        data: { query: docB.secret }
      });
      expect(headerSpoof.status()).toBe(400);
      expect(await headerSpoof.text()).toContain("TENANT_HEADER_NOT_SUPPORTED");

      // Unauthenticated access is rejected.
      const anonymous = await request.get(appUrl(docB.provenanceRef));
      expect(anonymous.status()).toBe(401);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

interface Hit {
  object_id: string;
  provenance_ref: string;
  title: string;
  snippet: string;
}

interface SeededDoc {
  objectId: string;
  provenanceRef: string;
  secret: string;
}

async function mint(request: APIRequestContext, tenant: string): Promise<string> {
  const response = await request.post(appUrl("/v1/auth/tenant"), {
    data: { principal_id: `e2e-${tenant}`, tenant_id: tenant, capabilities: [] }
  });
  expect(response.status()).toBe(200);
  return (await response.json()).token as string;
}

async function seed(
  request: APIRequestContext,
  dir: string,
  token: string,
  tenant: string,
  sourceId: string,
  label: string
): Promise<SeededDoc> {
  const secret = `TENANT${label}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const fileName = `${tenant}-secret.txt`;
  const fact = `Project ${secret} confidential calibration memo. The ${secret} valve must be sealed.`;
  const fixturePath = path.join(dir, fileName);
  await writeFile(fixturePath, fact);

  const source = await request.post(appUrl("/v1/sources"), {
    headers: auth(token),
    data: {
      source_id: sourceId,
      connector_id: "upload",
      connector_type: "upload",
      source_endpoint: `upload://${sourceId}`,
      capability_flags: []
    }
  });
  expect([201, 409]).toContain(source.status());

  const upload = await request.post(appUrl("/v1/ingestion-runs"), {
    headers: auth(token),
    multipart: {
      connector_id: "upload",
      source_id: sourceId,
      resource_id: `docs/${fileName}`,
      file: { name: fileName, mimeType: "text/plain", buffer: Buffer.from(fact) }
    }
  });
  expect(upload.status()).toBe(202);
  const created = await upload.json();

  await expect.poll(async () => {
    const run = await request.get(appUrl(`/v1/ingestion-runs/${created.run_id}`), {
      headers: auth(token)
    });
    if (!run.ok()) {
      return `http ${run.status()}`;
    }
    return (await run.json()).status as string;
  }, { timeout: 180_000, intervals: [1_000, 2_000, 4_000] }).toBe("COMPLETED");

  // Build this tenant's projection; retry the short Cassandra driver window.
  await expect.poll(async () => {
    const rebuild = await request.post(appUrl("/v1/search-projection/rebuild"), {
      headers: auth(token)
    });
    return rebuild.status();
  }, { timeout: 120_000, intervals: [1_000, 2_000, 4_000] }).toBe(200);

  const found = await search(request, token, secret);
  expect(found.status()).toBe(200);
  const body = await found.json();
  const hit = (body.results as Hit[]).find((row) => row.snippet?.includes(secret));
  expect(hit, `${tenant} must retrieve its own seeded document`).toBeTruthy();
  return { objectId: hit!.object_id, provenanceRef: hit!.provenance_ref, secret };
}

async function search(request: APIRequestContext, token: string, query: string) {
  return request.post(appUrl("/v1/search"), { headers: auth(token), data: { query } });
}

function assertNoLeak(results: Hit[], other: SeededDoc): void {
  const leakedRef = results.some(
    (hit) => hit.object_id === other.objectId || hit.provenance_ref === other.provenanceRef
  );
  expect(leakedRef, "another tenant's object/provenance must not appear").toBe(false);
  expect(JSON.stringify(results)).not.toContain(other.secret);
}
