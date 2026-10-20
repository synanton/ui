import * as React from "react";
import "@synanton/design-tokens/tokens.css";
import "@synanton/ui-primitives/styles.css";
import "./domain-components.css";

// Operation (cross-plane lifecycle) and IngestionRun (ingestion-specific) are
// distinct platform vocabularies. IngestionRunStatus owns run state and
// composes SyncResult; it must not restate or collapse the Operation states.

export type OperationState =
  | "ACCEPTED"
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "EXPIRED";

const OPERATION_STATES: ReadonlySet<string> = new Set<OperationState>([
  "ACCEPTED",
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCEL_REQUESTED",
  "CANCELLED",
  "EXPIRED"
]);

export type OperationOutcome = "FULL" | "PARTIAL";

export interface OperationProgress {
  completed: number;
  total: number;
}

export interface OperationProblem {
  code: string;
  message: string;
  retryable: boolean;
  requestId: string;
}

export interface OperationStatusProps {
  /** Accepts an unknown string so a new backend state degrades to UNKNOWN instead of crashing. */
  state: OperationState | (string & {});
  progress?: OperationProgress;
  outcome?: OperationOutcome | null;
  error?: OperationProblem | null;
}

export function OperationStatus({ state, progress, outcome, error }: OperationStatusProps) {
  const known = OPERATION_STATES.has(state);
  const label = known ? state : "UNKNOWN";
  return (
    <section className="syn-operation" data-state={state} aria-live="polite" aria-label="Operation status">
      <header className="syn-operation__header">
        <span className="syn-operation__state">{label}</span>
        {!known ? <span className="syn-operation__raw">{state}</span> : null}
        {outcome ? (
          <span className={"syn-operation__outcome syn-operation__outcome--" + outcome.toLowerCase()}>
            {outcome}
          </span>
        ) : null}
      </header>
      {progress ? <p className="syn-operation__progress">{progress.completed} / {progress.total}</p> : null}
      {error ? (
        <p className="syn-operation__error" role="alert">
          {error.code}: {error.message}{" "}
          <small>request {error.requestId}{error.retryable ? " · retryable" : ""}</small>
        </p>
      ) : null}
    </section>
  );
}

export type IngestionRunState =
  | "DISCOVERED"
  | "SCHEDULED"
  | "ACQUIRING"
  | "VALIDATING"
  | "PUBLISHED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "SKIPPED"
  | "UNCHANGED"
  | "DELETED"
  | "QUARANTINED";

const RUN_STATES: ReadonlySet<string> = new Set<IngestionRunState>([
  "DISCOVERED",
  "SCHEDULED",
  "ACQUIRING",
  "VALIDATING",
  "PUBLISHED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "SKIPPED",
  "UNCHANGED",
  "DELETED",
  "QUARANTINED"
]);

export interface SyncResult {
  discovered: number;
  changed: number;
  unchanged: number;
  deleted: number;
  failed: number;
  skipped: number;
  quarantined: number;
  cancelled: number;
}

export function SyncResultSummary({ result }: { result: SyncResult }) {
  const entries: Array<[keyof SyncResult, number]> = [
    ["discovered", result.discovered],
    ["changed", result.changed],
    ["unchanged", result.unchanged],
    ["deleted", result.deleted],
    ["failed", result.failed],
    ["skipped", result.skipped],
    ["quarantined", result.quarantined],
    ["cancelled", result.cancelled]
  ];
  return (
    <dl className="syn-sync" aria-label="Sync result">
      {entries.map(([name, value]) => (
        <React.Fragment key={name}>
          <dt>{name}</dt>
          <dd>{value}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export interface IngestionRunStatusProps {
  /** Accepts an unknown string so a new backend state degrades to UNKNOWN instead of crashing. */
  state: IngestionRunState | (string & {});
  result?: SyncResult | null;
}

export function IngestionRunStatus({ state, result }: IngestionRunStatusProps) {
  const known = RUN_STATES.has(state);
  const label = known ? state : "UNKNOWN";
  return (
    <section className="syn-run" data-state={state} aria-live="polite" aria-label="Ingestion run status">
      <span className="syn-run__state">{label}</span>
      {!known ? <span className="syn-run__raw">{state}</span> : null}
      {result ? <SyncResultSummary result={result} /> : null}
    </section>
  );
}
