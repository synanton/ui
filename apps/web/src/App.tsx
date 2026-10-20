import * as React from "react";
import { tenantId as brandTenantId, verifiedIdentityFrom } from "@synanton/api-client";
import { SessionStorageTokenStore, TabSession } from "@synanton/api-client/tab-session";
import {
  AppShell,
  AuthBoundary,
  ErrorBoundary,
  TabTenantContextProvider,
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
  const runtime = React.useMemo(() => {
    const locked = brandTenantId(tenantId);
    const session = new TabSession({
      identity: verifiedIdentityFrom({ tenantId: locked, principalId: "alice" }),
      store: new SessionStorageTokenStore("synanton.accessToken"),
      issueToken: async (next) => `mock-token-${next}`,
      channelName: "synanton-tenant"
    });
    return {
      session,
      platform: createMockPlatform(session),
      tenant: new TabTenantContextProvider(session)
    };
  }, [tenantId]);

  React.useEffect(() => () => runtime.session.close(), [runtime]);

  return (
    <TenantContextProvider value={runtime.tenant}>
      <AuthBoundary status="authenticated">
        <ErrorBoundary>
          <AppShell
            productName="Synanton"
            navItems={navItems}
            activeHref={path}
            capabilities={["ingestion", "search"]}
          >
            {path === "/search"
              ? <SearchPage client={runtime.platform.client} />
              : <IngestionPage client={runtime.platform.client} />}
          </AppShell>
        </ErrorBoundary>
      </AuthBoundary>
    </TenantContextProvider>
  );
}
