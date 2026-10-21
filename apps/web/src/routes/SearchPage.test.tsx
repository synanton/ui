import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ApiClient } from "@synanton/api-client";
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
});
