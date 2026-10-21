import * as React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";
import { LoginPage } from "./routes/LoginPage";

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
}

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("web shell (A-pre)", () => {
  it("routes from the browser URL when no initialPath is provided", () => {
    window.history.pushState({}, "", "/search");
    render(<App />);

    expect(screen.getByRole("link", { name: "Search" }).getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("heading", { name: "Ingestion" })).toBeNull();
  });

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
    expect(screen.getByText("abc")).toBeTruthy();
    expect(screen.getByText("p1")).toBeTruthy();
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

  it("renders the login when the real transport has no token", () => {
    render(<App initialPath="/search" real apiBase="" />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
  });

  it("prefills only the username from configuration", () => {
    render(<LoginPage onLogin={async () => {}} initialUsername="alice" />);
    expect((screen.getByLabelText("Username") as HTMLInputElement).value).toBe("alice");
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
  });

  it("falls back to login when the stored token is invalid", () => {
    sessionStorage.setItem("synanton.accessToken", "not-a-jwt");
    render(<App initialPath="/search" real apiBase="" />);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
  });

  it("renders the real search shell with the P0 query when a token is present", () => {
    sessionStorage.setItem(
      "synanton.accessToken",
      jwt({ sub: "alice", tenant_id: "tenant-a", exp: Math.floor(Date.now() / 1000) + 3600 })
    );
    render(<App initialPath="/search" real apiBase="" />);
    expect(screen.getByRole("heading", { name: "Search" })).toBeTruthy();
    expect((screen.getByLabelText("Query") as HTMLInputElement).value).toBe("linear algebra and calculus");
    expect(screen.queryByRole("link", { name: "Ingestion" })).toBeNull();
  });
});
