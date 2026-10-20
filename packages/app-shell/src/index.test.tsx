import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { tenantId, verifiedIdentityFrom } from "@synanton/api-client";
import { TabSession } from "@synanton/api-client/tab-session";
import {
  AppShell,
  AuthBoundary,
  CapabilityGate,
  ErrorBoundary,
  MockTenantContextProvider,
  TabTenantContextProvider,
  TenantContextProvider,
  filterNavigationItems,
  useTenantContext,
  type TenantContextPort
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

  it("accepts a swapped tenant adapter without changing call sites", () => {
    const adapter: TenantContextPort = {
      getSnapshot: () => ({
        activeTenantId: tenantId("tenant-a"),
        authorizedTenantIds: [tenantId("tenant-a")],
        status: "ready"
      }),
      requestTenantSelection: async () => {}
    };
    function Probe() {
      const tenant = useTenantContext();
      return <span>tenant:{tenant.getSnapshot().activeTenantId}</span>;
    }

    render(
      <TenantContextProvider value={adapter}>
        <Probe />
      </TenantContextProvider>
    );

    expect(screen.getByText("tenant:tenant-a")).toBeTruthy();
  });

  it("accepts the tab-session provider without changing call sites", () => {
    let token: string | null = null;
    const session = new TabSession({
      identity: verifiedIdentityFrom({ tenantId: tenantId("tenant-a"), principalId: "alice" }),
      store: { get: () => token, set: (next) => { token = next; } },
      issueToken: async () => "token-a"
    });
    const provider = new TabTenantContextProvider(session);

    function Probe() {
      const tenant = useTenantContext();
      return <span>tab:{tenant.getSnapshot().activeTenantId}</span>;
    }

    render(
      <TenantContextProvider value={provider}>
        <Probe />
      </TenantContextProvider>
    );

    expect(screen.getByText("tab:tenant-a")).toBeTruthy();
  });

  it("mock tenant provider rejects selection outside the authorized set", async () => {
    const provider = new MockTenantContextProvider({
      activeTenantId: tenantId("tenant-a"),
      authorizedTenantIds: [tenantId("tenant-a"), tenantId("tenant-b")],
      status: "ready"
    });

    await expect(provider.requestTenantSelection(tenantId("tenant-c"))).rejects.toThrow();
    await provider.requestTenantSelection(tenantId("tenant-b"));
    expect(provider.getSnapshot().activeTenantId).toBe(tenantId("tenant-b"));
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
