import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * No development auth minting in Vite. The UI obtains a tenant-bound token
 * from the platform `POST /v1/auth/tenant` endpoint; the old `/v1/auth/login`
 * dev middleware is intentionally absent. The endpoint is demo-gated at the
 * platform (`security.demo-issuance.enabled`), not here.
 */
/** The removed dev-auth route fails explicitly instead of falling through to the SPA. */
function rejectLegacyLogin(): Plugin {
  return {
    name: "synanton-reject-legacy-login",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (req.method === "POST" && path === "/v1/auth/login") {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            code: "AUTHENTICATION_REQUIRED",
            detail: "Vite dev auth was removed; use POST /v1/auth/tenant"
          }));
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), "") as Record<string, string>;
  const synquest = fileEnv.VITE_SYNQUEST_URL || "http://192.168.10.32:30083";
  const synflux = fileEnv.VITE_SYNFLUX_URL || "http://192.168.10.32:30090";
  const security = fileEnv.VITE_SECURITY_URL || "http://localhost:18081";
  return {
    plugins: [rejectLegacyLogin()],
    server: {
      port: 5173,
      proxy: {
        "/v1/auth/tenant": { target: security, changeOrigin: true },
        "/v1/search": { target: synquest, changeOrigin: true },
        "/v1/demo/search": { target: synquest, changeOrigin: true },
        "/v1/demo/ontology": { target: synquest, changeOrigin: true },
        "/v1/demo/graph": { target: synquest, changeOrigin: true },
        "/v1/knowledge": { target: synquest, changeOrigin: true },
        "/v1/ingestion-runs": { target: synflux, changeOrigin: true },
        "/v1/sources": { target: synflux, changeOrigin: true },
        "/v1/operations": { target: synflux, changeOrigin: true }
      }
    }
  };
});
