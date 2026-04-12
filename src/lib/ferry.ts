export interface FerryTerminal {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}

export interface FerryRoute {
  stops: string[];
  times: number[]; // minutes between consecutive stops
}

export interface FerryData {
  terminals: FerryTerminal[];
  routes: Record<string, FerryRoute>;
}

/** Pre-computed adjacency: terminalId → { neighborId → travel time in minutes } */
export type FerryAdjacency = Record<string, Record<string, number>>;

let cached: { data: FerryData; adjacency: FerryAdjacency } | null = null;

export async function loadFerryData(): Promise<{ data: FerryData; adjacency: FerryAdjacency }> {
  if (cached) return cached;
  const res = await fetch("/data/ferry-terminals.json");
  if (!res.ok) return { data: { terminals: [], routes: {} }, adjacency: {} };
  const data: FerryData = await res.json();
  const adjacency = buildFerryAdjacency(data);
  cached = { data, adjacency };
  return cached;
}

/**
 * Build adjacency graph from route data.
 * For each route, consecutive stops are connected with the given time.
 * We also compute shortest paths between all terminals sharing any route
 * (via simple Floyd-Warshall on the small terminal set).
 */
export function buildFerryAdjacency(data: FerryData): FerryAdjacency {
  const ids = data.terminals.map((t) => t.id);
  const idIdx = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;

  // Initialize distance matrix
  const dist: number[][] = Array.from({ length: n }, () => Array(n).fill(Infinity));
  for (let i = 0; i < n; i++) dist[i][i] = 0;

  // Add edges from routes
  for (const route of Object.values(data.routes)) {
    for (let i = 0; i < route.stops.length - 1; i++) {
      const a = idIdx.get(route.stops[i]);
      const b = idIdx.get(route.stops[i + 1]);
      if (a === undefined || b === undefined) continue;
      const t = route.times[i];
      // Bidirectional — ferries run both ways
      if (t < dist[a][b]) { dist[a][b] = t; dist[b][a] = t; }
    }
  }

  // Floyd-Warshall for all-pairs shortest path
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
        }
      }
    }
  }

  // Convert to adjacency map (only include reachable pairs)
  const adj: FerryAdjacency = {};
  for (let i = 0; i < n; i++) {
    adj[ids[i]] = {};
    for (let j = 0; j < n; j++) {
      if (i !== j && dist[i][j] < Infinity) {
        adj[ids[i]][ids[j]] = dist[i][j];
      }
    }
  }
  return adj;
}
