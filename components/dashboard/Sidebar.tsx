import React from "react";
import { FirebaseUser, AniListUser, TraktUser } from "@/types";
import { isSafeImageUrl } from "@/lib/safe-url";

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
  letterboxdUsername: string | null;
  connectLetterboxd: () => void;
  disconnectLetterboxd: () => void;
  syncLetterboxd?: () => void;
  isSyncingLetterboxd?: boolean;
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

const navLinkClass = (active: boolean) =>
  `mb-1 flex cursor-pointer items-center gap-3 rounded-lg px-3.5 py-2.5 text-[13px] font-medium no-underline transition-all duration-200 ${
    active
      ? "bg-bg-primary font-semibold text-text-primary"
      : "text-text-secondary hover:bg-bg-primary hover:text-text-primary"
  }`;

const sidebarActionBtnClass =
  "flex h-6 w-6 cursor-pointer items-center justify-center rounded border-none bg-transparent text-text-muted transition-all duration-200 hover:bg-bg-primary hover:text-text-primary";

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
  letterboxdUsername,
  connectLetterboxd,
  disconnectLetterboxd,
  syncLetterboxd,
  isSyncingLetterboxd,
  showInvestmentsTab,
  setShowOnboarding,
  triggerConfirm,
  firebaseAuth,
  setExpenses,
  setWatchlist,
  setExpensesLoaded,
}) => {
  return (
    <aside className="fixed top-0 bottom-0 left-0 z-[100] flex w-[250px] flex-col justify-between border-r border-border-subtle bg-bg-sidebar px-4 py-6 max-md:hidden min-[769px]:max-[1100px]:w-[210px]">
      {/* Brand Header */}
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1.6" y="1.6" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" />
          <rect x="11.2" y="1.6" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.55" />
          <rect x="1.6" y="11.2" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.55" />
          <rect x="11.2" y="11.2" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.85" />
        </svg>
        <div>
          <span className="text-base font-bold tracking-[-0.3px]">PHub Dashboard</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
        <div onClick={() => setActiveTab("expenses")} className={navLinkClass(activeTab === "expenses")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <span>Expenses &amp; Subs</span>
        </div>
        <div onClick={() => setActiveTab("financial")} className={navLinkClass(activeTab === "financial")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <span>Financial Health</span>
        </div>
        <div onClick={() => setActiveTab("media")} className={navLinkClass(activeTab === "media")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          <span>Media Watchlist</span>
        </div>
        <div onClick={() => setActiveTab("books")} className={navLinkClass(activeTab === "books")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>Book Library</span>
        </div>
        <div onClick={() => setActiveTab("notes")} className={navLinkClass(activeTab === "notes")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Quick Notes</span>
        </div>
        {showInvestmentsTab && (
          <div onClick={() => setActiveTab("investments")} className={navLinkClass(activeTab === "investments")}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Investments</span>
          </div>
        )}
        <div onClick={() => setActiveTab("reports")} className={navLinkClass(activeTab === "reports")}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Reports</span>
        </div>

        {/* Integrations Section */}
        <div className="mt-5 flex flex-col gap-1.5 border-t border-border-subtle pt-3.5">
          <span className="block px-2 pb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.8px] text-text-secondary">Integrations</span>

          {anilistUser ? (
            <div className="mb-1 flex cursor-default items-center justify-between gap-3 rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-text-secondary transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">
              <div className="flex min-w-0 items-center gap-2">
                {isSafeImageUrl(anilistUser.avatar) ? <img src={anilistUser.avatar} alt="" className="h-[18px] w-[18px] rounded-full" /> : <span>🌸</span>}
                <div className="overflow-hidden">
                  <p className="text-[11px] font-semibold">AniList</p>
                  <p className="overflow-hidden text-ellipsis text-[9px] text-text-muted">{anilistUser.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {syncAnilist && (
                  <button onClick={syncAnilist} disabled={isSyncingAnilist} title="Sync AniList Library" className={`${sidebarActionBtnClass} p-1`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isSyncingAnilist ? "animate-spin" : ""}>
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </button>
                )}
                <button onClick={disconnectAnilist} title="Disconnect AniList" className={`${sidebarActionBtnClass} p-1`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={connectAnilist} className={`${navLinkClass(false)} w-full border-none bg-transparent text-left`}>
              <svg width="13" height="13" viewBox="0 0 512 512" fill="none">
                <path d="M321.92 323.27V136.6c0-10.698-5.887-16.602-16.558-16.602h-36.433c-10.672 0-16.561 5.904-16.561 16.602v88.651c0 2.497 23.996 14.089 24.623 16.541 18.282 71.61 3.972 128.92-13.359 131.6 28.337 1.405 31.455 15.064 10.348 5.731 3.229-38.209 15.828-38.134 52.049-1.406.31.317 7.427 15.282 7.87 15.282h85.545c10.672 0 16.558-5.9 16.558-16.6v-36.524c0-10.698-5.886-16.602-16.558-16.602z" fill="#02a9ff"/>
                <path d="M170.68 120 74.999 393h74.338l16.192-47.222h80.96L262.315 393h73.968l-95.314-273zm11.776 165.28 23.183-75.629 25.393 75.629z" fill="currentColor"/>
              </svg>
              Connect AniList
            </button>
          )}

          {traktUser ? (
            <div className="mb-1 flex cursor-default items-center justify-between gap-3 rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-text-secondary transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">
              <div className="flex min-w-0 items-center gap-2">
                {isSafeImageUrl(traktUser.avatar) ? <img src={traktUser.avatar} alt="" className="h-[18px] w-[18px] rounded-full" /> : <span>🔴</span>}
                <div className="overflow-hidden">
                  <p className="text-[11px] font-semibold">Trakt</p>
                  <p className="overflow-hidden text-ellipsis text-[9px] text-text-muted">{traktUser.name || traktUser.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {syncTrakt && (
                  <button onClick={syncTrakt} disabled={isSyncingTrakt} title="Sync Trakt Library" className={`${sidebarActionBtnClass} p-1`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isSyncingTrakt ? "animate-spin" : ""}>
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </button>
                )}
                <button onClick={disconnectTrakt} title="Disconnect Trakt" className={`${sidebarActionBtnClass} p-1`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={connectTrakt} className={`${navLinkClass(false)} w-full border-none bg-transparent text-left`}>
              <svg width="13" height="13" viewBox="0 0 48 48" fill="none">
                <defs>
                  <radialGradient id="trakt-sidebar-grad" cx="48.46" cy="-.95" r="64.84" fx="48.46" fy="-.95" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#9f42c6"/>
                    <stop offset=".27" stopColor="#a041c3"/>
                    <stop offset=".42" stopColor="#a43ebb"/>
                    <stop offset=".53" stopColor="#aa39ad"/>
                    <stop offset=".64" stopColor="#b4339a"/>
                    <stop offset=".73" stopColor="#c02b81"/>
                    <stop offset=".82" stopColor="#cf2061"/>
                    <stop offset=".9" stopColor="#e1143c"/>
                    <stop offset=".97" stopColor="#f50613"/>
                    <stop offset="1" stopColor="red"/>
                  </radialGradient>
                </defs>
                <path d="M48 11.26v25.47C48 42.95 42.95 48 36.73 48H11.26C5.04 48 0 42.95 0 36.73V11.26C0 5.04 5.04 0 11.26 0h25.47a11.24 11.24 0 0 1 9.62 5.4c.18.29.34.59.5.89.33.68.6 1.39.79 2.14.1.37.18.76.23 1.15.09.54.13 1.11.13 1.68Z" fill="url(#trakt-sidebar-grad)"/>
                <path d="m13.62 17.97 7.92 7.92 1.47-1.47-7.92-7.92-1.47 1.47Zm14.39 14.4 1.47-1.46-2.16-2.16L47.64 8.43c-.19-.75-.46-1.46-.79-2.14L24.39 28.75l3.62 3.62Zm-15.09-13.7-1.46 1.46 14.4 14.4 1.46-1.47L23 28.75 46.35 5.4c-.36-.6-.78-1.16-1.25-1.68L21.54 27.28l-8.62-8.61Zm34.95-9.09L28.7 28.75l1.47 1.46L48 12.38v-1.12c0-.57-.04-1.14-.13-1.68ZM25.16 22.27l-7.92-7.92-1.47 1.47 7.92 7.92 1.47-1.47Zm16.16 12.85c0 3.42-2.78 6.2-6.2 6.2H12.88c-3.42 0-6.2-2.78-6.2-6.2V12.88c0-3.42 2.78-6.21 6.2-6.21h20.78V4.6H12.88c-4.56 0-8.28 3.71-8.28 8.28v22.24c0 4.56 3.71 8.28 8.28 8.28h22.24c4.56 0 8.28-3.71 8.28-8.28v-3.51h-2.07v3.51Z" fill="#fff"/>
              </svg>
              Connect Trakt
            </button>
          )}

          {letterboxdUsername ? (
            <div className="mb-1 flex cursor-default items-center justify-between gap-3 rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-text-secondary transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#1c1b18] text-white">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle cx="7" cy="12" r="3.5" fill="#ff7a00" />
                    <circle cx="12" cy="12" r="3.5" fill="#00e054" />
                    <circle cx="17" cy="12" r="3.5" fill="#00b0ea" />
                  </svg>
                </span>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-semibold">Letterboxd</p>
                  <p className="overflow-hidden text-ellipsis text-[9px] text-text-muted">{letterboxdUsername}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {syncLetterboxd && (
                  <button onClick={syncLetterboxd} disabled={isSyncingLetterboxd} title="Sync Letterboxd Feed" className={`${sidebarActionBtnClass} p-1`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isSyncingLetterboxd ? "animate-spin" : ""}>
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </button>
                )}
                <button onClick={disconnectLetterboxd} title="Disconnect Letterboxd" className={`${sidebarActionBtnClass} p-1`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <button onClick={connectLetterboxd} className={`${navLinkClass(false)} w-full border-none bg-transparent text-left`}>
              <span className="mr-2.5 inline-flex h-[13px] w-[13px] items-center justify-center rounded-full bg-[#1c1b18]">
                <svg className="h-[9px] w-[9px]" viewBox="0 0 24 24" fill="none">
                  <circle cx="7" cy="12" r="3.5" fill="#ff7a00" />
                  <circle cx="12" cy="12" r="3.5" fill="#00e054" />
                  <circle cx="17" cy="12" r="3.5" fill="#00b0ea" />
                </svg>
              </span>
              Connect Letterboxd
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex flex-col gap-1">
        <div className="border-t border-border-subtle my-2 mx-1" />
        <a href="/assistant" className="mb-1 flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium text-text-secondary no-underline transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/></svg>
          Connect AI Agent
        </a>
        <a href="/api/openapi.json" target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium text-text-secondary no-underline transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>
          OpenAPI Spec
        </a>
        <button onClick={() => setShowOnboarding(true)} className="mb-2 flex w-full cursor-pointer items-center gap-3 rounded-lg border-none bg-transparent px-3.5 py-2.5 text-left text-xs font-medium text-text-secondary transition-all duration-200 hover:bg-bg-primary hover:text-text-primary">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Feature Guide
        </button>

        {user && (
          <div className="mt-4 flex items-center gap-2.5 border-t border-border-subtle px-3.5 py-3">
            {isSafeImageUrl(user.photoURL) ? (
              <img src={user.photoURL} alt="profile" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary text-[13px] font-semibold text-white">
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-text-primary">{user.displayName || "User"}</p>
              <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-text-muted">{user.email}</p>
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
              className={`${sidebarActionBtnClass} p-1.5`}
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
