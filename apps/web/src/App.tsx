import * as React from "react";
import {
  BearerAuthAttachment,
  createRealApiClient,
  tenantId as brandTenantId,
  verifiedIdentityFrom
} from "@synanton/api-client";
import { SessionStorageTokenStore, TabSession } from "@synanton/api-client/tab-session";
import {
  AppShell,
  AuthBoundary,
  ErrorBoundary,
  TabTenantContextProvider,
  TenantContextProvider
} from "@synanton/app-shell";
import { createMockPlatform, MOCK_TENANT_ID } from "./mock/mockPlatform";
import { devAuthConfig } from "./real/authConfig";
import { login } from "./real/login";
import { tokenClaims } from "./real/tokenClaims";
import { IngestionPage } from "./routes/IngestionPage";
import { LoginPage } from "./routes/LoginPage";
import { SearchPage } from "./routes/SearchPage";

const TOKEN_KEY = "synanton.accessToken";

export interface AppProps {
  /** Test override; production derives the path from the browser URL. */
  initialPath?: string;
  tenantId?: string;
  /** Real transport mode: real `/v1` client + login page. Defaults to the mock shell for tests. */
  real?: boolean;
  apiBase?: string;
}

function browserPath(fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }
  const path = window.location.pathname;
  return path === "/search" || path === "/ingestion" ? path : fallback;
}

export function App({ initialPath, tenantId, real = false, apiBase = "" }: AppProps) {
  const [token, setToken] = React.useState<string | null>(() => {
    if (typeof sessionStorage === "undefined") {
      return null;
    }
    return sessionStorage.getItem(TOKEN_KEY);
  });
  const [loginError, setLoginError] = React.useState<string | null>(null);

  const claims = React.useMemo(() => tokenClaims(token), [token]);
  const configuredTenant = real ? claims.tenantId ?? devAuthConfig.tenant : MOCK_TENANT_ID;
  const effectiveTenant = tenantId ?? configuredTenant;
  const principalId = real ? claims.subject ?? devAuthConfig.user : "alice";

  const requestedPath = initialPath ?? browserPath(real ? "/search" : "/ingestion");
  // The real transport is search-only; keep the old redirect, but otherwise
  // honor the browser URL so /search never renders Ingestion.
  const path = real && (requestedPath === "/ingestion" || requestedPath === "/")
    ? "/search"
    : requestedPath;
  const navItems = real
    ? [{ id: "search", label: "Search", href: "/search" }]
    : [
        { id: "ingestion", label: "Ingestion", href: "/ingestion" },
        { id: "search", label: "Search", href: "/search" }
      ];

  const runtime = React.useMemo(() => {
    if (!effectiveTenant || (real && !principalId)) {
      return null;
    }
    const locked = brandTenantId(effectiveTenant);
    const session = new TabSession({
      identity: verifiedIdentityFrom({ tenantId: locked, principalId }),
      store: new SessionStorageTokenStore(TOKEN_KEY),
      issueToken: real
        ? async () => {
            const current = typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(TOKEN_KEY);
            if (!current) {
              throw new Error("No access token is available");
            }
            return current;
          }
        : async (next) => `mock-token-${next}`,
      channelName: "synanton-tenant"
    });
    return {
      session,
      client: real
        ? createRealApiClient(
            session,
            new BearerAuthAttachment(() => session.currentToken()),
            apiBase,
            () => session.signal()
          )
        : createMockPlatform(session).client,
      tenant: new TabTenantContextProvider(session)
    };
  }, [effectiveTenant, principalId, real, apiBase, token]);

  React.useEffect(() => () => runtime?.session.close(), [runtime]);

  async function handleLogin(username: string, password: string) {
    setLoginError(null);
    try {
      const result = await login(apiBase, username, password);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(TOKEN_KEY, result.token);
      }
      setToken(result.token);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Login failed");
    }
  }

  if (real && !token) {
    return <LoginPage onLogin={handleLogin} error={loginError} initialUsername={devAuthConfig.user} />;
  }

  if (!runtime) {
    return (
      <LoginPage
        onLogin={handleLogin}
        error={loginError ?? "Authentication is not configured. Set DEMO_AUTH_* on the dev server."}
        initialUsername={devAuthConfig.user}
      />
    );
  }

  return (
    <TenantContextProvider value={runtime.tenant}>
      <AuthBoundary status="authenticated">
        <ErrorBoundary>
          <AppShell
            productName="Synanton"
            navItems={navItems}
            activeHref={path}
            capabilities={real ? ["search"] : ["ingestion", "search"]}
          >
            {path === "/search"
              ? (
                <SearchPage
                  client={runtime.client}
                  initialQuery={real ? "linear algebra and calculus" : undefined}
                />
              )
              : <IngestionPage client={runtime.client} />}
          </AppShell>
        </ErrorBoundary>
      </AuthBoundary>
    </TenantContextProvider>
  );
}
