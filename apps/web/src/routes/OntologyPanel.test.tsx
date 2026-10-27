import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ApiClientError, type ApiClient } from "@synanton/api-client";
import { OntologyPanel, type OntologyEntity } from "./OntologyPanel";

const EXPECTED = {
  total: 273,
  hard: 198,
  soft_glossary: 72,
  soft_doctrinal: 3,
  graph_useful: 31,
  graph_useful_soft_glossary: 0,
  pair_total: 38,
  pair_hard: 30,
  pair_soft_glossary: 8,
  pair_soft_doctrinal: 0
};

function entity(index: number, entityClass: string, df: number, dfBand: string): OntologyEntity {
  return {
    entity_id: `ent-${index}`,
    canonical_form: `Entity ${index}`,
    entity_class: entityClass,
    type: entityClass === "hard" ? "date" : "glossary",
    soft_subtype: entityClass === "hard" ? null : entityClass,
    entity_kind: entityClass === "hard" ? "year" : "glossary",
    df,
    df_band: dfBand
  };
}

function allEntities(): OntologyEntity[] {
  const rows: OntologyEntity[] = [];
  for (let index = 0; index < 31; index += 1) {
    rows.push(entity(index, "hard", 3, "3-15"));
  }
  for (let index = 0; index < 30; index += 1) {
    rows.push(entity(31 + index, "hard", 2, "pair"));
  }
  for (let index = 0; index < 137; index += 1) {
    rows.push(entity(61 + index, "hard", 1, "1"));
  }
  for (let index = 0; index < 8; index += 1) {
    rows.push(entity(198 + index, "soft_glossary", 2, "pair"));
  }
  for (let index = 0; index < 64; index += 1) {
    rows.push(entity(206 + index, "soft_glossary", 1, "1"));
  }
  for (let index = 0; index < 3; index += 1) {
    rows.push(entity(270 + index, "soft_doctrinal", 1, "1"));
  }
  return rows;
}

function responseFor(path: string) {
  const params = new URLSearchParams(path.split("?")[1] ?? "");
  const band = params.get("df_band") ?? "all";
  const entityClass = params.get("entity_class");
  let rows = allEntities();
  if (band === "graph_useful") rows = rows.filter((row) => row.df_band === "3-15");
  if (band === "pair") rows = rows.filter((row) => row.df_band === "pair");
  if (entityClass && entityClass !== "all") rows = rows.filter((row) => row.entity_class === entityClass);
  return { data: { entities: rows, count: rows.length } };
}

function client(): ApiClient {
  return {
    request: vi.fn(async ({ path }: { path: string }) => responseFor(path))
  } as unknown as ApiClient;
}

