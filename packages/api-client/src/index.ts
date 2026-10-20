/**
 * Transport-neutral API client contract.
 *
 * This package is a leaf: no design tokens, UI components, shell, or app code.
 * A real generated client may replace the transport once ADR 0002 is accepted;
 * the envelope/error/auth/tenant shape here is what that client must satisfy.
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

/** Verified session context. `tenantId` never comes from browser storage or a client header. */
export interface RequestContext {
  tenantId: string;
  principalId: string;
  correlationId?: string;
}

/** Transport-neutral request envelope. */
export interface ApiRequest<TBody = unknown> {
  method: ApiMethod;
  /** Versioned platform path, e.g. "/v1/ingestion-runs". */
  path: string;
  body?: TBody;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface ApiResponse<T> {
  status: number;
  data: T;
  requestId: string;
}

/** Frozen problem shape; transport failures map onto this. */
export interface ApiProblem {
  code: ApiErrorCode | string;
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

/** Attaches credentials at the transport boundary. Must not attach a client-supplied tenant header. */
export interface AuthAttachment {
  attach(headers: Record<string, string>): Record<string, string>;
}

export interface ApiTransport {
  send<T>(request: ApiRequest, context: RequestContext): Promise<ApiResponse<T>>;
}

export interface ApiClient {
  request<T>(request: ApiRequest): Promise<ApiResponse<T>>;
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

export function toApiClientError(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
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

export class ApiClientImpl implements ApiClient {
  constructor(
    private readonly transport: ApiTransport,
    private readonly context: () => RequestContext
  ) {}

  async request<T>(request: ApiRequest): Promise<ApiResponse<T>> {
    const context = this.context();
    if (!context || !context.tenantId || !context.tenantId.trim()) {
      throw new ApiClientError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Verified tenant context is required",
        retryable: false,
        requestId: newRequestId()
      });
    }
    try {
      return await this.transport.send<T>(request, context);
    } catch (error) {
      throw toApiClientError(error);
    }
  }
}

export type MockHandler = (
  request: ApiRequest,
  context: RequestContext
) => ApiResponse<unknown> | Promise<ApiResponse<unknown>>;

/** In-memory transport for shell/app tests while the real ingress is undecided. */
export class MockApiTransport implements ApiTransport {
  private readonly routes: Array<{ method: ApiMethod; path: string; handler: MockHandler }> = [];

  on(method: ApiMethod, path: string, handler: MockHandler): this {
    this.routes.push({ method, path, handler });
    return this;
  }

  async send<T>(request: ApiRequest, context: RequestContext): Promise<ApiResponse<T>> {
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
    return (await route.handler(request, context)) as ApiResponse<T>;
  }
}

export function createMockApiClient(context: () => RequestContext): {
  client: ApiClient;
  transport: MockApiTransport;
} {
  const transport = new MockApiTransport();
  return { client: new ApiClientImpl(transport, context), transport };
}
