import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Duplicated from src/lib/subway-lines.ts — the edge route can't share the lib
// reliably across the runtime boundary. Keep in sync.
const LINE_COLORS: Record<string, string> = {
  A: "#0039A6", C: "#0039A6", E: "#0039A6",
  B: "#FF6319", D: "#FF6319", F: "#FF6319", M: "#FF6319",
  G: "#6CBE45", J: "#996633", Z: "#996633", L: "#A7A9AC",
  N: "#FCCC0A", Q: "#FCCC0A", R: "#FCCC0A", W: "#FCCC0A",
  "1": "#EE352E", "2": "#EE352E", "3": "#EE352E",
  "4": "#00933C", "5": "#00933C", "6": "#00933C",
  "7": "#B933AD", S: "#808183", GS: "#808183", FS: "#808183", H: "#808183",
};

function lineText(line: string): string {
  const c = line[0];
  return c === "N" || c === "Q" || c === "R" || c === "W" || c === "L" ? "#000" : "#fff";
}

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return Math.round(n / 1000) + "k";
  return new Intl.NumberFormat("en-US").format(n);
}

// Deterministic ~100m offset for the rendered pin so the public card never
// shows the exact dropped location. No Math.random — edge runtime + reproducible.
function hashFuzz(lat: number, lng: number): [number, number] {
  const h = Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453;
  const f = h - Math.floor(h);
  const ang = f * Math.PI * 2;
  const r = 0.0009;
  return [Math.cos(ang) * r, Math.sin(ang) * r * 0.78];
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const safeLat = Math.max(-90, Math.min(90, Number(searchParams.get("lat")) || 40.728));
  const safeLng = Math.max(-180, Math.min(180, Number(searchParams.get("lng")) || -73.958));
  const time = String(Math.max(1, Math.min(60, Number(searchParams.get("t")) || 30)));
  const rawAddress = searchParams.get("address") ?? `${safeLat.toFixed(4)}, ${safeLng.toFixed(4)}`;
  const address = rawAddress.slice(0, 60);

  const intParam = (k: string) => Math.max(0, Math.min(99_999_999, Number(searchParams.get(k)) || 0));
  const pop = intParam("pop");
  const rest = intParam("rest");
  const cafe = intParam("cafe");
  const bar = intParam("bar");
  const park = intParam("park");
  const lines = (searchParams.get("lines") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);
  const hasStats = pop > 0 || rest > 0;

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) {
    return new Response("Missing Mapbox token", { status: 500 });
  }
  const [dLat, dLng] = hashFuzz(safeLat, safeLng);
  const pinLat = safeLat + dLat;
  const pinLng = safeLng + dLng;
  const pin = `pin-l+22d3ee(${pinLng},${pinLat})`;
  // Left half of the 1200×630 card is 600px wide
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${pin}/${pinLng},${pinLat},12,0/600x630@2x?access_token=${mapboxToken}`;

  // Supporting stats: restaurant, coffee, bars, parks in a 2×2 grid
  const gridStats: [number, string, string][] = [
    [rest, "RESTAURANTS", "#ffbe0b"],
    [cafe, "COFFEE SHOPS", "#06d6a0"],
    [bar, "BARS", "#f97316"],
    [park, "PARKS", "#00b4d8"],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          fontFamily: "Arial",
          overflow: "hidden",
        }}
      >
        {/* LEFT: map panel */}
        <div style={{ width: 600, height: 630, position: "relative", display: "flex", overflow: "hidden" }}>
          <img src={mapUrl} style={{ position: "absolute", top: 0, left: 0, width: 600, height: 630 }} />
          {/* Isochrone glow simulation — radial gradient circles */}
          <div style={{
            position: "absolute",
            width: 360, height: 360,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(57,255,20,0.32) 0%, rgba(255,190,11,0.18) 38%, rgba(243,115,22,0.10) 58%, transparent 78%)",
            top: 135, left: 120,
            display: "flex",
          }} />
          {/* Right-edge fade into the dark right panel */}
          <div style={{
            position: "absolute",
            top: 0, right: 0,
            width: 120, height: 630,
            background: "linear-gradient(to left, #0d0f1a 0%, transparent 100%)",
            display: "flex",
          }} />
        </div>

        {/* RIGHT: stats panel */}
        <div
          style={{
            width: 600,
            height: 630,
            background: "#0d0f1a",
            display: "flex",
            flexDirection: "column",
            padding: "36px 44px",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Wordmark — Knicks split-bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
            <div style={{
              width: 9, height: 52, borderRadius: 3,
              background: "linear-gradient(#006BB6 50%, #F58426 50%)",
              display: "flex", flexShrink: 0,
            }} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
              <div style={{ fontSize: 30, fontWeight: 900, fontStyle: "italic", color: "white", display: "flex" }}>Isochrone</div>
              <div style={{ fontSize: 30, fontWeight: 900, fontStyle: "italic", color: "#F58426", display: "flex" }}>NYC</div>
            </div>
          </div>

          {/* Address + time */}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", letterSpacing: 2, marginBottom: 24, display: "flex" }}>
            {`${address.toUpperCase()} · ${time} MIN`}
          </div>

          {hasStats ? (
            <>
              {/* Hero population stat */}
              <div style={{ display: "flex", flexDirection: "column", marginBottom: 28 }}>
                <div style={{ fontSize: 68, fontWeight: 700, color: "#39ff14", lineHeight: 1, display: "flex" }}>
                  {fmt(pop)}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", letterSpacing: 2, marginTop: 5, display: "flex" }}>
                  PEOPLE WITHIN REACH
                </div>
              </div>

              {/* 2×2 supporting stats */}
              <div style={{ display: "flex", flexWrap: "wrap", width: "100%", marginBottom: 24 }}>
                {gridStats.map(([val, label, color]) => (
                  <div key={label} style={{ display: "flex", flexDirection: "column", width: "50%", marginBottom: 16 }}>
                    <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1, display: "flex" }}>
                      {val > 0 ? fmt(val) : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", letterSpacing: 1.5, marginTop: 4, display: "flex" }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Walkable subway lines */}
              {lines.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", letterSpacing: 1.5, display: "flex" }}>
                    LINES · 15 MIN WALK
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {lines.map((l) => (
                      <div
                        key={l}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28, height: 28,
                          borderRadius: 14,
                          background: LINE_COLORS[l] ?? "#666",
                          color: lineText(l),
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 28, color: "white", fontWeight: 700, display: "flex" }}>{address}</div>
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.45)", display: "flex" }}>{time}-min transit reach</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.28)", marginTop: 8, display: "flex" }}>
                Drop a pin to explore yours →
              </div>
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    }
  );
}
