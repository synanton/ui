import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiClientError, type ApiClient } from "@synanton/api-client";
import { SearchPage } from "./SearchPage";

describe("SearchPage error states", () => {
  it("renders a retryable backend-unavailable message", async () => {
    const client = {
      request: vi.fn(async () => {
        throw new Error("Service unavailable (503)");
      })
    } as unknown as ApiClient;

    render(<SearchPage client={client} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Service unavailable"));
  });

  it("retries once on a 401 after silent re-auth", async () => {
    const unauthorized = new ApiClientError({
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required",
      retryable: false,
      requestId: "req-401"
    });
    const response = {
      data: {
        query_type: "mixed",
        results: [{
          object_id: "ref-1:0",
          title: "Software Project Management",
          snippet: "terrain",
          provenance_ref: "/v1/knowledge/ref-1:0/provenance",
          final_rank: 1,
          bm25_rank: 1,
          dense_rank: 2
        }]
      }
    };
    const client = {
      request: vi.fn()
        .mockRejectedValueOnce(unauthorized)
        .mockResolvedValueOnce(response)
    } as unknown as ApiClient;
    const onUnauthorized = vi.fn(async () => true);

    render(<SearchPage client={client} onUnauthorized={onUnauthorized} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByText("Software Project Management")).toBeTruthy());
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(client.request).toHaveBeenCalledTimes(2);
  });

  it("renders attribution and an em-dash when dense misses", async () => {
    const client = {
      request: vi.fn(async () => ({
        data: {
          query_type: "exact",
          results: [{
            object_id: "0110d461-0321-5085-874a-ec716a610909#0",
            title: "Globex Manufacturing",
            snippet: "IATF 16949",
            provenance_ref: "/v1/knowledge/0110d461-0321-5085-874a-ec716a610909:0/provenance",
            final_rank: 1,
            final_score: 0.047619,
            bm25_rank: 1,
            bm25_contribution: 0.047619,
            dense_rank: null,
            dense_contribution: 0,
            legs_present: ["bm25"]
          }]
        }
      }))
    } as unknown as ApiClient;

    render(<SearchPage client={client} />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => expect(screen.getByLabelText("Query type").textContent).toBe("exact"));
    expect(screen.getByLabelText("Retrieval attribution").textContent).toBe("BM25 #1 · Dense — · RRF #1");
  });
});
