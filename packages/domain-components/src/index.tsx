import * as React from "react";
import "@synanton/design-tokens/tokens.css";
import "@synanton/ui-primitives/styles.css";
import "./domain-components.css";

export type OperationState =
  | "ACCEPTED"
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCEL_REQUESTED"
  | "CANCELLED"
  | "EXPIRED";

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
  state: OperationState;
  progress?: OperationProgress;
  outcome?: OperationOutcome | null;
  error?: OperationProblem | null;
}

export function OperationStatus({ state, progress, outcome, error }: OperationStatusProps) {
  return (
    <section className="syn-operation" data-state={state} aria-live="polite" aria-label="Operation status">
      <header className="syn-operation__header">
        <span className="syn-operation__state">{state}</span>
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
  state: IngestionRunState;
  result?: SyncResult | null;
}

export function IngestionRunStatus({ state, result }: IngestionRunStatusProps) {
  return (
    <section className="syn-run" data-state={state} aria-live="polite" aria-label="Ingestion run status">
      <span className="syn-run__state">{state}</span>
      {result ? <SyncResultSummary result={result} /> : null}
    </section>
  );
}
