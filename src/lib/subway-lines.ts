// Official MTA subway line bullet colors. Keys are route_ids as they appear in
// station-graph.json `lines[]`. Shared by the sidebar PrideStats and the OG card
// (the edge OG route duplicates this map locally — keep them in sync).
export const LINE_COLORS: Record<string, string> = {
  A: "#0039A6", C: "#0039A6", E: "#0039A6",
  B: "#FF6319", D: "#FF6319", F: "#FF6319", M: "#FF6319",
  G: "#6CBE45",
  J: "#996633", Z: "#996633",
  L: "#A7A9AC",
  N: "#FCCC0A", Q: "#FCCC0A", R: "#FCCC0A", W: "#FCCC0A",
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "6": "#00933C",
  "7": "#B933AD",
  S: "#808183", GS: "#808183", FS: "#808183", H: "#808183",
};

// MTA bullet display order.
const ORDER = "ABCDEFGJLMNQRWZ1234567S".split("");

// Collapse GTFS express/shuttle route_ids to the line a rider recognizes:
// "6X"→"6", "FX"→"F", "7X"→"7"; the named shuttles (GS Grand Central,
// FS Franklin Ave, H Rockaway) all show as "S".
export function normalizeLine(line: string): string {
  if (line === "GS" || line === "FS" || line === "H" || line === "S") return "S";
  if (line.length === 2 && line.endsWith("X")) return line[0];
  return line;
}

export function sortLines(lines: string[]): string[] {
  const rank = (l: string) => {
    const i = ORDER.indexOf(l[0]);
    return i === -1 ? 99 : i;
  };
  return [...new Set(lines.map(normalizeLine))].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b)
  );
}

// Yellow (N/Q/R/W) and light-gray (L) bullets need dark text for contrast.
export function lineTextColor(line: string): string {
  const c = line[0];
  return c === "N" || c === "Q" || c === "R" || c === "W" || c === "L" ? "#000" : "#fff";
}
