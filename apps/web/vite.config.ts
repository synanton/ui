import crypto from "node:crypto";
import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * Development-only authentication placeholder.
 *
 * Replaced by `POST /v1/auth/tenant` (RS256 + JWKS, #340) with no client change.
 * Not a production path. Credentials and tenant come from `DEMO_AUTH_*`; if any
 * required value is missing the endpoint fails closed with 503
 * `DEMO_AUTH_NOT_CONFIGURED`.
 */
export interface DevAuthConfig {
  user: string;
  password: string;
  tenant: string;
  secret: string;
  uid?: number;
  gids?: number[];
}

export interface LoginResponse {
  status: number;
  body: Record<string, unknown>;
}

const REQUIRED_ENV = [
  "DEMO_AUTH_USER",
  "DEMO_AUTH_PASSWORD",
  "DEMO_AUTH_TENANT",
  "SYNANTON_JWT_SECRET"
] as const;

function mintToken(config: DevAuthConfig, subject: string): string {
  const b64 = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: "HS256", typ: "JWT" });
  const payload: Record<string, unknown> = {
    sub: subject,
    tenant_id: config.tenant,
    iat: now,
    exp: now + 3600
  };
  if (config.uid !== undefined) {
    payload.uid = config.uid;
  }
  if (config.gids !== undefined) {
    payload.gid = config.gids;
  }
  const encodedPayload = b64(payload);
  const signature = crypto
    .createHmac("sha256", config.secret)
    .update(`${header}.${encodedPayload}`)
    .digest("base64url");
  return `${header}.${encodedPayload}.${signature}`;
}

export function missingEnv(config: DevAuthConfig): string[] {
  return REQUIRED_ENV.filter((name) => {
    switch (name) {
      case "DEMO_AUTH_USER":
        return !config.user;
      case "DEMO_AUTH_PASSWORD":
        return !config.password;
      case "DEMO_AUTH_TENANT":
        return !config.tenant;
      case "SYNANTON_JWT_SECRET":
        return !config.secret;
    }
  });
}

function optionalInt(value: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

function optionalIntList(value: string): number[] | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isInteger(part));
  return parsed.length > 0 ? parsed : undefined;
}

export function resolveAuthConfig(env: Record<string, string | undefined>): DevAuthConfig {
  const read = (name: string) => env[name] ?? "";
  return {
    user: read("DEMO_AUTH_USER").trim(),
    password: read("DEMO_AUTH_PASSWORD"),
    tenant: read("DEMO_AUTH_TENANT").trim(),
    secret: read("SYNANTON_JWT_SECRET"),
    uid: optionalInt(read("DEMO_AUTH_UID")),
    gids: optionalIntList(read("DEMO_AUTH_GIDS"))
  };
}

/** Pure request handling used by the dev middleware and by tests. */
export function authenticate(config: DevAuthConfig, raw: string): LoginResponse {
  const missing = missingEnv(config);
  if (missing.length > 0) {
    return {
      status: 503,
      body: {
        code: "DEMO_AUTH_NOT_CONFIGURED",
        message: `Demo authentication is not configured: ${missing.join(", ")}`
      }
    };
  }
  let body: { username?: string; password?: string };
  try {
    body = JSON.parse(raw || "{}") as { username?: string; password?: string };
  } catch {
    return {
      status: 400,
      body: { code: "VALIDATION_ERROR", message: "Login body must be JSON" }
    };
  }
  if (body.username !== config.user || body.password !== config.password) {
    return {
      status: 401,
      body: { code: "AUTHENTICATION_REQUIRED", message: "Invalid demo credentials" }
    };
  }
  return {
    status: 200,
    body: {
      token: mintToken(config, config.user),
      expiresIn: 3600
    }
  };
}

/** Development login minted by the Vite dev server; the signing secret never reaches the browser. */
function devAuth(config: DevAuthConfig): Plugin {
  return {
    name: "synanton-dev-auth",
    configureServer(server) {
      const missing = missingEnv(config);
      if (missing.length > 0) {
        server.config.logger.warn(
          `Demo authentication is not configured (${missing.join(", ")}); ` +
            "/v1/auth/login will return 503 DEMO_AUTH_NOT_CONFIGURED."
        );
      }
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "").split("?")[0];
        if (req.method !== "POST" || path !== "/v1/auth/login") {
          next();
          return;
        }
        let raw = "";
        req.on("data", (chunk: Buffer) => {
          raw += chunk.toString("utf8");
        });
        req.on("end", () => {
          const response = authenticate(config, raw);
          res.setHeader("Content-Type", "application/json");
          res.statusCode = response.status;
          res.end(JSON.stringify(response.body));
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), "") as Record<string, string>;
  const config = resolveAuthConfig({ ...process.env, ...fileEnv });
  const synquest = fileEnv.VITE_SYNQUEST_URL || "http://192.168.10.32:30083";
  const synflux = fileEnv.VITE_SYNFLUX_URL || "http://192.168.10.32:30090";
  return {
    plugins: [devAuth(config)],
    server: {
      port: 5173,
      proxy: {
        "/v1/search": { target: synquest, changeOrigin: true },
        "/v1/knowledge": { target: synquest, changeOrigin: true },
        "/v1/ingestion-runs": { target: synflux, changeOrigin: true },
        "/v1/sources": { target: synflux, changeOrigin: true },
        "/v1/operations": { target: synflux, changeOrigin: true }
      }
    }
  };
});
