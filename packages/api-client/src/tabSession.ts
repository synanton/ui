import {
  ApiClientError,
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

    this.abortController.abort();
    this.abortController = new AbortController();
    this.options.onSwitchAbort?.();

    const nextToken = await this.options.issueToken(nextTenant);
    const previousToken = this.token;

    this.identity = verifiedIdentityFrom({
      tenantId: nextTenant,
      principalId: this.identity.principalId,
      authorizedTenantIds: authorized,
      correlationId: this.identity.correlationId
    });
    this.token = nextToken;
    this.options.store.set(nextToken);

    if (previousToken && this.options.revokeToken) {
      await this.options.revokeToken(previousToken);
    }

    this.broadcast?.postMessage({
      type: "tenant-switched",
      tabId: this.tabId,
      tenantId: nextTenant
    } satisfies TenantSwitchMessage);

    for (const listener of this.listeners) {
      listener(this.identity);
    }
  }

  close(): void {
    this.broadcast?.close();
  }
}
