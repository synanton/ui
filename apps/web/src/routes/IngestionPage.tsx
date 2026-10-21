import * as React from "react";
import { Button, Surface } from "@synanton/ui-primitives";
import { ApiClientError, type ApiClient } from "@synanton/api-client";
import {
  IngestionRunStatus,
  OperationStatus,
  type IngestionRunState,
  type OperationState,
  type SyncResult
} from "@synanton/domain-components";

export interface RunRef {
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

export type UploadFile = (
  file: File,
  sourceId: string,
  connectorId: string,
  onProgress: (percent: number) => void
) => Promise<RunRef>;

const UPLOAD_SOURCE_ID = "ui-upload-browser";
// The platform accepts "upload"/"filesystem"/"file"/"manual-upload";
// the source id is tenant-scoped and may be any stable name.
const UPLOAD_CONNECTOR_ID = "upload";
const TERMINAL_OPERATION_STATES = new Set(["SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED"]);

interface UploadRow {
  id: string;
  name: string;
  progress: number;
  phase: "uploading" | "processing" | "done" | "failed";
  operation?: OperationView;
  run?: RunView;
  error?: string;
}

export function IngestionPage({
  client,
  upload
}: {
  client: ApiClient;
  upload?: UploadFile;
}) {
  const [operation, setOperation] = React.useState<OperationView | null>(null);
  const [run, setRun] = React.useState<RunView | null>(null);
  const [uploads, setUploads] = React.useState<UploadRow[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [transient, setTransient] = React.useState<string | null>(null);
  const folderInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (folderInput.current) {
      folderInput.current.setAttribute("webkitdirectory", "");
      folderInput.current.setAttribute("directory", "");
    }
  }, []);

  function patchRow(id: string, patch: Partial<UploadRow>) {
    setUploads((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  async function pollOperation(operationId: string, rowId: string): Promise<OperationView> {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const response = await client.request<OperationView>({
        method: "GET",
        path: `/v1/operations/${operationId}`
      });
      patchRow(rowId, { operation: response.data });
      if (TERMINAL_OPERATION_STATES.has(response.data.status)) {
        return response.data;
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error("Processing timed out");
  }

  async function uploadOne(file: File) {
    if (!upload) {
      return;
    }
    const id = `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`;
    const name = file.webkitRelativePath || file.name;
    setUploads((current) => [...current, { id, name, progress: 0, phase: "uploading" }]);
    try {
      const created = await upload(file, UPLOAD_SOURCE_ID, UPLOAD_CONNECTOR_ID, (percent) => {
        patchRow(id, { progress: Math.min(99, Math.max(0, percent)) });
      });
      patchRow(id, { progress: 100, phase: "processing" });
      const finalOperation = await pollOperation(created.operation_id, id);
      patchRow(id, {
        phase: finalOperation.status === "SUCCEEDED" ? "done" : "failed",
        error: finalOperation.status === "SUCCEEDED"
          ? undefined
          : `Processing ${finalOperation.status}`
      });
      try {
        const runResponse = await client.request<RunView>({
          method: "GET",
          path: `/v1/ingestion-runs/${created.run_id}`
        });
        patchRow(id, { run: runResponse.data });
      } catch {
        // The operation status is the primary signal; the run summary is optional.
      }
    } catch (failure) {
      patchRow(id, {
        phase: "failed",
        error: failure instanceof Error ? failure.message : "Upload failed"
      });
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!upload || !files || files.length === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Sequential uploads: the demo browser must not slam the multipart handler.
      for (const file of Array.from(files)) {
        await uploadOne(file);
      }
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    setTransient(null);
    try {
      const created = await client.request<RunRef>({
        method: "POST",
        path: "/v1/ingestion-runs",
        body: { source_id: "sample-source", resource_id: "books/sample.pdf" },
        idempotencyKey: "sample-1"
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
      if (failure instanceof ApiClientError && failure.code === "REQUEST_ABORTED") {
        setTransient("Tenant changed; the in-flight request was cancelled.");
        return;
      }
      setError(failure instanceof Error ? failure.message : "Ingestion request failed");
    }
  }

  return (
    <Surface>
      <h1>Ingestion</h1>
      <p>Submit a document through the shared ingestion contract.</p>

      {upload ? (
        <section aria-label="Upload documents">
          <label htmlFor="upload-files">Upload files</label>
          <input
            id="upload-files"
            type="file"
            multiple
            disabled={busy}
            onChange={(event) => {
              void handleFiles(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <label htmlFor="upload-folder">Upload folder</label>
          <input
            id="upload-folder"
            ref={folderInput}
            type="file"
            multiple
            disabled={busy}
            onChange={(event) => {
              void handleFiles(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <p>Files upload sequentially. The processing status polls the operation until it is terminal.</p>
          {uploads.length > 0 ? (
            <ul>
              {uploads.map((row) => (
                <li key={row.id}>
                  <strong>{row.name}</strong>
                  <span> — </span>
                  <span>
                    {row.phase === "uploading" ? `Uploading ${row.progress}%` : null}
                    {row.phase === "processing" ? "Processing" : null}
                    {row.phase === "done" ? "Uploaded" : null}
                    {row.phase === "failed" ? "Failed" : null}
                  </span>
                  {row.phase === "uploading" ? (
                    <progress
                      value={row.progress}
                      max={100}
                      aria-label={`Upload progress for ${row.name}`}
                    />
                  ) : null}
                  {row.operation ? (
                    <OperationStatus
                      state={row.operation.status}
                      outcome={row.operation.outcome}
                      progress={row.operation.progress}
                    />
                  ) : null}
                  {row.run ? <IngestionRunStatus state={row.run.status} result={row.run.result} /> : null}
                  {row.error ? <p role="alert">{row.error}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : (
        <Button onClick={submit}>Submit sample ingestion</Button>
      )}

      {transient ? <p role="status">{transient}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {operation
        ? <OperationStatus state={operation.status} outcome={operation.outcome} progress={operation.progress} />
        : null}
      {run ? <IngestionRunStatus state={run.status} result={run.result} /> : null}
    </Surface>
  );
}
