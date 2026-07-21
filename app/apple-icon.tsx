import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexWrap: "wrap",
          alignContent: "center",
          justifyContent: "center",
          gap: "10px",
          backgroundColor: "#1c1b18",
          padding: "36px",
        }}
      >
        <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: "#ffffff" }} />
        <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: "#ffffff", opacity: 0.55 }} />
        <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: "#ffffff", opacity: 0.55 }} />
        <div style={{ display: "flex", width: "56px", height: "56px", borderRadius: "12px", backgroundColor: "#ffffff", opacity: 0.85 }} />
      </div>
    ),
    { ...size }
  );
}
