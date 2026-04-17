import { describe, it, expect } from "vitest";
import { buildFerryAdjacency, type FerryData } from "../ferry";

const T = (id: string): { id: string; name: string; lat: number; lng: number; routes: string[] } => ({
  id,
  name: id,
  lat: 40.7,
  lng: -74.0,
  routes: [],
});

describe("buildFerryAdjacency", () => {
  it("connects consecutive stops on a single route with given times", () => {
    const data: FerryData = {
      terminals: [T("A"), T("B"), T("C")],
      routes: {
        east: { stops: ["A", "B", "C"], times: [10, 15] },
      },
    };
    const adj = buildFerryAdjacency(data);
    expect(adj["A"]["B"]).toBe(10);
    expect(adj["B"]["C"]).toBe(15);
  });

  it("is bidirectional — ferries run both ways", () => {
    const data: FerryData = {
      terminals: [T("A"), T("B")],
      routes: { east: { stops: ["A", "B"], times: [10] } },
    };
    const adj = buildFerryAdjacency(data);
    expect(adj["A"]["B"]).toBe(10);
    expect(adj["B"]["A"]).toBe(10);
  });

  it("computes transitive shortest paths via Floyd-Warshall", () => {
    const data: FerryData = {
      terminals: [T("A"), T("B"), T("C")],
      routes: {
        east: { stops: ["A", "B", "C"], times: [10, 15] },
      },
    };
    const adj = buildFerryAdjacency(data);
    expect(adj["A"]["C"]).toBe(25);
    expect(adj["C"]["A"]).toBe(25);
  });

  it("picks the shorter path when routes overlap", () => {
    const data: FerryData = {
      terminals: [T("A"), T("B"), T("C")],
      routes: {
        long: { stops: ["A", "B", "C"], times: [10, 15] },
        express: { stops: ["A", "C"], times: [12] },
      },
    };
    const adj = buildFerryAdjacency(data);
    expect(adj["A"]["C"]).toBe(12);
    expect(adj["C"]["A"]).toBe(12);
  });

  it("omits unreachable pairs (no route between them)", () => {
    const data: FerryData = {
      terminals: [T("A"), T("B"), T("X"), T("Y")],
      routes: {
        ab: { stops: ["A", "B"], times: [10] },
        xy: { stops: ["X", "Y"], times: [8] },
      },
    };
    const adj = buildFerryAdjacency(data);
    expect(adj["A"]["X"]).toBeUndefined();
    expect(adj["A"]["Y"]).toBeUndefined();
    expect(adj["A"]["B"]).toBe(10);
    expect(adj["X"]["Y"]).toBe(8);
  });

  it("handles empty data", () => {
    const adj = buildFerryAdjacency({ terminals: [], routes: {} });
    expect(adj).toEqual({});
  });

  it("does not include self-loops", () => {
    const data: FerryData = {
      terminals: [T("A"), T("B")],
      routes: { east: { stops: ["A", "B"], times: [10] } },
    };
    const adj = buildFerryAdjacency(data);
    expect(adj["A"]?.["A"]).toBeUndefined();
    expect(adj["B"]?.["B"]).toBeUndefined();
  });

  it("ignores route stops that reference unknown terminal ids", () => {
    const data: FerryData = {
      terminals: [T("A"), T("B")],
      routes: {
        bad: { stops: ["A", "GHOST", "B"], times: [5, 5] },
      },
    };
    const adj = buildFerryAdjacency(data);
    expect(adj["A"]?.["B"]).toBeUndefined();
  });
});
