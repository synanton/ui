import * as React from "react";

export interface GraphEntity {
  canonical_form: string;
  type: string;
  entity_kind: string;
  df: number;
}

export interface GraphNeighbor {
  chunk_id: string;
  via: GraphEntity[];
}

export interface NeighborGraphData {
  chunk_id: string;
  neighbor_count: number;
  entities: GraphEntity[];
  neighbor_chunks: string[];
  neighbors: GraphNeighbor[];
  by_kind: Record<string, number>;
}

const WIDTH = 680;
const HEIGHT = 380;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

/**
 * Bounded neighbor expansion (#508): renders one chunk's entity co-occurrences
 * and its immediate neighbor chunks. Visualization only — never a retrieval
 * leg. Clicking a neighbor re-roots the view (bounded by maxNodes).
 */
export function NeighborGraph({ data, onSelectChunk, maxNodes = 50 }: {
  data: NeighborGraphData;
  onSelectChunk?: (chunkId: string) => void;
  maxNodes?: number;
}) {
  const entities = data.entities.slice(0, 12);
  const neighborBudget = Math.max(0, maxNodes - entities.length - 1);
  const neighbors = data.neighbors.slice(0, neighborBudget);
  const hidden = Math.max(0, data.neighbor_count - neighbors.length);

  if (entities.length === 0 && neighbors.length === 0) {
    return <p>No graph data for this chunk.</p>;
  }

  const entityPositions = ring(entities.length, 95);
  const neighborPositions = ring(neighbors.length, 165);

  return (
    <figure className="syn-neighbor-graph">
      <svg role="img" aria-label={`Neighbor graph for ${data.chunk_id}`} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
           width="100%" height="auto" style={{ maxWidth: "100%", background: "var(--color-background)" }}>
        {entityPositions.map((point, index) => (
          <line key={`entity-edge-${index}`} x1={CENTER_X} y1={CENTER_Y} x2={point.x} y2={point.y}
                stroke="var(--color-border)" strokeWidth={1} />
        ))}
        {neighborPositions.map((point, index) => (
          <line key={`neighbor-edge-${index}`} x1={CENTER_X} y1={CENTER_Y} x2={point.x} y2={point.y}
                stroke="var(--color-border)" strokeWidth={1} strokeDasharray="4 3" />
        ))}
        <circle cx={CENTER_X} cy={CENTER_Y} r={22} fill="var(--color-accent)" />
        <text x={CENTER_X} y={CENTER_Y + 4} textAnchor="middle" fontSize={9} fill="var(--color-background)">
          chunk
        </text>
        <text x={CENTER_X} y={CENTER_Y + 40} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
          {shorten(data.chunk_id, 28)}
        </text>

        {entityPositions.map((point, index) => {
          const entity = entities[index];
          return (
            <g key={`entity-${entity.canonical_form}-${index}`}>
              <circle cx={point.x} cy={point.y} r={8} fill={kindColor(entity.entity_kind)}>
                <title>{`${entity.canonical_form} · ${entity.entity_kind} · df ${entity.df}`}</title>
              </circle>
              <text x={point.x} y={point.y - 12} textAnchor="middle" fontSize={9} fill="var(--color-muted)">
                {shorten(entity.canonical_form, 18)}
              </text>
            </g>
          );
        })}

        {neighborPositions.map((point, index) => {
          const neighbor = neighbors[index];
          return (
            <g
              key={`neighbor-${neighbor.chunk_id}`}
              role="button"
              tabIndex={0}
              aria-label={`Expand chunk ${neighbor.chunk_id}`}
              style={{ cursor: onSelectChunk ? "pointer" : "default" }}
              onClick={() => onSelectChunk?.(neighbor.chunk_id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectChunk?.(neighbor.chunk_id);
                }
              }}
            >
              <circle cx={point.x} cy={point.y} r={10} fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth={1.5}>
                <title>{`${neighbor.chunk_id} · via ${neighbor.via.map((v) => v.canonical_form).join(", ")}`}</title>
              </circle>
              <text x={point.x} y={point.y + 22} textAnchor="middle" fontSize={9} fill="var(--color-muted)">
                {shorten(neighbor.chunk_id, 16)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="syn-corpus-note">
        Showing {neighbors.length} of {data.neighbor_count} neighboring chunks
        {hidden > 0 ? ` (${hidden} hidden by the ${maxNodes}-node bound)` : ""} · visualization only.
      </figcaption>
    </figure>
  );
}

function ring(count: number, radius: number): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < count; index++) {
    const angle = (2 * Math.PI * index) / Math.max(1, count) - Math.PI / 2;
    points.push({ x: CENTER_X + radius * Math.cos(angle), y: CENTER_Y + radius * Math.sin(angle) });
  }
  return points;
}

function kindColor(kind: string): string {
  return kind === "hard" ? "var(--color-accent)" : "var(--color-muted)";
}

function shorten(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;
}
