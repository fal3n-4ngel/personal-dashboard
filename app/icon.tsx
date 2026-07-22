import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
          backgroundColor: "#f4f3ec",
        }}
      >
        <div style={{ display: "flex", gap: "2px" }}>
          <div style={{ display: "flex", width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#1c1b18", border: "none" }} />
          <div style={{ display: "flex", width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#1c1b18", opacity: 0.55, border: "none" }} />
        </div>
        <div style={{ display: "flex", gap: "2px" }}>
          <div style={{ display: "flex", width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#1c1b18", opacity: 0.55, border: "none" }} />
          <div style={{ display: "flex", width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#1c1b18", opacity: 0.85, border: "none" }} />
        </div>
      </div>
    ),
    { ...size }
  );
}
