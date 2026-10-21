import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ApiClient } from "@synanton/api-client";
import { IngestionPage } from "./IngestionPage";

describe("IngestionPage browser upload", () => {
  it("uploads a file sequentially and polls the operation to completion", async () => {
    const client = {
      request: vi.fn(async ({ path }: { path: string }) => {
        if (path.startsWith("/v1/operations/")) {
          return { data: { status: "SUCCEEDED", outcome: "FULL" }, status: 200, requestId: "req" };
        }
        if (path.startsWith("/v1/ingestion-runs/")) {
          return { data: { status: "COMPLETED" }, status: 200, requestId: "req" };
        }
        throw new Error(`unexpected request ${path}`);
      })
    } as unknown as ApiClient;
    const upload = vi.fn(async () => ({ run_id: "run-1", operation_id: "op-1" }));

    render(<IngestionPage client={client} upload={upload} />);
    const file = new File(["hello"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Upload files"), { target: { files: [file] } });

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("doc.pdf")).toBeTruthy();
    expect(await screen.findByText("Uploaded")).toBeTruthy();
    expect(await screen.findByText("SUCCEEDED")).toBeTruthy();
    expect(await screen.findByText("COMPLETED")).toBeTruthy();
    expect(client.request).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET", path: "/v1/operations/op-1" })
    );
  });
});
