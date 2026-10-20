import { describe, expect, it, vi } from "vitest";
import { tenantId, toApiClientError, verifiedIdentityFrom } from "./index";
import {
  TabSession,
  type BroadcastChannelLike,
  type TabTokenStore
} from "./tabSession";

function memoryStore(initial: string | null = null): TabTokenStore & { value: string | null } {
  const store = {
    value: initial,
    get: () => store.value,
    set: (token: string | null) => {
      store.value = token;
    }
  };
  return store;
}

function fakeChannelBus(): () => BroadcastChannelLike {
  const listeners = new Set<(event: { data: unknown }) => void>();
  return () => ({
    postMessage: (message) => {
      for (const listener of listeners) {
        listener({ data: message });
      }
    },
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    close: () => {
      listeners.clear();
    }
  });
}

function identity(authorized: string[], selected: string) {
  return verifiedIdentityFrom({
    tenantId: tenantId(selected),
    principalId: "alice",
    authorizedTenantIds: authorized.map((value) => tenantId(value))
  });
}

describe("TabSession", () => {
  it("auto-selects the sole tenant at N=1 and rejects any other", async () => {
    const session = new TabSession({
      identity: identity(["tenant-a"], "tenant-a"),
      store: memoryStore(),
      issueToken: async () => "token-a"
    });

    expect(session.currentTenant()).toBe(tenantId("tenant-a"));
    await expect(session.selectTenant(tenantId("tenant-b")))
      .rejects.toMatchObject({ code: "TENANT_SELECTION_REJECTED" });
  });

  it("re-issues and revokes on a multi-tenant switch, aborting in-flight work", async () => {
    const store = memoryStore("token-a");
    const revoke = vi.fn(async () => {});
    const session = new TabSession({
      identity: identity(["tenant-a", "tenant-b"], "tenant-a"),
      initialTenant: tenantId("tenant-a"),
      store,
      issueToken: async (target) => `token-${target}`,
      revokeToken: revoke
    });

    const inFlight = session.signal();
    await session.selectTenant(tenantId("tenant-b"));

    expect(session.currentTenant()).toBe(tenantId("tenant-b"));
    expect(session.currentToken()).toBe("token-tenant-b");
    expect(store.value).toBe("token-tenant-b");
    expect(revoke).toHaveBeenCalledWith("token-a");
    expect(inFlight.aborted).toBe(true);
    expect(session.signal().aborted).toBe(false);
  });

  it("keeps per-tab tokens and broadcasts without mutating the other tab", async () => {
    const channel = fakeChannelBus();
    const storeA = memoryStore("a-token");
    const storeB = memoryStore("b-token");
    const remote: string[] = [];

    const tabA = new TabSession({
      identity: identity(["tenant-a", "tenant-b"], "tenant-a"),
      initialTenant: tenantId("tenant-a"),
      store: storeA,
      issueToken: async (target) => `a-${target}`,
      broadcast: channel(),
      onRemoteSwitch: (message) => remote.push(message.tenantId)
    });
    new TabSession({
      identity: identity(["tenant-a", "tenant-b"], "tenant-b"),
      initialTenant: tenantId("tenant-b"),
      store: storeB,
      issueToken: async (target) => `b-${target}`,
      broadcast: channel(),
      onRemoteSwitch: (message) => remote.push(message.tenantId)
    });

    await tabA.selectTenant(tenantId("tenant-b"));

    expect(tabA.currentTenant()).toBe(tenantId("tenant-b"));
    expect(storeA.value).toBe("a-tenant-b");
    expect(storeB.value).toBe("b-token");
    expect(remote).toContain(tenantId("tenant-b"));
  });

  it("maps an abort to REQUEST_ABORTED", () => {
    const error = toApiClientError(Object.assign(new Error("aborted"), { name: "AbortError" }));
    expect(error.code).toBe("REQUEST_ABORTED");
    expect(error.retryable).toBe(true);
  });

  it("leaves the current tenant untouched when token issuance fails", async () => {
    const store = memoryStore("token-a");
    const onSwitchAbort = vi.fn();
    const session = new TabSession({
      identity: identity(["tenant-a", "tenant-b"], "tenant-a"),
      initialTenant: tenantId("tenant-a"),
      store,
      onSwitchAbort,
      issueToken: async () => {
        throw new Error("issuer down");
      }
    });
    const inFlight = session.signal();

    await expect(session.selectTenant(tenantId("tenant-b")))
      .rejects.toMatchObject({ code: "TENANT_SWITCH_FAILED" });

    expect(session.currentTenant()).toBe(tenantId("tenant-a"));
    expect(session.currentToken()).toBe("token-a");
    expect(store.value).toBe("token-a");
    expect(inFlight.aborted).toBe(false);
    expect(onSwitchAbort).not.toHaveBeenCalled();
  });

  it("rejects a concurrent switch while one is in progress", async () => {
    let release!: (token: string) => void;
    const pending = new Promise<string>((resolve) => {
      release = resolve;
    });
    const session = new TabSession({
      identity: identity(["tenant-a", "tenant-b", "tenant-c"], "tenant-a"),
      initialTenant: tenantId("tenant-a"),
      store: memoryStore("token-a"),
      issueToken: () => pending
    });

    const first = session.selectTenant(tenantId("tenant-b"));
    await expect(session.selectTenant(tenantId("tenant-c")))
      .rejects.toMatchObject({ code: "SWITCH_IN_PROGRESS" });

    release("token-b");
    await first;
    expect(session.currentTenant()).toBe(tenantId("tenant-b"));
  });

  it("completes the switch even if revoking the old token fails", async () => {
    vi.useFakeTimers();
    const onRevokeFailure = vi.fn();
    const session = new TabSession({
      identity: identity(["tenant-a", "tenant-b"], "tenant-a"),
      initialTenant: tenantId("tenant-a"),
      store: memoryStore("token-a"),
      issueToken: async (target) => `token-${target}`,
      revokeToken: async () => {
        throw new Error("revoke down");
      },
      onRevokeFailure
    });

    await session.selectTenant(tenantId("tenant-b"));
    expect(session.currentTenant()).toBe(tenantId("tenant-b"));

    await vi.runAllTimersAsync();
    expect(onRevokeFailure).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("registers cross-tab coordination at construction, before any request", () => {
    const listeners: Array<(event: { data: unknown }) => void> = [];
    const broadcast: BroadcastChannelLike = {
      postMessage: () => {},
      addEventListener: (_type, listener) => {
        listeners.push(listener);
      },
      close: () => {}
    };
    new TabSession({
      identity: identity(["tenant-a"], "tenant-a"),
      store: memoryStore(),
      issueToken: async () => "token-a",
      broadcast
    });

    expect(listeners).toHaveLength(1);
  });
});
