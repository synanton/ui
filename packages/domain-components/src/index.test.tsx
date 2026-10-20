import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { IngestionRunStatus, OperationStatus, SyncResultSummary } from "./index";

describe("domain status components", () => {
  it("renders operation state, progress, outcome, and error", () => {
    render(
      <OperationStatus
        state="SUCCEEDED"
        outcome="PARTIAL"
        progress={{ completed: 1, total: 2 }}
        error={{ code: "OPERATION_FAILED", message: "one file failed", retryable: false, requestId: "req-1" }}
      />
    );

    expect(screen.getByText("SUCCEEDED")).toBeTruthy();
    expect(screen.getByText("PARTIAL")).toBeTruthy();
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("OPERATION_FAILED");
  });

  it("renders run state and the sync counters", () => {
    render(
      <IngestionRunStatus
        state="COMPLETED"
        result={{ discovered: 1, changed: 1, unchanged: 0, deleted: 0, failed: 0, skipped: 0, quarantined: 0, cancelled: 0 }}
      />
    );

    expect(screen.getByText("COMPLETED")).toBeTruthy();
    expect(screen.getByText("changed")).toBeTruthy();
  });

  it("renders quarantined as an explicit counter", () => {
    render(
      <SyncResultSummary
        result={{ discovered: 2, changed: 1, unchanged: 0, deleted: 0, failed: 0, skipped: 0, quarantined: 1, cancelled: 0 }}
      />
    );

    expect(screen.getByText("quarantined")).toBeTruthy();
  });
});
