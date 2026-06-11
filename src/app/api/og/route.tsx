import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const MODE_COLORS: Record<string, string> = {
  subway: "#118ab2",
  bus: "#f97316",
  walk: "#ffbe0b",
  bike: "#06d6a0",
  car: "#9b5de5",
  ferry: "#00b4d8",
};

const MODE_LABELS: Record<string, string> = {
  subway: "Subway",
  bus: "Bus",
  walk: "Walk",
  bike: "Citi Bike",
  car: "Car",
  ferry: "Ferry",
};

const VALID_MODES = new Set(Object.keys(MODE_LABELS));

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
  const modes = (searchParams.get("m") ?? "subway,walk,bike")
    .split(",")
    .filter((m) => VALID_MODES.has(m));
  const rawAddress = searchParams.get("address") ?? `${safeLat.toFixed(4)}, ${safeLng.toFixed(4)}`;
  const address = rawAddress.slice(0, 100);

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
    .slice(0, 16);
  const hasStats = pop > 0 || rest > 0 || lines.length > 0;

  const statItems: [number, string, string][] = [
    [pop, "PEOPLE", "#39ff14"],
    [rest, "RESTAURANTS", "#ffbe0b"],
    [cafe, "COFFEE", "#06d6a0"],
    [bar, "BARS & CLUBS", "#f97316"],
    [park, "PARKS", "#00b4d8"],
    [lines.length, "SUBWAY LINES", "#118ab2"],
  ];

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) {
    return new Response("Missing Mapbox token", { status: 500 });
  }
  const [dLat, dLng] = hashFuzz(safeLat, safeLng);
  const pinLat = safeLat + dLat;
  const pinLng = safeLng + dLng;
  const pin = `pin-l+22d3ee(${pinLng},${pinLat})`;
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${pin}/${pinLng},${pinLat},12,0/1200x630@2x?access_token=${mapboxToken}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontFamily: "Arial",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <img
          src={mapUrl}
          style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, opacity: 0.85 }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(to bottom, rgba(18,19,26,0.15) 0%, rgba(18,19,26,0.75) 100%)",
            display: "flex",
          }}
        />

        {/* Wordmark — Knicks split-bar mark */}
        <div style={{ position: "relative", padding: "40px 48px", display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 10,
              height: 56,
              borderRadius: 3,
              marginRight: 16,
              background: "linear-gradient(#006BB6 50%, #F58426 50%)",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 50, fontWeight: 900, fontStyle: "italic", color: "white", lineHeight: 1, display: "flex" }}>
              Isochrone
            </div>
            <div style={{ fontSize: 50, fontWeight: 900, fontStyle: "italic", color: "#F58426", lineHeight: 1, display: "flex" }}>
              NYC
            </div>
          </div>
        </div>

        {hasStats ? (
          <div
            style={{
              position: "relative",
              margin: "0 48px 40px",
              background: "rgba(20,22,30,0.86)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: "24px 32px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", fontSize: 18, color: "rgba(255,255,255,0.6)", marginBottom: 18, letterSpacing: 1 }}>
              {`${address.toUpperCase()} · ${time} MIN · ${modes.map((m) => MODE_LABELS[m] ?? m).join(" · ").toUpperCase()}`}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", width: "100%" }}>
              {statItems.map(([value, label, color]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", width: "33%", marginBottom: 16 }}>
                  <div style={{ display: "flex", fontSize: 46, fontWeight: 700, color, lineHeight: 1 }}>
                    {fmt(value)}
                  </div>
                  <div style={{ display: "flex", fontSize: 15, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
            {lines.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", marginTop: 2 }}>
                <span style={{ display: "flex", fontSize: 15, color: "rgba(255,255,255,0.6)", marginRight: 10 }}>LINES</span>
                {lines.map((l) => (
                  <div
                    key={l}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      marginRight: 6,
                      background: LINE_COLORS[l] ?? "#666",
                      color: lineText(l),
                      fontSize: 17,
                      fontWeight: 700,
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              margin: "0 48px 40px",
              background: "rgba(26,27,36,0.85)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "24px 32px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 24, color: "white", fontWeight: 700, display: "flex" }}>{address}</div>
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.5)", display: "flex" }}>{time} min travel radius</div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {modes.map((mode) => (
                <div
                  key={mode}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    padding: "8px 14px",
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: MODE_COLORS[mode] ?? "#ffffff", display: "flex" }} />
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", display: "flex" }}>
                    {MODE_LABELS[mode] ?? mode}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    }
  );
}
