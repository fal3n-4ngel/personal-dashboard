import React from "react";

interface OnboardingModalProps {
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;
  showInvestmentsTab: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  showOnboarding,
  setShowOnboarding,
  showInvestmentsTab,
}) => {
  if (!showOnboarding) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={() => setShowOnboarding(false)}
    >
      <div
        className="bento-card"
        style={{
          width: "100%",
          maxWidth: "540px",
          maxHeight: "88vh",
          overflowY: "auto",
          padding: "32px",
          display: "flex",
          flexDirection: "column",
          gap: "22px",
          animation: "fadeInScale 0.15s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <svg width="34" height="34" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect x="1.6" y="1.6" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" />
              <rect x="11.2" y="1.6" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.55" />
              <rect x="1.6" y="11.2" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.55" />
              <rect x="11.2" y="11.2" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.85" />
            </svg>
            <div>
              <p style={{ fontWeight: 700, fontSize: "18px", letterSpacing: "-0.3px", lineHeight: 1.2 }}>Welcome to PHub</p>
              <p className="label-mono" style={{ marginTop: "2px" }}>Personal Hub</p>
            </div>
          </div>
          <button
            onClick={() => setShowOnboarding(false)}
            style={{ backgroundColor: "var(--bg-secondary)", padding: "8px", borderRadius: "8px", color: "var(--text-muted)", border: "none", flexShrink: 0, display: "flex", cursor: "pointer" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "-10px" }}>Here's everything you've got in one place:</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {[
            { icon: "💸", bg: "#fde8e4", title: "Expense Ledger", desc: "Log transactions, tag categories, and set a custom salary-cycle day to see spending by pay period instead of calendar month." },
            ...(showInvestmentsTab ? [{ icon: "📈", bg: "#dcfce7", title: "Investments", desc: "Track equities, crypto, mutual funds, gold, and cash in one portfolio view." }] : []),
            { icon: "🎬", bg: "#ede9fe", title: "Watchlist", desc: "Movies, shows, and anime in one place — sync bidirectionally with AniList & Trakt, or import a Letterboxd CSV export." },
            { icon: "📚", bg: "#fef9c3", title: "Book Library", desc: "Search OpenLibrary to add books and track your reading progress." },
            { icon: "🔄", bg: "#dbeafe", title: "Subscriptions", desc: "Keep tabs on recurring monthly/yearly costs and your true effective monthly spend." },
            { icon: "📝", bg: "#f4f3ec", title: "Notes", desc: "A lightweight, auto-saving scratchpad for quick thoughts." },
            { icon: "🤖", bg: "#d1fae5", title: "AI Assistant", desc: "Connect ChatGPT, Claude, or Gemini via Permanent API Key & OpenAPI — log expenses or update your watchlist by chatting." },
          ].map((f) => (
            <div key={f.title} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: f.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                {f.icon}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "13.5px" }}>{f.title}</p>
                <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.5, marginTop: "2px" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <a
            href="/assistant"
            className="btn-secondary"
            style={{ flex: "1 1 200px", textAlign: "center", textDecoration: "none" }}
          >
            Connect AI Agent →
          </a>
          <button
            onClick={() => setShowOnboarding(false)}
            className="btn-primary"
            style={{ flex: "1 1 200px" }}
          >
            Let's go
          </button>
        </div>
      </div>
    </div>
  );
};
