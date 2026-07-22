import React from "react";
import { FirebaseUser, AniListUser, TraktUser } from "@/types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: FirebaseUser | null;
  anilistUser: AniListUser | null;
  traktUser: TraktUser | null;
  connectAnilist: () => void;
  disconnectAnilist: () => void;
  syncAnilist?: () => void;
  isSyncingAnilist?: boolean;
  connectTrakt: () => void;
  disconnectTrakt: () => void;
  syncTrakt?: () => void;
  isSyncingTrakt?: boolean;
  showInvestmentsTab: boolean;
  setShowOnboarding: (show: boolean) => void;
  triggerConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    isDestructive?: boolean,
    confirmText?: string
  ) => void;
  firebaseAuth: any;
  setExpenses: (val: any[]) => void;
  setWatchlist: (val: any[]) => void;
  setExpensesLoaded: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  user,
  anilistUser,
  traktUser,
  connectAnilist,
  disconnectAnilist,
  syncAnilist,
  isSyncingAnilist,
  connectTrakt,
  disconnectTrakt,
  syncTrakt,
  isSyncingTrakt,
  showInvestmentsTab,
  setShowOnboarding,
  triggerConfirm,
  firebaseAuth,
  setExpenses,
  setWatchlist,
  setExpensesLoaded,
}) => {
  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 8px", marginBottom: "24px" }}>
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1.6" y="1.6" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" />
          <rect x="11.2" y="1.6" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.55" />
          <rect x="1.6" y="11.2" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.55" />
          <rect x="11.2" y="11.2" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.85" />
        </svg>
        <div>
          <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px" }}>PHub Dashboard</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, overflowY: "auto" }}>
        <div
          onClick={() => setActiveTab("expenses")}
          className={`nav-link ${activeTab === "expenses" ? "active" : ""}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <span>Expenses &amp; Subs</span>
        </div>
        <div
          onClick={() => setActiveTab("media")}
          className={`nav-link ${activeTab === "media" ? "active" : ""}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          <span>Media Watchlist</span>
        </div>
        <div
          onClick={() => setActiveTab("books")}
          className={`nav-link ${activeTab === "books" ? "active" : ""}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>Book Library</span>
        </div>
        <div
          onClick={() => setActiveTab("notes")}
          className={`nav-link ${activeTab === "notes" ? "active" : ""}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Quick Notes</span>
        </div>
        {showInvestmentsTab && (
          <div
            onClick={() => setActiveTab("investments")}
            className={`nav-link ${activeTab === "investments" ? "active" : ""}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Investments</span>
          </div>
        )}

        {/* Integrations Section */}
        <div style={{ marginTop: "20px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "6px" }}>
          <span className="label-mono" style={{ padding: "0 8px 4px", display: "block" }}>Integrations</span>
          
          {anilistUser ? (
            <div className="nav-link" style={{ justifyContent: "space-between", cursor: "default", padding: "6px 8px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", minWidth: 0 }}>
                {anilistUser.avatar ? <img src={anilistUser.avatar} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%" }} /> : <span>🌸</span>}
                <div style={{ overflow: "hidden" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600 }}>AniList</p>
                  <p style={{ fontSize: "9px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{anilistUser.name}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {syncAnilist && (
                  <button onClick={syncAnilist} disabled={isSyncingAnilist} title="Sync AniList Library" className="sidebar-action-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isSyncingAnilist ? "spin 1s linear infinite" : "none" }}>
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </button>
                )}
                <button onClick={disconnectAnilist} title="Disconnect AniList" className="sidebar-action-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={connectAnilist} className="nav-link" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Connect AniList
            </button>
          )}

          {traktUser ? (
            <div className="nav-link" style={{ justifyContent: "space-between", cursor: "default", padding: "6px 8px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", minWidth: 0 }}>
                {traktUser.avatar ? <img src={traktUser.avatar} alt="" style={{ width: "18px", height: "18px", borderRadius: "50%" }} /> : <span>🔴</span>}
                <div style={{ overflow: "hidden" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600 }}>Trakt</p>
                  <p style={{ fontSize: "9px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>{traktUser.name || traktUser.username}</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                {syncTrakt && (
                  <button onClick={syncTrakt} disabled={isSyncingTrakt} title="Sync Trakt Library" className="sidebar-action-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: isSyncingTrakt ? "spin 1s linear infinite" : "none" }}>
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </button>
                )}
                <button onClick={disconnectTrakt} title="Disconnect Trakt" className="sidebar-action-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={connectTrakt} className="nav-link" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Connect Trakt
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
        <a href="/assistant" className="nav-link" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "14px", borderRadius: 0, fontSize: "12px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>
          Connect AI Agent
        </a>
        <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ fontSize: "12px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>
          OpenAPI Spec
        </a>
        <button onClick={() => setShowOnboarding(true)} className="nav-link" style={{ width: "100%", textAlign: "left", marginBottom: "8px", fontSize: "12px", border: "none", background: "none", cursor: "pointer" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Feature Guide
        </button>

        {user && (
          <div className="profile-card" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 8px" }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="profile" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} referrerPolicy="no-referrer" />
            ) : (
              <div className="profile-avatar" style={{ width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-secondary)", fontWeight: 600 }}>
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-primary)" }}>{user.displayName || "User"}</p>
              <p style={{ fontSize: "10px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>
            </div>
            <button
              onClick={() => {
                triggerConfirm("Sign Out", "Are you sure you want to sign out?", async () => {
                  if (firebaseAuth) {
                    await firebaseAuth.signOut(firebaseAuth.auth);
                    setExpenses([]);
                    setWatchlist([]);
                    setExpensesLoaded(false);
                    disconnectAnilist();
                    disconnectTrakt();
                  }
                }, false, "Sign Out");
              }}
              title="Sign out"
              className="sidebar-action-btn"
              style={{ padding: "6px" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
