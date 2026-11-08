import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * P0 browser regression for synanton/platform#537.
 *
 * Required environment:
 *   E2E_BASE_URL    deployed UI origin (for example, homelab NodePort)
 *   E2E_USERNAME    principal accepted by the demo tenant issuer (default: demo-user)
 *
 * The fixture is generated per run with a random token so content addressing
 * cannot short-circuit the pipeline as UNCHANGED: every run exercises
 * upload -> extract -> chunk -> embed -> persist -> projection -> search.
 */
const baseURL = process.env.E2E_BASE_URL;
const username = process.env.E2E_USERNAME ?? "demo-user";
const appUrl = (pathname: string) => new URL(pathname, baseURL!).toString();

test.describe("vertical slice: upload -> dense search -> provenance", () => {
  test.skip(!baseURL, "Set E2E_BASE_URL to the deployed UI origin");

  test("uploads a unique document and retrieves dense evidence", async ({ page, request }) => {
    const token = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    const fileName = `e2e-${token}.txt`;
    const uniqueFact =
      `Project ${token} maintenance directive. The ${token} coolant loop requires a helium leak ` +
      "check every ninety days, and certified operators must log the seal pressure.";
    const semanticQuery = `${token} helium leak check interval`;

    const dir = await mkdtemp(path.join(tmpdir(), "synanton-e2e-"));
    const fixturePath = path.join(dir, fileName);
    await writeFile(fixturePath, uniqueFact);

    try {
      // Real mode obtains a tenant-bound token through POST /v1/auth/tenant;
      // the password-less LoginPage only needs the username.
      await page.goto(appUrl("/ingestion"));
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await page.getByLabel("Username").fill(username);
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("heading", { name: "Ingestion" })).toBeVisible();

      // The UI waits for the ingestion operation to reach a terminal state.
      await page.getByLabel("Upload files").setInputFiles(fixturePath);
      const row = page.locator("li", { hasText: fileName });
      await expect(row.getByText("Uploaded", { exact: true })).toBeVisible({ timeout: 180_000 });

      // Deterministic barrier: synflux reports the latest source version's
      // outbox acknowledgement, which the projection consumer writes only after
      // the Lucene rebuild completes. Do not guess with a sleep.
      const sessionToken = await page.evaluate(() => sessionStorage.getItem("synanton.accessToken"));
      expect(sessionToken).toBeTruthy();
      const statusUrl = appUrl("/v1/sources/ui-upload-browser/status");
      await expect.poll(async () => {
        const response = await request.get(statusUrl, {
          headers: { Authorization: `Bearer ${sessionToken}` }
        });
        if (!response.ok()) {
          return `http ${response.status()}`;
        }
        const status = await response.json();
        return status.status === "COMPLETED" && status.indexed === true
          ? "indexed"
          : `${status.status}/${status.indexed}`;
      }, {
        timeout: 240_000,
        intervals: [2_000, 4_000, 6_000]
      }).toBe("indexed");

      await page.goto(appUrl("/search"));
      await page.getByLabel("Query").fill(semanticQuery);
      const searchButton = page.getByRole("button", { name: "Search" });
      const uploadedResult = page.locator("#main-content li").filter({ hasText: token });
      const uploadedAttribution = uploadedResult.getByLabel("Retrieval attribution");
      await expect.poll(async () => {
        await searchButton.click();
        const text = await uploadedAttribution.first().textContent().catch(() => null);
        return text && /BM25 #\d+/.test(text) ? "ready" : "pending";
      }, {
        timeout: 120_000,
        intervals: [2_000, 4_000]
      }).toBe("ready");

      const firstResult = uploadedResult.first();
      await expect(firstResult).toContainText(token);
      const attribution = firstResult.getByLabel("Retrieval attribution");
      await expect(attribution).toContainText(/BM25 #\d+/);
      // CI runs without a GPU/TEI, so the compose stack disables embedding and
      // passes E2E_REQUIRE_DENSE=false. Locally/TEI-backed, Dense is mandatory.
      if (process.env.E2E_REQUIRE_DENSE !== "false") {
        await expect(attribution).toContainText(/Dense #\d+/);
      }
      await expect(attribution).toContainText(/RRF #\d+/);

      await firstResult.getByRole("button", { name: "Provenance" }).click();
      const provenancePanel = firstResult.getByRole("region", { name: /Provenance for/i });
      await expect(provenancePanel).toBeVisible();
      await expect(provenancePanel).toContainText(fileName);
      await expect(provenancePanel).toContainText(/source sha256/i);
      await expect(provenancePanel).toContainText(/chunk sha256/i);
      // Page geometry is PDF-only; a plain-text fixture has no page range. The
      // PDF page-breadcrumb assertion is covered by the acceptance evidence in
      // docs/acceptance/live-dense-2026-11-06.md.
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
