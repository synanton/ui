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
import { IngestionPage, type RunRef } from "./routes/IngestionPage";
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
  const uploadSourceReady = React.useRef(false);

  const claims = React.useMemo(() => tokenClaims(token), [token]);
  const configuredTenant = real ? claims.tenantId ?? devAuthConfig.tenant : MOCK_TENANT_ID;
  const effectiveTenant = tenantId ?? configuredTenant;
  const principalId = real ? claims.subject ?? devAuthConfig.user : "alice";

  const requestedPath = initialPath ?? browserPath(real ? "/search" : "/ingestion");
  // The root still lands on Search; both tabs are valid in the real shell.
  const path = real && requestedPath === "/" ? "/search" : requestedPath;
  const navItems = [
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

  React.useEffect(() => {
    uploadSourceReady.current = false;
  }, [effectiveTenant]);

  async function ensureUploadSource(
    sourceId: string,
    connectorId: string,
    token: string | null
  ): Promise<void> {
    const response = await fetch(`${apiBase}/v1/sources`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        source_id: sourceId,
        connector_id: connectorId,
        connector_type: "upload",
        source_endpoint: `upload://${sourceId}`,
        capability_flags: []
      })
    });
    if (response.status !== 200 && response.status !== 201 && response.status !== 409) {
      throw new Error(`Source registration failed (${response.status})`);
    }
  }

  async function uploadFile(
    file: File,
    sourceId: string,
    connectorId: string,
    onProgress: (percent: number) => void
  ): Promise<RunRef> {
    const token = runtime?.session.currentToken() ?? null;
    if (!uploadSourceReady.current) {
      await ensureUploadSource(sourceId, connectorId, token);
      uploadSourceReady.current = true;
    }
    return new Promise<RunRef>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${apiBase}/v1/ingestion-runs`);
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 202) {
          try {
            resolve(JSON.parse(xhr.responseText) as RunRef);
          } catch {
            reject(new Error("Invalid upload response"));
          }
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Upload failed (network error)"));
      const form = new FormData();
      form.append("connector_id", connectorId);
      form.append("source_id", sourceId);
      form.append("resource_id", file.webkitRelativePath || file.name);
      form.append("file", file);
      xhr.send(form);
    });
  }

  async function handleLogin(username: string) {
    setLoginError(null);
    try {
      const result = await login(apiBase, username, devAuthConfig.tenant);
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
            capabilities={["ingestion", "search"]}
          >
            {path === "/search"
              ? (
                <SearchPage
                  client={runtime.client}
                  initialQuery={real ? "linear algebra and calculus" : undefined}
                />
              )
              : <IngestionPage client={runtime.client} upload={real ? uploadFile : undefined} />}
          </AppShell>
        </ErrorBoundary>
      </AuthBoundary>
    </TenantContextProvider>
  );
}