describe("OntologyPanel", () => {
  it("renders 273 rows on load", async () => {
    render(<OntologyPanel client={client()} />);
    await waitFor(() => expect(screen.getAllByTestId("ontology-row")).toHaveLength(EXPECTED.total));
  });

  it("shows hard section with count 198", async () => {
    render(<OntologyPanel client={client()} />);
    const section = await screen.findByRole("region", { name: "hard" });
    expect(within(section).getByText("198")).toBeTruthy();
  });

  it("shows soft_glossary section with count 72", async () => {
    render(<OntologyPanel client={client()} />);
    const section = await screen.findByRole("region", { name: "soft_glossary" });
    expect(within(section).getByText("72")).toBeTruthy();
  });

  it("shows soft_doctrinal section with count 3", async () => {
    render(<OntologyPanel client={client()} />);
    const section = await screen.findByRole("region", { name: "soft_doctrinal" });
    expect(within(section).getByText("3")).toBeTruthy();
  });

  it("shows 3 + 72 + 198 = 273 in the header total", async () => {
    render(<OntologyPanel client={client()} />);
    expect((await screen.findByTestId("ontology-total")).textContent).toBe("273");
  });

  it("df_band=graph_useful shows 31 rows", async () => {
    render(<OntologyPanel client={client()} />);
    fireEvent.change(await screen.findByLabelText("df_band"), { target: { value: "graph_useful" } });
    await waitFor(() => expect(screen.getAllByTestId("ontology-row")).toHaveLength(EXPECTED.graph_useful));
  });

  it("df_band=all shows 273 rows", async () => {
    render(<OntologyPanel client={client()} />);
    fireEvent.change(await screen.findByLabelText("df_band"), { target: { value: "graph_useful" } });
    fireEvent.change(screen.getByLabelText("df_band"), { target: { value: "all" } });
    await waitFor(() => expect(screen.getAllByTestId("ontology-row")).toHaveLength(EXPECTED.total));
  });

  it("df_band=pair shows 38 rows", async () => {
    render(<OntologyPanel client={client()} />);
    fireEvent.change(await screen.findByLabelText("df_band"), { target: { value: "pair" } });
    await waitFor(() => expect(screen.getAllByTestId("ontology-row")).toHaveLength(EXPECTED.pair_total));
  });

  it("df_band=pair + entity_class=hard shows 30 rows", async () => {
    render(<OntologyPanel client={client()} />);
    fireEvent.change(await screen.findByLabelText("df_band"), { target: { value: "pair" } });
    fireEvent.change(screen.getByLabelText("entity_class"), { target: { value: "hard" } });
    await waitFor(() => expect(screen.getAllByTestId("ontology-row")).toHaveLength(EXPECTED.pair_hard));
  });

  it("df_band=pair + entity_class=soft_glossary shows 8 rows", async () => {
    render(<OntologyPanel client={client()} />);
    fireEvent.change(await screen.findByLabelText("df_band"), { target: { value: "pair" } });
    fireEvent.change(screen.getByLabelText("entity_class"), { target: { value: "soft_glossary" } });
    await waitFor(() => expect(screen.getAllByTestId("ontology-row")).toHaveLength(EXPECTED.pair_soft_glossary));
  });

  it("df_band=graph_useful + entity_class=soft_glossary shows 0 rows and the empty state", async () => {
    render(<OntologyPanel client={client()} />);
    fireEvent.change(await screen.findByLabelText("df_band"), { target: { value: "graph_useful" } });
    fireEvent.change(screen.getByLabelText("entity_class"), { target: { value: "soft_glossary" } });
    await waitFor(() => expect(screen.getByText("No ontology entities for this filter.")).toBeTruthy());
    expect(screen.queryAllByTestId("ontology-row")).toHaveLength(EXPECTED.graph_useful_soft_glossary);
  });

  it("soft_glossary section is collapsed by default", async () => {
    render(<OntologyPanel client={client()} />);
    const toggle = await screen.findByRole("button", { name: /soft_glossary/ });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("clicking a category header expands it", async () => {
    render(<OntologyPanel client={client()} />);
    const toggle = await screen.findByRole("button", { name: /soft_glossary/ });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("each row displays canonical_form and df badge", async () => {
    render(<OntologyPanel client={client()} />);
    const row = (await screen.findAllByTestId("ontology-row"))[0];
    expect(within(row).getByText("Entity 0")).toBeTruthy();
    expect(within(row).getByText("df 3")).toBeTruthy();
  });

  it("shows loading state before data resolves", () => {
    const request = vi.fn(() => new Promise(() => {}));
    render(<OntologyPanel client={{ request } as unknown as ApiClient} />);
    expect(screen.getByTestId("ontology-loading")).toBeTruthy();
    expect(screen.queryByTestId("ontology-empty")).toBeNull();
  });

  it("preserves collapse state across filter changes", async () => {
    render(<OntologyPanel client={client()} />);
    const toggle = await screen.findByRole("button", { name: /soft_glossary/ });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.change(screen.getByLabelText("df_band"), { target: { value: "pair" } });
    await waitFor(() => expect(screen.getAllByTestId("ontology-row")).toHaveLength(EXPECTED.pair_total));
    expect(screen.getByRole("button", { name: /soft_glossary/ }).getAttribute("aria-expanded")).toBe("true");
  });

  it("retries once after a 401 and renders the panel", async () => {
    const unauthorized = new ApiClientError({
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required",
      retryable: false,
      requestId: "req-401"
    });
    const request = vi.fn()
      .mockRejectedValueOnce(unauthorized)
      .mockResolvedValueOnce({ data: { entities: allEntities(), count: EXPECTED.total } });
    const onUnauthorized = vi.fn(async () => true);
    render(<OntologyPanel client={{ request } as unknown as ApiClient} onUnauthorized={onUnauthorized} />);
    await waitFor(() => expect(screen.getByTestId("ontology-total").textContent).toBe("273"));
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
