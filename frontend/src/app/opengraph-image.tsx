import { ImageResponse } from "next/og";

import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0d2530",
          color: "#f3f6f5",
          padding: 72,
        }}
      >
        <svg width="260" height="70" viewBox="0 0 260 70">
          <path
            d="M0 40h50l16-34 28 62 20-40h30l14-18 16 36 14-18h72"
            fill="none"
            stroke="#e4572e"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -2 }}>{site.name}</div>
          <div style={{ fontSize: 40, color: "#a9c2c8", marginTop: 16 }}>{site.tagline}</div>
        </div>
        <div style={{ fontSize: 30, color: "#a9c2c8" }}>{`${site.owner}, ${site.location}`}</div>
      </div>
    ),
    size,
  );
}
