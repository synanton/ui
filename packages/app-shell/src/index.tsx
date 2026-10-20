import * as React from "react";
import type { TenantId } from "@synanton/api-client";
import "@synanton/design-tokens/tokens.css";
import "@synanton/ui-primitives/styles.css";
import "./shell.css";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  requiredCapabilities?: readonly string[];
}

export function filterNavigationItems(items: readonly NavigationItem[], capabilities: readonly string[]) {
  const granted = new Set(capabilities);
  return items.filter((item) => (item.requiredCapabilities ?? []).every((capability) => granted.has(capability)));
}

export interface AppShellProps {
  productName: string;
  navItems: readonly NavigationItem[];
  activeHref?: string;
  capabilities: readonly string[];
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export function AppShell({ productName, navItems, activeHref, capabilities, children, headerActions }: AppShellProps) {
  const visibleItems = filterNavigationItems(navItems, capabilities);
  return (
    <div className="syn-app-shell">
      <header className="syn-app-shell__header">
        <a className="syn-app-shell__brand" href="/" aria-label={productName + " home"}>{productName}</a>
        <div className="syn-app-shell__header-actions">{headerActions}</div>
      </header>
      <div className="syn-app-shell__body">
        <nav className="syn-app-shell__navigation" aria-label="Primary navigation">
          {visibleItems.map((item) => (
            <a key={item.id} href={item.href}
              aria-current={activeHref === item.href ? "page" : undefined}
              className={activeHref === item.href ? "syn-app-shell__nav-link is-active" : "syn-app-shell__nav-link"}>
              {item.label}
            </a>
          ))}
        </nav>
        <main id="main-content" className="syn-app-shell__content">{children}</main>
      </div>
    </div>
  );
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
export function LoadingState({ label = "Loading" }: { label?: string }) {
  return <div aria-live="polite" aria-busy="true" className="syn-loading-state">
    <span className="syn-loading-state__indicator" aria-hidden="true" /><span>{label}</span>
  </div>;
}

/** UI boundary only; the supplied status must come from a validated auth/session adapter. */
export function AuthBoundary({
  status, children, unauthenticatedFallback = null
}: { status: AuthStatus; children: React.ReactNode; unauthenticatedFallback?: React.ReactNode }) {
  if (status === "loading") return <LoadingState label="Checking session" />;
  if (status === "unauthenticated") return <>{unauthenticatedFallback}</>;
  return <>{children}</>;
}

/** Presentation visibility only. Platform must authorize every protected operation independently. */
export function CapabilityGate({
  capabilities, required, children, fallback = null
}: { capabilities: readonly string[]; required: readonly string[]; children: React.ReactNode; fallback?: React.ReactNode }) {
  const granted = new Set(capabilities);
  return required.every((capability) => granted.has(capability)) ? <>{children}</> : <>{fallback}</>;
}

export interface TenantContextSnapshot {
  activeTenantId: TenantId | null;
  authorizedTenantIds: readonly TenantId[];
  status: "unavailable" | "loading" | "ready";
}

export interface TenantContextPort {
  getSnapshot(): TenantContextSnapshot;
  requestTenantSelection(tenantId: TenantId): Promise<void>;
}

const TenantContext = React.createContext<TenantContextPort | null>(null);

export function TenantContextProvider({ value, children }: { value: TenantContextPort; children: React.ReactNode }) {
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

/** Test/story adapter only; never use as production tenant authority. */
export class MockTenantContextProvider implements TenantContextPort {
  constructor(private snapshot: TenantContextSnapshot) {}
  getSnapshot() { return this.snapshot; }
  async requestTenantSelection(tenantId: TenantId) {
    if (!this.snapshot.authorizedTenantIds.includes(tenantId)) {
      throw new Error("Mock tenant selection is outside the authorized tenant set");
    }
    this.snapshot = { ...this.snapshot, activeTenantId: tenantId, status: "ready" };
  }
}

export function useTenantContext(): TenantContextPort {
  const value = React.useContext(TenantContext);
  if (!value) throw new Error("TenantContextProvider is required where tenant context is consumed");
  return value;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}
interface ErrorBoundaryState { error: Error | null; }

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };
  static getDerivedStateFromError(error: Error): ErrorBoundaryState { return { error }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { this.props.onError?.(error, info); }
  private reset = () => this.setState({ error: null });
  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.reset);
      return <section role="alert" className="syn-error-boundary">
        <h2>Something went wrong</h2><p>The view could not be rendered.</p>
        <button type="button" onClick={this.reset}>Try again</button>
      </section>;
    }
    return this.props.children;
  }
}
