/**
 * Transport-neutral API client contract.
 *
 * This package is a leaf: no design tokens, UI components, shell, or app code.
 * A real generated client may replace the transport once ADR 0002 is accepted;
 * the envelope/error/auth/tenant shape here is what that client must satisfy.
 *
 * Tenant authority invariant: a request never carries a caller-supplied tenant.
 * The client derives scope only from a `VerifiedIdentity` produced by the auth
 * boundary; a missing identity is rejected before the transport is called.
 */

export type ApiMethod = "GET" | "POST" | "PATCH" | "DELETE";

/** Frozen platform error categories (Design 1.32 §62). */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_REQUIRED"
  | "AUTHORIZATION_DENIED"
  | "RESOURCE_NOT_FOUND"
  | "RESOURCE_CONFLICT"
  | "PRECONDITION_FAILED"
  | "RATE_LIMITED"
  | "DEPENDENCY_UNAVAILABLE"
  | "OPERATION_FAILED"
  | "INTERNAL_ERROR";

/** Tenant-contract codes (ADR 0007). */
export type TenantProblemCode =
  | "TENANT_IN_REQUEST_BODY"
  | "TENANT_HEADER_NOT_SUPPORTED"
  | "TENANT_CONTEXT_MISSING"
  | "TENANT_ACCESS_DENIED"
  | "TENANT_NOT_AVAILABLE"
  | "TENANT_SELECTION_REJECTED"
  | "TENANT_SWITCH_FAILED"
  | "SWITCH_IN_PROGRESS"
  | "REQUEST_ABORTED";

export interface ApiResponse<T> {
  status: number;
  data: T;
  requestId: string;
}

/** Frozen problem shape; transport failures map onto this. */
export interface ApiProblem {
  code: ApiErrorCode | TenantProblemCode | string;
  message: string;
  retryable: boolean;
  requestId: string;
  details?: Record<string, unknown>;
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly requestId: string;
  readonly details?: Record<string, unknown>;

  constructor(problem: ApiProblem) {
    super(problem.message);
    this.name = "ApiClientError";
    this.code = problem.code;
    this.retryable = problem.retryable;
    this.requestId = problem.requestId;
    this.details = problem.details;
  }
}

let fallbackRequestId = 0;

export function newRequestId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }
  fallbackRequestId += 1;
  return `client-${Date.now()}-${fallbackRequestId}`;
}

const verifiedIdentityBrand: unique symbol = Symbol("synanton.verifiedIdentity");

declare const tenantIdBrand: unique symbol;

/**
 * Server-validated tenant identifier. Branded so a raw string cannot flow into
 * a verified identity/context without passing through {@link tenantId}.
 */
export type TenantId = string & { readonly [tenantIdBrand]: true };

export function tenantId(value: string): TenantId {
  if (!value || !value.trim()) {
    throw new ApiClientError({
      code: "AUTHENTICATION_REQUIRED",
      message: "Tenant id is required",
      retryable: false,
      requestId: newRequestId()
    });
  }
  return value as TenantId;
}

/**
 * Identity produced only by the auth/session boundary. The brand prevents a
 * plain `{ tenantId, principalId }` object from being passed where a verified
 * identity is required; use {@link verifiedIdentityFrom} at that boundary.
 */
export interface VerifiedIdentity {
  readonly tenantId: TenantId;
  readonly principalId: string;
  /** The server-validated membership set; `tenantId` is the selected member. */
  readonly authorizedTenantIds: ReadonlySet<TenantId>;
  readonly correlationId?: string;
  readonly [verifiedIdentityBrand]: true;
}

export interface IdentityInput {
  tenantId: TenantId;
  principalId: string;
  /** Defaults to the single selected tenant (N=1). */
  authorizedTenantIds?: Iterable<TenantId>;
  correlationId?: string;
}

export function verifiedIdentityFrom(input: IdentityInput): VerifiedIdentity {
  if (!input || !input.tenantId || !input.tenantId.trim()
      || !input.principalId || !input.principalId.trim()) {
    throw new ApiClientError({
      code: "AUTHENTICATION_REQUIRED",
      message: "Verified tenant and principal are required",
      retryable: false,
      requestId: newRequestId()
    });
  }
  const authorizedTenantIds = new Set(input.authorizedTenantIds ?? [input.tenantId]);
  if (authorizedTenantIds.size === 0 || !authorizedTenantIds.has(input.tenantId)) {
    throw new ApiClientError({
      code: "TENANT_SELECTION_REJECTED",
      message: "The selected tenant must be in authorizedTenantIds",
      retryable: false,
      requestId: newRequestId()
    });
  }
  return Object.freeze({
    tenantId: input.tenantId,
    principalId: input.principalId,
    authorizedTenantIds,
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    [verifiedIdentityBrand]: true as const
  }) as VerifiedIdentity;
}

/** Supplies the identity established by the auth boundary; never localStorage/sessionStorage. */
export interface SessionIdentityProvider {
  current(): VerifiedIdentity | null;
}

/** Transport-neutral request envelope. It has no tenant field by design. */
export interface ApiRequest<TBody = unknown> {
  method: ApiMethod;
  /** Versioned platform path, e.g. "/v1/ingestion-runs". */
  path: string;
  body?: TBody;
  idempotencyKey?: string;
  /** Transport headers after auth attachment; never contains a tenant assertion. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** Attaches credentials at the transport boundary. Must not attach a client-supplied tenant header. */
export interface AuthAttachment {
  attach(headers: Record<string, string>): Record<string, string>;
}

/** Bearer-only attachment: no `X-Tenant-ID` or other tenant assertion is ever added. */
export class BearerAuthAttachment implements AuthAttachment {
  constructor(private readonly token: () => string | null) {}

