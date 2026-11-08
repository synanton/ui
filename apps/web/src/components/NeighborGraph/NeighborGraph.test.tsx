import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NeighborGraph, type NeighborGraphData } from "./NeighborGraph";

const data: NeighborGraphData = {
  chunk_id: "chunk-a#0",
  neighbor_count: 2,
  entities: [{ canonical_form: "IATF 16949", type: "identifier", entity_kind: "hard", df: 5 }],
  neighbor_chunks: ["chunk-b#0", "chunk-c#1"],
  neighbors: [
    { chunk_id: "chunk-b#0", via: [{ canonical_form: "IATF 16949", type: "identifier", entity_kind: "hard", df: 5 }] },
    { chunk_id: "chunk-c#1", via: [] }
  ],
  by_kind: { hard: 1 }
};

describe("NeighborGraph", () => {
  it("renders the root, entities, neighbors, and the bound caption", () => {
    render(<NeighborGraph data={data} />);
    expect(screen.getByRole("img", { name: /Neighbor graph for chunk-a#0/ })).toBeTruthy();
    expect(screen.getByText(/Showing 2 of 2 neighboring chunks/)).toBeTruthy();
    expect(screen.getAllByText(/IATF 16949/).length).toBeGreaterThan(0);
  });

  it("re-roots the graph when a neighbor is selected", () => {
    const onSelect = vi.fn();
    render(<NeighborGraph data={data} onSelectChunk={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: /Expand chunk chunk-b#0/ }));
    expect(onSelect).toHaveBeenCalledWith("chunk-b#0");
  });

  it("caps the number of neighbor nodes", () => {
    const many: NeighborGraphData = {
      ...data,
      neighbor_count: 60,
      neighbor_chunks: Array.from({ length: 60 }, (_, index) => `c${index}#0`),
      neighbors: Array.from({ length: 60 }, (_, index) => ({ chunk_id: `c${index}#0`, via: [] }))
    };
    render(<NeighborGraph data={many} maxNodes={10} />);
    expect(screen.getByText(/Showing 8 of 60 neighboring chunks/)).toBeTruthy();
    expect(screen.getByText(/hidden by the 10-node bound/)).toBeTruthy();
  });

  it("renders an empty state when the fixture has no neighbors", () => {
    render(<NeighborGraph data={{ ...data, entities: [], neighbors: [], neighbor_count: 0 }} />);
    expect(screen.getByText("No graph data for this chunk.")).toBeTruthy();
  });
});
