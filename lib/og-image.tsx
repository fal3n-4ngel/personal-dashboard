// Shared JSX tree for the social preview images (opengraph-image.tsx and
// twitter-image.tsx both render this at 1200x630 via next/og's ImageResponse).
export function SocialCard() {
  const pills = ["Expenses", "Watchlist", "Investments", "Books", "AI Agent"];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#f4f3ec",
        padding: "72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "58px",
            height: "58px",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ display: "flex", width: "25px", height: "25px", borderRadius: "6px", backgroundColor: "#1c1b18", border: "none" }} />
            <div style={{ display: "flex", width: "25px", height: "25px", borderRadius: "6px", backgroundColor: "#1c1b18", opacity: 0.55, border: "none" }} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ display: "flex", width: "25px", height: "25px", borderRadius: "6px", backgroundColor: "#1c1b18", opacity: 0.55, border: "none" }} />
            <div style={{ display: "flex", width: "25px", height: "25px", borderRadius: "6px", backgroundColor: "#1c1b18", opacity: 0.85, border: "none" }} />
          </div>
        </div>
        <div style={{ display: "flex", fontSize: "32px", fontWeight: 700, color: "#1c1b18", letterSpacing: "-1px" }}>
          PHub Dashboard
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: "72px", fontWeight: 800, color: "#1c1b18", letterSpacing: "-3px", lineHeight: 1.05 }}>
          One dashboard.
        </div>
        <div style={{ display: "flex", fontSize: "72px", fontWeight: 800, color: "#6e6c64", letterSpacing: "-3px", lineHeight: 1.05 }}>
          Everything you track.
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {pills.map((label) => (
          <div
            key={label}
            style={{
              display: "flex",
              fontSize: "26px",
              fontWeight: 600,
              color: "#1c1b18",
              backgroundColor: "#ffffff",
              border: "2px solid #e5e3db",
              borderRadius: "9999px",
              padding: "14px 30px",
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
