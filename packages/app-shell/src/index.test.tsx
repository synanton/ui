import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AppShell,
  AuthBoundary,
  CapabilityGate,
  ErrorBoundary,
  MockTenantContextProvider,
  filterNavigationItems
} from "./index";

const navItems = [
  { id: "search", label: "Search", href: "/search" },
  { id: "admin", label: "Admin", href: "/admin", requiredCapabilities: ["admin"] }
];

describe("app-shell", () => {
  it("filters navigation items by required capability", () => {
    expect(filterNavigationItems(navItems, []).map((item) => item.id)).toEqual(["search"]);
    expect(filterNavigationItems(navItems, ["admin"]).map((item) => item.id))
      .toEqual(["search", "admin"]);
  });

  it("renders only permitted navigation and the active route", () => {
    render(
      <AppShell productName="Synanton" navItems={navItems} activeHref="/search" capabilities={[]}>
        <p>workbench content</p>
      </AppShell>
    );

    expect(screen.getByText("Search")).toBeTruthy();
    expect(screen.queryByText("Admin")).toBeNull();
    expect(screen.getByText("workbench content")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Search" }).getAttribute("aria-current")).toBe("page");
  });

  it("mock tenant provider rejects selection outside the authorized set", async () => {
    const provider = new MockTenantContextProvider({
      activeTenantId: "tenant-a",
      authorizedTenantIds: ["tenant-a", "tenant-b"],
      status: "ready"
    });

    await expect(provider.requestTenantSelection("tenant-c")).rejects.toThrow();
    await provider.requestTenantSelection("tenant-b");
    expect(provider.getSnapshot().activeTenantId).toBe("tenant-b");
  });

  it("capability gate hides children without the capability", () => {
    const { rerender } = render(
      <CapabilityGate capabilities={[]} required={["admin"]} fallback={<span>denied</span>}>
        <span>secret</span>
      </CapabilityGate>
    );
    expect(screen.getByText("denied")).toBeTruthy();

    rerender(
      <CapabilityGate capabilities={["admin"]} required={["admin"]}>
        <span>secret</span>
      </CapabilityGate>
    );
    expect(screen.getByText("secret")).toBeTruthy();
  });

  it("auth boundary renders loading, unauthenticated, and authenticated states", () => {
    const { rerender } = render(
      <AuthBoundary status="loading"><span>app</span></AuthBoundary>
    );
    expect(screen.getByText("Checking session")).toBeTruthy();

    rerender(
      <AuthBoundary status="unauthenticated" unauthenticatedFallback={<span>sign in</span>}>
        <span>app</span>
      </AuthBoundary>
    );
    expect(screen.getByText("sign in")).toBeTruthy();

    rerender(<AuthBoundary status="authenticated"><span>app</span></AuthBoundary>);
    expect(screen.getByText("app")).toBeTruthy();
  });

  it("error boundary renders the fallback for a throwing child", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const Boom = () => {
      throw new Error("boom");
    };

    render(
      <ErrorBoundary fallback={(error) => <span>{error.message}</span>}>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText("boom")).toBeTruthy();
    consoleError.mockRestore();
  });
});
