import React from "react";
import { FirebaseUser } from "@/types";
import { isSafeImageUrl } from "@/lib/safe-url";

interface MobileHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: FirebaseUser | null;
  showInvestmentsTab: boolean;
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
  disconnectAnilist: () => void;
  disconnectTrakt: () => void;
}

const mobileNavLinkClass = (active: boolean) =>
  `relative flex min-h-[44px] flex-1 cursor-pointer flex-col items-center justify-center gap-[3px] px-1.5 pt-2 pb-1.5 text-[10px] font-medium no-underline transition-colors duration-150 ${
    active
      ? "font-bold text-text-primary after:absolute after:top-0 after:left-1/2 after:h-0.5 after:w-7 after:-translate-x-1/2 after:rounded-b-[3px] after:bg-text-primary after:content-['']"
      : "text-text-muted"
  }`;

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  showInvestmentsTab,
  triggerConfirm,
  firebaseAuth,
  setExpenses,
  setWatchlist,
  setExpensesLoaded,
  disconnectAnilist,
  disconnectTrakt,
}) => {
  return (
    <>
      <header className="sticky top-0 z-[100] hidden min-h-[52px] items-center justify-between border-b border-border-subtle bg-bg-card px-4 py-3 max-md:flex">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1.6" y="1.6" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" />
            <rect x="11.2" y="1.6" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.55" />
            <rect x="1.6" y="11.2" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.55" />
            <rect x="11.2" y="11.2" width="7.2" height="7.2" rx="1.8" fill="var(--text-primary)" opacity="0.85" />
          </svg>
          <span className="text-base font-bold tracking-[-0.3px]">PHub Dashboard</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/assistant"
            title="AI Integration Setup"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border-subtle bg-bg-primary text-text-secondary transition-colors hover:text-text-primary"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
              <path d="M19 11v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
            </svg>
          </a>
          {user && (
            <img
              src={isSafeImageUrl(user.photoURL) ? user.photoURL : undefined}
              alt="Profile"
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
              className="h-7 w-7 cursor-pointer rounded-full bg-text-primary object-cover text-[11px] font-semibold text-white"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <nav className="fixed right-0 bottom-0 left-0 z-[1000] hidden min-h-[60px] items-stretch justify-around border-t border-border-subtle bg-bg-card pb-[env(safe-area-inset-bottom)] max-md:flex">
        <div onClick={() => setActiveTab("expenses")} className={mobileNavLinkClass(activeTab === "expenses")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
          <span>Ledger</span>
        </div>
        <div onClick={() => setActiveTab("financial")} className={mobileNavLinkClass(activeTab === "financial")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          <span>Health</span>
        </div>
        <div onClick={() => setActiveTab("media")} className={mobileNavLinkClass(activeTab === "media")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
          <span>Watchlist</span>
        </div>
        <div onClick={() => setActiveTab("books")} className={mobileNavLinkClass(activeTab === "books")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>Library</span>
        </div>
        <div onClick={() => setActiveTab("notes")} className={mobileNavLinkClass(activeTab === "notes")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Notes</span>
        </div>
        {showInvestmentsTab && (
          <div onClick={() => setActiveTab("investments")} className={mobileNavLinkClass(activeTab === "investments")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            <span>Invest</span>
          </div>
        )}
        <div onClick={() => setActiveTab("reports")} className={mobileNavLinkClass(activeTab === "reports")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>Reports</span>
        </div>
      </nav>
    </>
  );
};