  attach(headers: Record<string, string>): Record<string, string> {
    const token = this.token();
    return token ? { ...headers, Authorization: `Bearer ${token}` } : { ...headers };
  }
}

/**
 * Every attachment implementation must be registered here. The invariant test
 * asserts each one adds only credentials — never a tenant-bearing header — and
 * a static coverage test fails if a class implements `AuthAttachment` without
 * being registered.
 */
export interface RegisteredAuthAttachment {
  name: string;
  create: () => AuthAttachment;
}

export const registeredAuthAttachments: ReadonlyArray<RegisteredAuthAttachment> = [
  { name: "BearerAuthAttachment", create: () => new BearerAuthAttachment(() => "test-token") }
];

export interface ApiTransport {
  send<T>(request: ApiRequest, identity: VerifiedIdentity): Promise<ApiResponse<T>>;
}

export interface ApiClientOptions {
  transport: ApiTransport;
  session: SessionIdentityProvider;
  auth: AuthAttachment;
  /** Session-wide signal; a tenant switch aborts and replaces it. */
  signal?: () => AbortSignal;
}

export interface ApiClient {
  request<T>(request: ApiRequest): Promise<ApiResponse<T>>;
}

export function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new ApiClientError({
      code: "REQUEST_ABORTED",
      message: "Request aborted",
      retryable: true,
      requestId: newRequestId()
    });
  }
  const problem = (error as { problem?: ApiProblem } | null)?.problem;
  if (problem) {
    return new ApiClientError(problem);
  }
  return new ApiClientError({
    code: "INTERNAL_ERROR",
    message: error instanceof Error ? error.message : "Unknown transport error",
    retryable: false,
    requestId: newRequestId()
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** A caller may not ask the client to scope a request to a tenant via the body. */
function assertNoTenantInBody(body: unknown): void {
  if (!isPlainObject(body)) {
    return;
  }
  if ("tenant_id" in body || "tenant" in body) {
    throw new ApiClientError({
      code: "TENANT_IN_REQUEST_BODY",
      message: "Tenant scope must not be supplied in the request body; it derives from the verified identity",
      retryable: false,
      requestId: newRequestId(),
      details: { field: "tenant_id" }
    });
  }
}

/** Symmetric rejection: a tenant header is not a supported selector (ADR 0007). */
function assertNoTenantHeaders(headers: Record<string, string> | undefined): void {
  for (const name of Object.keys(headers ?? {})) {
    if (name.toLowerCase().includes("tenant")) {
      throw new ApiClientError({
        code: "TENANT_HEADER_NOT_SUPPORTED",
        message: "Tenant identity must not be supplied as a request header; it derives from the verified token",
        retryable: false,
        requestId: newRequestId(),
        details: { header: name }
      });
    }
  }
}

export class ApiClientImpl implements ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  async request<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    const identity = this.options.session.current();
    if (!identity) {
      throw new ApiClientError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Verified identity is required",
        retryable: false,
        requestId: newRequestId()
      });
    }
    assertNoTenantInBody(request.body);
    assertNoTenantHeaders(request.headers);
    const headers = this.options.auth.attach(request.headers ?? {});
    try {
      return await this.options.transport.send<T>(
        { ...request, headers, signal: request.signal ?? this.options.signal?.() },
        identity
      );
    } catch (error) {
      throw toApiClientError(error);
    }
  }
}

export type MockHandler = (
  request: ApiRequest,
  identity: VerifiedIdentity
) => ApiResponse<unknown> | Promise<ApiResponse<unknown>>;

/** In-memory transport for shell/app tests while the real ingress is undecided. */
export class MockApiTransport implements ApiTransport {
  private readonly routes: Array<{ method: ApiMethod; path: string; handler: MockHandler }> = [];

  on(method: ApiMethod, path: string, handler: MockHandler): this {
    this.routes.push({ method, path, handler });
    return this;
  }

  async send<T>(request: ApiRequest, identity: VerifiedIdentity): Promise<ApiResponse<T>> {
    const route = this.routes.find(
      (candidate) => candidate.method === request.method && candidate.path === request.path
    );
    if (!route) {
      throw new ApiClientError({
        code: "RESOURCE_NOT_FOUND",
        message: `No mock route for ${request.method} ${request.path}`,
        retryable: false,
        requestId: newRequestId()
      });
    }
    return (await route.handler(request, identity)) as ApiResponse<T>;
  }
}

export function createMockApiClient(
  session: SessionIdentityProvider,
  auth: AuthAttachment = new BearerAuthAttachment(() => "mock-token"),
  signal?: () => AbortSignal
): { client: ApiClient; transport: MockApiTransport } {
  const transport = new MockApiTransport();
  return { client: new ApiClientImpl({ transport, session, auth, signal }), transport };
}

import { RealApiTransport } from "./realTransport";
export { RealApiTransport } from "./realTransport";

/** Real `/v1` client. Auth is attached by `ApiClientImpl`; the transport adds nothing. */
export function createRealApiClient(
  session: SessionIdentityProvider,
  auth: AuthAttachment,
  baseUrl = "",
  signal?: () => AbortSignal
): ApiClient {
  return new ApiClientImpl({ transport: new RealApiTransport(baseUrl), session, auth, signal });
}
