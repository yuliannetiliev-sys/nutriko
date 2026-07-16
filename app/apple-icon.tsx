import { ImageResponse } from "next/og";

// iOS „Добави на начален екран" икона (PNG). iOS сам заобля ъглите → пълен квадрат.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const bar = { position: "absolute" as const, background: "#faf6ee", borderRadius: 6 };
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#1f4733",
        }}
      >
        <div style={{ ...bar, left: 50, top: 48, width: 20, height: 84 }} />
        <div style={{ ...bar, left: 110, top: 48, width: 20, height: 84 }} />
        <div style={{ ...bar, left: 50, top: 80, width: 80, height: 20 }} />
      </div>
    ),
    { ...size }
  );
}
