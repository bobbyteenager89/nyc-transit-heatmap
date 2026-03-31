import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const MODE_COLORS: Record<string, string> = {
  subway: "#118ab2",
  walk: "#ffbe0b",
  bike: "#06d6a0",
  car: "#9b5de5",
  bikeSubway: "#0ead69",
  ferry: "#00b4d8",
};

const MODE_LABELS: Record<string, string> = {
  subway: "Subway",
  walk: "Walk",
  bike: "Citi Bike",
  car: "Car",
  bikeSubway: "Bike+Sub",
  ferry: "Ferry",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get("lat") ?? "40.728";
  const lng = searchParams.get("lng") ?? "-73.958";
  const time = searchParams.get("t") ?? "30";
  const modes = (searchParams.get("m") ?? "subway,walk,bike").split(",");
  const address =
    searchParams.get("address") ??
    `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${lng},${lat},12,0/1200x630@2x?access_token=${mapboxToken}`;

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
        {/* Background map */}
        <img
          src={mapUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            opacity: 0.4,
          }}
        />

        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(to bottom, rgba(18,19,26,0.3) 0%, rgba(18,19,26,0.9) 100%)",
            display: "flex",
          }}
        />

        {/* Title */}
        <div
          style={{
            position: "relative",
            padding: "40px 48px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              fontStyle: "italic",
              color: "white",
              lineHeight: 1,
              display: "flex",
            }}
          >
            Isochrone
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              fontStyle: "italic",
              color: "#22d3ee",
              lineHeight: 1,
              display: "flex",
            }}
          >
            NYC
          </div>
        </div>

        {/* Bottom info card */}
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
            <div
              style={{
                fontSize: 24,
                color: "white",
                fontWeight: 700,
                display: "flex",
              }}
            >
              {address}
            </div>
            <div
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.5)",
                display: "flex",
              }}
            >
              {time} min travel radius
            </div>
          </div>

          {/* Mode chips */}
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
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: MODE_COLORS[mode] ?? "#ffffff",
                    display: "flex",
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                    display: "flex",
                  }}
                >
                  {MODE_LABELS[mode] ?? mode}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
