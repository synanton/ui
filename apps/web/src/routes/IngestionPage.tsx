import * as React from "react";
import { Button, Surface } from "@synanton/ui-primitives";
import type { ApiClient } from "@synanton/api-client";
import {
  IngestionRunStatus,
  OperationStatus,
  type IngestionRunState,
  type OperationState,
  type SyncResult
} from "@synanton/domain-components";

interface RunRef {
  run_id: string;
  operation_id: string;
}

interface OperationView {
  status: OperationState;
  outcome?: "FULL" | "PARTIAL";
  progress?: { completed: number; total: number };
}

interface RunView {
  status: IngestionRunState;
  result?: SyncResult;
}

export function IngestionPage({ client }: { client: ApiClient }) {
  const [operation, setOperation] = React.useState<OperationView | null>(null);
  const [run, setRun] = React.useState<RunView | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setError(null);
    try {
      const created = await client.request<RunRef>({
        method: "POST",
        path: "/v1/ingestion-runs",
        body: { source_id: "demo-source", resource_id: "books/sample.pdf" },
        idempotencyKey: "demo-1"
      });
      const operationView = await client.request<OperationView>({
        method: "GET",
        path: `/v1/operations/${created.data.operation_id}`
      });
      setOperation(operationView.data);
      const runView = await client.request<RunView>({
        method: "GET",
        path: `/v1/ingestion-runs/${created.data.run_id}`
      });
      setRun(runView.data);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Ingestion request failed");
    }
  }

  return (
    <Surface>
      <h1>Ingestion</h1>
      <p>Submit a sample document through the shared ingestion contract.</p>
      <Button onClick={submit}>Submit sample ingestion</Button>
      {error ? <p role="alert">{error}</p> : null}
      {operation
        ? <OperationStatus state={operation.status} outcome={operation.outcome} progress={operation.progress} />
        : null}
      {run ? <IngestionRunStatus state={run.status} result={run.result} /> : null}
    </Surface>
  );
}
