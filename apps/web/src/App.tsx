import * as React from "react";
import {
  AppShell,
  AuthBoundary,
  ErrorBoundary,
  MockTenantContextProvider,
  TenantContextProvider
} from "@synanton/app-shell";
import { createMockPlatform } from "./mock/mockPlatform";
import { IngestionPage } from "./routes/IngestionPage";
import { SearchPage } from "./routes/SearchPage";

const navItems = [
  { id: "ingestion", label: "Ingestion", href: "/ingestion" },
  { id: "search", label: "Search", href: "/search" }
];

export interface AppProps {
  initialPath?: string;
  tenantId?: string;
}

/** A-pre scaffold: shared shell + traced routes, backed by mocks. */
export function App({ initialPath = "/ingestion", tenantId = "demo" }: AppProps) {
  const path = initialPath;
  const platform = React.useMemo(() => createMockPlatform(tenantId), [tenantId]);
  const tenant = React.useMemo(
    () => new MockTenantContextProvider({
      activeTenantId: tenantId,
      authorizedTenantIds: [tenantId],
      status: "ready"
    }),
    [tenantId]
  );

  return (
    <TenantContextProvider value={tenant}>
      <AuthBoundary status="authenticated">
        <ErrorBoundary>
          <AppShell
            productName="Synanton"
            navItems={navItems}
            activeHref={path}
            capabilities={["ingestion", "search"]}
          >
            {path === "/search"
              ? <SearchPage client={platform.client} />
              : <IngestionPage client={platform.client} />}
          </AppShell>
        </ErrorBoundary>
      </AuthBoundary>
    </TenantContextProvider>
  );
}
