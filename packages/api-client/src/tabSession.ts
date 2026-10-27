import {
  ApiClientError,
  newRequestId,
  verifiedIdentityFrom,
  type SessionIdentityProvider,
  type TenantId,
  type VerifiedIdentity
} from "./index";

export interface TabTokenStore {
  get(): string | null;
  set(token: string | null): void;
}

/** Per-tab token storage (`sessionStorage` is not shared across tabs). */
export class SessionStorageTokenStore implements TabTokenStore {
  constructor(private readonly key = "synanton.accessToken") {}

  get(): string | null {
    if (typeof sessionStorage === "undefined") {
      return null;
    }
    return sessionStorage.getItem(this.key);
  }

  set(token: string | null): void {
    if (typeof sessionStorage === "undefined") {
      return;
    }
    if (token) {
      sessionStorage.setItem(this.key, token);
    } else {
      sessionStorage.removeItem(this.key);
    }
  }
}

export interface BroadcastChannelLike {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: { data: unknown }) => void): void;
  close(): void;
}

export interface TenantSwitchMessage {
  type: "tenant-switched";
  tabId: string;
  tenantId: TenantId;
}

export interface TabSessionOptions {
  identity: VerifiedIdentity;
  store: TabTokenStore;
  issueToken: (tenantId: TenantId) => Promise<string>;
  revokeToken?: (token: string) => Promise<void>;
  initialTenant?: TenantId;
  channelName?: string;
  broadcast?: BroadcastChannelLike;
  onSwitchAbort?: () => void;
  onRemoteSwitch?: (message: TenantSwitchMessage) => void;
  onRevokeFailure?: (token: string, error: unknown) => void;
}

let tabSequence = 0;

/**
 * Per-tab, tenant-bound session. The tenant is locked; switching aborts in-flight
 * work, re-issues the token, revokes the old one, and broadcasts to sibling tabs.
 */
export class TabSession implements SessionIdentityProvider {
  readonly tabId: string;
  private identity: VerifiedIdentity;
  private token: string | null;
  private abortController = new AbortController();
  private switchInProgress = false;
  private readonly broadcast?: BroadcastChannelLike;
  private readonly listeners = new Set<(identity: VerifiedIdentity) => void>();

  constructor(private readonly options: TabSessionOptions) {
    this.tabId = `tab-${++tabSequence}`;
    const authorized = options.identity.authorizedTenantIds;
    const initial = options.initialTenant
      ?? (authorized.size === 1 ? [...authorized][0] : null);
    if (!initial || !authorized.has(initial)) {
      throw new ApiClientError({
        code: "TENANT_SELECTION_REJECTED",
        message: "A valid tenant selection is required",
        retryable: false,
        requestId: "session-init"
      });
    }
    this.identity = verifiedIdentityFrom({
      tenantId: initial,
      principalId: options.identity.principalId,
      authorizedTenantIds: authorized,
      correlationId: options.identity.correlationId
    });
    this.token = options.store.get();

    if (options.broadcast) {
      this.broadcast = options.broadcast;
    } else if (options.channelName && typeof BroadcastChannel !== "undefined") {
      this.broadcast = new BroadcastChannel(options.channelName) as unknown as BroadcastChannelLike;
    }
    // Registered in the constructor, before pages render/request, so duplicate-tab
    // coordination is established before the first request in a new tab.
    this.broadcast?.addEventListener("message", (event) => {
      const message = event.data as TenantSwitchMessage | undefined;
      if (message?.type === "tenant-switched" && message.tabId !== this.tabId) {
        options.onRemoteSwitch?.(message);
      }
    });
  }

  current(): VerifiedIdentity {
    return this.identity;
  }

  currentTenant(): TenantId {
    return this.identity.tenantId;
  }

  authorizedTenantIds(): readonly TenantId[] {
    return [...this.identity.authorizedTenantIds];
  }

  currentToken(): string | null {
    return this.token;
  }

  /** Replace the bearer token after a silent re-auth; tenant/principal stay locked. */
  replaceToken(token: string): void {
    this.token = token;
    this.options.store.set(token);
  }

  signal(): AbortSignal {
    return this.abortController.signal;
  }

  subscribe(listener: (identity: VerifiedIdentity) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async selectTenant(nextTenant: TenantId): Promise<void> {
    const authorized = this.identity.authorizedTenantIds;
    if (!authorized.has(nextTenant)) {
      throw new ApiClientError({
        code: "TENANT_SELECTION_REJECTED",
        message: "Tenant is not in authorizedTenantIds",
        retryable: false,
        requestId: "tenant-selection"
      });
    }
    if (nextTenant === this.identity.tenantId) {
      return;
    }
    if (this.switchInProgress) {
      throw new ApiClientError({
        code: "SWITCH_IN_PROGRESS",
        message: "A tenant switch is already in progress",
        retryable: true,
        requestId: newRequestId()
      });
    }

    this.switchInProgress = true;
    try {
      // Issue first: a failure here leaves the current tenant/token untouched,
      // so the abort/transient message only ever follows a successful switch.
      let nextToken: string;
      try {
        nextToken = await this.options.issueToken(nextTenant);
      } catch (cause) {
        throw new ApiClientError({
          code: "TENANT_SWITCH_FAILED",
          message: "Could not switch tenants; the current tenant is unchanged",
          retryable: true,
          requestId: newRequestId(),
          details: { cause: cause instanceof Error ? cause.message : String(cause) }
        });
      }

      const previousToken = this.token;
      this.abortController.abort();
      this.abortController = new AbortController();
      this.options.onSwitchAbort?.();

      this.identity = verifiedIdentityFrom({
        tenantId: nextTenant,
        principalId: this.identity.principalId,
        authorizedTenantIds: authorized,
        correlationId: this.identity.correlationId
      });
      this.token = nextToken;
      this.options.store.set(nextToken);

      // Revocation is not on the switch path: a revoke failure must never block
      // the user from switching. It is retried in the background and reported.
      if (previousToken) {
        void this.revokeInBackground(previousToken);
      }

      this.broadcast?.postMessage({
        type: "tenant-switched",
        tabId: this.tabId,
        tenantId: nextTenant
      } satisfies TenantSwitchMessage);

      for (const listener of this.listeners) {
        listener(this.identity);
      }
    } finally {
      this.switchInProgress = false;
    }
  }

  private async revokeInBackground(token: string): Promise<void> {
    const revoke = this.options.revokeToken;
    if (!revoke) {
      return;
    }
    const delays = [100, 200];
    for (let attempt = 0; ; attempt += 1) {
      try {
        await revoke(token);
        return;
      } catch (error) {
        if (attempt >= delays.length) {
          console.warn("Failed to revoke the previous tenant token", error);
          this.options.onRevokeFailure?.(token, error);
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      }
    }
  }

  close(): void {
    this.broadcast?.close();
  }
}
