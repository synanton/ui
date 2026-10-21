import type {
  ApiErrorCode,
  ApiProblem,
  ApiRequest,
  ApiResponse,
  ApiTransport,
  TenantProblemCode,
  VerifiedIdentity
} from "./index";

const TENANT_PROBLEM_CODES = new Set<string>([
  "TENANT_IN_REQUEST_BODY",
  "TENANT_HEADER_NOT_SUPPORTED",
  "TENANT_CONTEXT_MISSING",
  "TENANT_ACCESS_DENIED",
  "TENANT_NOT_AVAILABLE",
  "TENANT_SELECTION_REJECTED",
  "TENANT_SWITCH_FAILED",
  "SWITCH_IN_PROGRESS",
  "REQUEST_ABORTED"
]);

function requestIdFrom(headers: Headers): string {
  const provided = headers.get("X-Request-Id");
  if (provided) {
    return provided;
  }
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }
  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function codeFor(status: number, bodyCode?: string): ApiErrorCode | TenantProblemCode | string {
  if (bodyCode && TENANT_PROBLEM_CODES.has(bodyCode)) {
    return bodyCode;
  }
  switch (status) {
    case 400:
      return "VALIDATION_ERROR";
    case 401:
      return "AUTHENTICATION_REQUIRED";
    case 403:
      return "AUTHORIZATION_DENIED";
    case 404:
      return "RESOURCE_NOT_FOUND";
    case 409:
      return "RESOURCE_CONFLICT";
    case 412:
      return "PRECONDITION_FAILED";
    case 429:
      return "RATE_LIMITED";
    case 503:
      return "DEPENDENCY_UNAVAILABLE";
    default:
      return "INTERNAL_ERROR";
  }
}

function messageFor(body: Record<string, unknown>, status: number): string {
  for (const field of ["detail", "message", "error"]) {
    const value = body[field];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return `HTTP ${status}`;
}

/**
 * Real transport for the platform `/v1` surface. The `ApiClient` attaches the
 * bearer credential before calling this transport; the transport never adds a
 * tenant header or body field. Non-2xx responses become `{ problem }` and are
 * normalised by `ApiClientImpl` into `ApiClientError` per ADR 0007.
 */
export class RealApiTransport implements ApiTransport {
  constructor(private readonly baseUrl = "") {}

  async send<T>(request: ApiRequest, _identity: VerifiedIdentity): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl.replace(/\/$/, "")}${request.path}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(request.headers ?? {})
    };
    if (request.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(url, {
      method: request.method,
      headers,
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: request.signal
    });
    const text = await response.text();
    let data: unknown;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    const requestId = requestIdFrom(response.headers);
    if (!response.ok) {
      const body = typeof data === "object" && data !== null ? data as Record<string, unknown> : {};
      const bodyCode = typeof body.code === "string" ? body.code : undefined;
      const problem: ApiProblem = {
        code: codeFor(response.status, bodyCode),
        message: messageFor(body, response.status),
        retryable: response.status === 429 || response.status === 503 || body.retryable === true,
        requestId
      };
      throw { problem };
    }
    return { status: response.status, data: data as T, requestId };
  }
}
