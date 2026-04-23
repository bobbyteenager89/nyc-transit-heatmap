import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#12131a",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 0.9,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              fontStyle: "italic",
              color: "white",
              display: "flex",
            }}
          >
            ISO
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              fontStyle: "italic",
              color: "#22d3ee",
              display: "flex",
            }}
          >
            NYC
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
