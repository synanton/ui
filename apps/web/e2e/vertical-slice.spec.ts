import { expect, test } from "@playwright/test";
import { access } from "node:fs/promises";

/**
 * P0 browser regression for synanton/platform#537.
 *
 * Required environment:
 *   E2E_BASE_URL          deployed UI origin (for example, homelab NodePort)
 *   E2E_USERNAME          principal accepted by the demo tenant issuer
 *   E2E_FIXTURE_PDF       deterministic PDF containing E2E_SEMANTIC_QUERY
 *   E2E_SEMANTIC_QUERY    phrase that is semantically retrievable but not an exact lexical match
 *
 * The fixture must be generated/pinned by the test setup. Do not use the
 * legacy corpus: this test uploads its own document into the demo tenant.
 */
const baseURL = process.env.E2E_BASE_URL;
const username = process.env.E2E_USERNAME;
const fixturePdf = process.env.E2E_FIXTURE_PDF;
const semanticQuery = process.env.E2E_SEMANTIC_QUERY;

test.describe("vertical slice: upload → dense search → provenance", () => {
  test.skip(
    !baseURL || !username || !fixturePdf || !semanticQuery,
    "Set E2E_BASE_URL, E2E_USERNAME, E2E_FIXTURE_PDF, and E2E_SEMANTIC_QUERY"
  );

  test("uploads a tenant-scoped PDF and retrieves its dense evidence", async ({ page }) => {
    await access(fixturePdf!);

    // Real mode obtains a tenant-bound token through POST /v1/auth/tenant.
    await page.goto(new URL("/ingestion", baseURL).toString());
    await page.getByRole("heading", { name: "Sign in" }).waitFor();
    await page.getByLabel("Username").fill(username!);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("heading", { name: "Ingestion" })).toBeVisible();

    // The UI waits for the ingestion operation to reach a terminal state.
    await page.getByLabel("Upload files").setInputFiles(fixturePdf!);
    await expect(page.getByText("Uploaded", { exact: true })).toBeVisible({
      timeout: 180_000
    });

    // The first search can legitimately return the projection-rebuild 503.
    // Retry through the UI until the asynchronous projection is queryable.
    await page.goto(new URL("/search", baseURL).toString());
    const query = page.getByLabel("Query");
    await query.fill(semanticQuery!);

    const searchButton = page.getByRole("button", { name: "Search" });
    const resultHeading = page.locator("main h2").first();
    const indexingNotice = page.getByText(/Search index is updating/i);

    await expect.poll(async () => {
      await searchButton.click();
      if (await indexingNotice.isVisible().catch(() => false)) {
        return "indexing";
      }
      return await resultHeading.isVisible().catch(() => false) ? "ready" : "pending";
    }, {
      timeout: 180_000,
      intervals: [2_000, 4_000, 6_000]
    }).toBe("ready");

    // Dense must contribute to the result; a lexical-only hit is not sufficient.
    const attribution = page.getByLabel("Retrieval attribution").first();
    await expect(attribution).toContainText(/Dense #\d+/);
    await expect(attribution).toContainText(/RRF #\d+/);

    await page.getByRole("button", { name: "Provenance" }).first().click();
    const provenancePanel = page.getByRole("region", { name: /Provenance for/i });
    await expect(provenancePanel).toBeVisible();
    await expect(provenancePanel.getByText(/source sha256/i)).toBeVisible();
    await expect(provenancePanel.getByText(/chunk sha256/i)).toBeVisible();
    await expect(provenancePanel.getByText(/Pages \d+/)).toBeVisible();

    // Follow-up required by #537: assert the uploaded manifest reaches EMBEDDED.
    // Add this through the stable manifest/read API contract once its route and
    // response schema are confirmed; do not guess an endpoint in this browser spec.
  });
});
