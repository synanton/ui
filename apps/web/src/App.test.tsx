import * as React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";

describe("web shell (A-pre)", () => {
  it("renders the ingestion route and the operation/run states", async () => {
    render(<App initialPath="/ingestion" />);

    expect(screen.getByRole("heading", { name: "Ingestion" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Submit sample ingestion" }));

    await waitFor(() => expect(screen.getByText("SUCCEEDED")).toBeTruthy());
    expect(screen.getByText("COMPLETED")).toBeTruthy();
    expect(screen.getByText("changed")).toBeTruthy();
  });

  it("renders search results and provenance for the verified tenant", async () => {
    render(<App initialPath="/search" />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByText("Software Project Management")).toBeTruthy());

    fireEvent.click(screen.getByRole("button", { name: "Provenance" }));
    await waitFor(() => expect(screen.getByText("file:///books/sample.pdf")).toBeTruthy());
    expect(screen.getByText(/Page ranges are not exposed/)).toBeTruthy();
  });

  it("does not leak tenant A results to tenant B", async () => {
    // Tenant-A fixtures exist; tenant B's empty result comes from the mock's
    // verified-tenant filter. Removing the filter makes this test fail.
    render(<App initialPath="/search" tenantId="other" />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() => expect(screen.getByText("No results.")).toBeTruthy());
    expect(screen.queryByText("Software Project Management")).toBeNull();
  });
});
