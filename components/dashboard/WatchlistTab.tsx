import React from "react";
import { WatchlistItem, SearchResult } from "@/types";
import { isSafeImageUrl } from "@/lib/safe-url";

interface WatchlistTabProps {
  watchlist: WatchlistItem[];
  watchlistFilter: "all" | "anime" | "movie" | "show";
  setWatchlistFilter: (f: "all" | "anime" | "movie" | "show") => void;
  mediaQuery: string;
  setMediaQuery: (q: string) => void;
  mediaType: "movie" | "show" | "anime" | "book";
  setMediaType: (t: "movie" | "show" | "anime" | "book") => void;
  searchMedia: (e: React.FormEvent) => void;
  isSearchingMedia: boolean;
  searchResults: SearchResult[];
  addToWatchlist: (res: SearchResult) => void;
  updateWatchItem: (item: WatchlistItem, updates: Partial<WatchlistItem>) => void;
  deleteWatchItem: (id: string) => void;
  isFetchingWatchlist: boolean;
  showLetterboxdModal: boolean;
  setShowLetterboxdModal: (show: boolean) => void;
  letterboxdUsername: string;
  setLetterboxdUsername: (s: string) => void;
  handleLetterboxdImport: () => void;
  isImportingLetterboxd: boolean;
  disconnectLetterboxd: () => void;
  anilistUser?: any;
  connectAnilist?: () => void;
  disconnectAnilist?: () => void;
  syncAnilist?: () => void;
  isSyncingAnilist?: boolean;
  traktUser?: any;
  connectTrakt?: () => void;
  disconnectTrakt?: () => void;
  syncTrakt?: () => void;
  isSyncingTrakt?: boolean;
  enrichMissingPosters?: () => void;
  isEnrichingPosters?: boolean;
  onItemClick: (item: WatchlistItem) => void;
  idToken?: string;
}

const STAT_CARD = "flex flex-col gap-1 rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle";
const LABEL_MONO = "font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase";
const STAT_VALUE = "text-[28px] font-bold tracking-[-0.5px] text-text-primary";
const BENTO_CARD = "rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle";
const BTN_PRIMARY = "rounded-md border border-text-primary bg-text-primary text-[13px] font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27] disabled:opacity-60";
const BTN_SECONDARY = "rounded-md border border-border-subtle bg-transparent text-[13px] font-medium text-text-primary transition-all duration-200 hover:bg-bg-primary";
const INPUT_CLASS = "w-full rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus";

const pillClass = (active: boolean) =>
  `cursor-pointer rounded-md border-none px-3.5 py-[5px] text-xs font-semibold ${
    active ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.06)]" : "bg-transparent text-text-secondary"
  }`;

const statusPillClass = (active: boolean) =>
  `cursor-pointer rounded-md border-none px-3 py-[5px] text-[11px] font-semibold ${
    active ? "bg-white text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.05)]" : "bg-transparent text-text-secondary"
  }`;

export const WatchlistTab: React.FC<WatchlistTabProps> = ({
  watchlist,
  watchlistFilter,
  setWatchlistFilter,
  mediaQuery,
  setMediaQuery,
  mediaType,
  setMediaType,
  searchMedia,
  isSearchingMedia,
  searchResults,
  addToWatchlist,
  updateWatchItem,
  deleteWatchItem,
  isFetchingWatchlist,
  showLetterboxdModal,
  setShowLetterboxdModal,
  letterboxdUsername,
  setLetterboxdUsername,
  handleLetterboxdImport,
  isImportingLetterboxd,
  disconnectLetterboxd,
  anilistUser,
  connectAnilist,
  disconnectAnilist,
  syncAnilist,
  isSyncingAnilist,
  traktUser,
  connectTrakt,
  disconnectTrakt,
  syncTrakt,
  isSyncingTrakt,
  enrichMissingPosters,
  isEnrichingPosters = false,
  onItemClick,
  idToken,
}) => {
  const exportLetterboxdCSV = () => {
    const movies = watchlist.filter((item) => item.type === "movie" && item.status === "completed");
    const headers = ["Title", "Year", "Rating", "WatchedDate", "Rewatch", "Review", "Tags"];
    const rows = movies.map((item) => {
      const titleEscaped = `"${item.title.replace(/"/g, '""')}"`;
      const year = item.year ?? "";
      const rating = item.rating !== null && item.rating !== undefined ? (item.rating / 2).toFixed(1) : "";
      let watchedDate = "";
      if (item.updatedAt) {
        const date = new Date(item.updatedAt);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        watchedDate = `${yyyy}-${mm}-${dd}`;
      }
      const rewatch = "No";
      const review = "";
      const tags = "phub-dashboard";
      return [titleEscaped, year, rating, watchedDate, rewatch, review, tags].join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `letterboxd_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [statusFilter, setStatusFilter] = React.useState<"all" | "watching" | "paused" | "plan_to_watch" | "completed">("all");
  const [activeCategoryTab, setActiveCategoryTab] = React.useState<"movie" | "show" | "anime">("movie");
  const [titleSearch, setTitleSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"title" | "rating" | "year">("year");

  interface AIRecommendation {
    title: string;
    releaseYear?: string;
    rationale: string;
    synopsis: string;
    coverImage?: string | null;
    score?: string | null;
    date: string;
    isLogged?: boolean;
  }

  const [rec, setRec] = React.useState<AIRecommendation | null>(null);
  const [recLoading, setRecLoading] = React.useState(false);
  const [recError, setRecError] = React.useState<string | null>(null);
  const [isLogged, setIsLogged] = React.useState(false);
  const [ratingInput, setRatingInput] = React.useState<string>("8");
  const [showRatingSelector, setShowRatingSelector] = React.useState(false);
  const [logActionLoading, setLogActionLoading] = React.useState(false);

  React.useEffect(() => {
    if (!idToken) return;

    setRec(null);
    setIsLogged(false);
    setRecLoading(true);
    setRecError(null);
    setShowRatingSelector(false);

    fetch(`/api/assistant/recommendations?type=${activeCategoryTab}`, {
      headers: {
        authorization: `Bearer ${idToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load recommendation.");
        return res.json();
      })
      .then((data) => {
        const recommendation = data.recommendation || null;
        if (recommendation) {
          setRec(recommendation);
          setIsLogged(recommendation.isLogged || false);
        }
      })
      .catch((err) => {
        console.error(err);
        setRecError(err.message || "Failed to fetch suggestion.");
      })
      .finally(() => {
        setRecLoading(false);
      });
  }, [activeCategoryTab, idToken]);

  const logRecommendation = async (status: "completed" | "dropped") => {
    if (!rec) return;
    setLogActionLoading(true);
    try {
      const score = status === "completed" ? parseInt(ratingInput, 10) : null;
      const body = {
        title: rec.title,
        type: activeCategoryTab,
        status: status,
        progress: 0,
        totalEpisodes: null,
        rating: score,
        coverImage: rec.coverImage || null,
        year: rec.releaseYear ? parseInt(rec.releaseYear, 10) : null,
      };

      const apiRes = await fetch("/api/watchlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!apiRes.ok) {
        throw new Error("Failed to log recommendation.");
      }

      // Mark as logged in Firestore recommendations cache document
      await fetch("/api/assistant/recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          type: activeCategoryTab,
          date: rec.date,
          isLogged: true,
        }),
      });

      setIsLogged(true);
      setShowRatingSelector(false);

      window.dispatchEvent(new Event("watchlist-updated"));
    } catch (err: any) {
      console.error(err);
      setRecError(err.message || "Failed to save recommendation.");
    } finally {
      setLogActionLoading(false);
    }
  };

  // Category tab is now a strict 3-way split: Movies / TV Shows / Anime each
  // show only their own type — no more combined "Movies & Shows" bucket.
  const filteredWatchlist = watchlist
    .filter((item) => {
      if (item.type !== activeCategoryTab) return false;
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (titleSearch.trim() && !item.title.toLowerCase().includes(titleSearch.trim().toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "year") return (b.year || 0) - (a.year || 0);
      return a.title.localeCompare(b.title);
    });

  const watchingAnime = watchlist.filter((i) => i.type === "anime" && i.status === "watching").length;
  const watchingShows = watchlist.filter((i) => i.type === "show" && i.status === "watching").length;
  const watchingTotal = watchingAnime + watchingShows;

  const planAnime = watchlist.filter((i) => i.type === "anime" && i.status === "plan_to_watch").length;
  const planShows = watchlist.filter((i) => i.type === "show" && i.status === "plan_to_watch").length;
  const planTotal = planAnime + planShows;

  const completedAnime = watchlist.filter((i) => i.type === "anime" && i.status === "completed").length;
  const completedShows = watchlist.filter((i) => (i.type === "show" || i.type === "movie") && i.status === "completed").length;
  const completedTotal = completedAnime + completedShows;

  const totalAnime = watchlist.filter((i) => i.type === "anime").length;
  const totalShows = watchlist.filter((i) => i.type === "show").length;
  const totalMovies = watchlist.filter((i) => i.type === "movie").length;

  return (
    <div className="flex flex-col gap-5 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      {/* 4 Overview Stat Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>WATCHING NOW</span>
          <span className={STAT_VALUE}>{watchingTotal}</span>
          <div className="mt-1 flex gap-3 font-mono text-[10px]">
            <span className="font-semibold text-accent-blue">ANIME {watchingAnime}</span>
            <span className="text-text-muted">TV/S {watchingShows}</span>
          </div>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>PLAN TO WATCH</span>
          <span className={STAT_VALUE} style={{ color: "#e39282" }}>{planTotal}</span>
          <div className="mt-1 flex gap-3 font-mono text-[10px]">
            <span className="font-semibold text-accent-blue">ANIME {planAnime}</span>
            <span className="text-text-muted">TV/S {planShows}</span>
          </div>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>COMPLETED</span>
          <span className={STAT_VALUE} style={{ color: "#e39282" }}>{completedTotal}</span>
          <div className="mt-1 flex gap-3 font-mono text-[10px]">
            <span className="font-semibold text-accent-blue">ANIME {completedAnime}</span>
            <span className="text-text-muted">TV/S {completedShows}</span>
          </div>
        </div>
        <div className={STAT_CARD}>
          <span className={LABEL_MONO}>LIBRARY</span>
          <div className="mt-2 flex items-baseline gap-4">
            <div><span className="text-xl font-bold">{totalAnime}</span><span className="ml-1 font-mono text-[9px] text-text-muted">ANIME</span></div>
            <div><span className="text-xl font-bold">{totalShows}</span><span className="ml-1 font-mono text-[9px] text-text-muted">SHOWS</span></div>
            <div><span className="text-xl font-bold">{totalMovies}</span><span className="ml-1 font-mono text-[9px] text-text-muted">MOVIES</span></div>
          </div>
        </div>
      </div>

      {/* Integration Banners */}
      {/* Integration Banners Grid */}
      <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
        {/* AniList Card */}
        <div className={`${BENTO_CARD} flex flex-col justify-between p-5 min-h-[155px]`}>
          <div className="flex items-start gap-3.5">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.05)] bg-[#1e2630]">
              <svg viewBox="0 0 512 512" className="h-full w-full">
                <path d="M0 0h512v512H0" fill="#1e2630"/>
                <path d="M321.92 323.27V136.6c0-10.698-5.887-16.602-16.558-16.602h-36.433c-10.672 0-16.561 5.904-16.561 16.602v88.651c0 2.497 23.996 14.089 24.623 16.541 18.282 71.61 3.972 128.92-13.359 131.6 28.337 1.405 31.455 15.064 10.348 5.731 3.229-38.209 15.828-38.134 52.049-1.406.31.317 7.427 15.282 7.87 15.282h85.545c10.672 0 16.558-5.9 16.558-16.6v-36.524c0-10.698-5.886-16.602-16.558-16.602z" fill="#02a9ff"/>
                <path d="M170.68 120 74.999 393h74.338l16.192-47.222h80.96L262.315 393h73.968l-95.314-273zm11.776 165.28 23.183-75.629 25.393 75.629z" fill="#fefefe"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {anilistUser ? "AniList Connected" : "Connect AniList"}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5 truncate font-medium" title={anilistUser ? anilistUser.name : undefined}>
                {anilistUser ? anilistUser.name : "Sync anime watch progress automatically."}
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
            {anilistUser ? (
              <>
                <span className="text-[10px] font-mono text-text-muted">Status: Active</span>
                <div className="flex gap-2">
                  {syncAnilist && (
                    <button onClick={syncAnilist} disabled={isSyncingAnilist} className="text-xs font-semibold text-text-primary hover:underline bg-transparent border-none cursor-pointer">
                      {isSyncingAnilist ? "Syncing..." : "Sync"}
                    </button>
                  )}
                  <button onClick={disconnectAnilist} className="text-xs font-semibold text-red-500 hover:underline bg-transparent border-none cursor-pointer">Disconnect</button>
                </div>
              </>
            ) : (
              <button onClick={connectAnilist} className={`${BTN_PRIMARY} h-8 px-4 text-xs w-full`}>Connect</button>
            )}
          </div>
        </div>

        {/* Trakt Card */}
        <div className={`${BENTO_CARD} flex flex-col justify-between p-5 min-h-[155px]`}>
          <div className="flex items-start gap-3.5">
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.05)] bg-transparent">
              <svg viewBox="0 0 48 48" className="h-full w-full">
                <defs>
                  <radialGradient id="trakt-card-grad" cx="48.46" cy="-.95" r="64.84" fx="48.46" fy="-.95" gradientUnits="userSpaceOnUse">
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
                <circle cx="24" cy="24" r="24" fill="url(#trakt-card-grad)"/>
                <path d="m13.62 17.97 7.92 7.92 1.47-1.47-7.92-7.92-1.47 1.47Zm14.39 14.4 1.47-1.46-2.16-2.16L47.64 8.43c-.19-.75-.46-1.46-.79-2.14L24.39 28.75l3.62 3.62Zm-15.09-13.7-1.46 1.46 14.4 14.4 1.46-1.47L23 28.75 46.35 5.4c-.36-.6-.78-1.16-1.25-1.68L21.54 27.28l-8.62-8.61Zm34.95-9.09L28.7 28.75l1.47 1.46L48 12.38v-1.12c0-.57-.04-1.14-.13-1.68ZM25.16 22.27l-7.92-7.92-1.47 1.47 7.92 7.92 1.47-1.47Zm16.16 12.85c0 3.42-2.78 6.2-6.2 6.2H12.88c-3.42 0-6.2-2.78-6.2-6.2V12.88c0-3.42 2.78-6.21 6.2-6.21h20.78V4.6H12.88c-4.56 0-8.28 3.71-8.28 8.28v22.24c0 4.56 3.71 8.28 8.28 8.28h22.24c4.56 0 8.28-3.71 8.28-8.28v-3.51h-2.07v3.51Z" fill="#fff"/>
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {traktUser ? "Trakt Connected" : "Connect Trakt"}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5 truncate font-medium" title={traktUser ? (traktUser.name || traktUser.username) : undefined}>
                {traktUser ? (traktUser.name || traktUser.username) : "Sync movies & TV shows history automatically."}
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
            {traktUser ? (
              <>
                <span className="text-[10px] font-mono text-text-muted">Status: Active</span>
                <div className="flex gap-2">
                  {syncTrakt && (
                    <button onClick={syncTrakt} disabled={isSyncingTrakt} className="text-xs font-semibold text-text-primary hover:underline bg-transparent border-none cursor-pointer">
                      {isSyncingTrakt ? "Syncing..." : "Sync"}
                    </button>
                  )}
                  <button onClick={disconnectTrakt} className="text-xs font-semibold text-red-500 hover:underline bg-transparent border-none cursor-pointer">Disconnect</button>
                </div>
              </>
            ) : (
              <button onClick={connectTrakt} className={`${BTN_PRIMARY} h-8 px-4 text-xs w-full`}>Connect</button>
            )}
          </div>
        </div>

        {/* Letterboxd Card */}
        <div className={`${BENTO_CARD} flex flex-col justify-between p-5 min-h-[155px]`}>
          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1c1b18] text-white">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <circle cx="7" cy="12" r="3.5" fill="#ff7a00" />
                <circle cx="12" cy="12" r="3.5" fill="#00e054" />
                <circle cx="17" cy="12" r="3.5" fill="#00b0ea" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                {letterboxdUsername ? "Letterboxd Connected" : "Sync Letterboxd"}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5 truncate font-medium" title={letterboxdUsername || undefined}>
                {letterboxdUsername ? letterboxdUsername : "Sync Letterboxd watched diary entries via RSS feed."}
              </p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
            {letterboxdUsername ? (
              <>
                <span className="text-[10px] font-mono text-text-muted">Status: Active</span>
                <div className="flex gap-2">
                  <button onClick={handleLetterboxdImport} disabled={isImportingLetterboxd} className="text-xs font-semibold text-text-primary hover:underline bg-transparent border-none cursor-pointer">
                    {isImportingLetterboxd ? "Syncing..." : "Sync"}
                  </button>
                  <button onClick={disconnectLetterboxd} className="text-xs font-semibold text-red-500 hover:underline bg-transparent border-none cursor-pointer">Disconnect</button>
                </div>
              </>
            ) : (
              <button onClick={() => setShowLetterboxdModal(true)} className={`${BTN_PRIMARY} h-8 px-4 text-xs w-full`}>Connect</button>
            )}
          </div>
        </div>

        {/* Export CSV Card */}
        <div className={`${BENTO_CARD} flex flex-col justify-between p-5 min-h-[155px]`}>
          <div className="flex items-start gap-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-secondary text-text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Export Library</p>
              <p className="text-[11px] text-text-muted mt-0.5">Download movie diary entries as CSV for importing.</p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-border-subtle pt-3">
            <button onClick={exportLetterboxdCSV} className={`${BTN_SECONDARY} h-8 px-4 text-xs w-full font-semibold`}>Export CSV</button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-[260px_minmax(0,1fr)] items-start gap-5 max-md:grid-cols-1">
        {/* Left Column wrapper */}
        <div className="flex flex-col gap-5">
          {/* SEARCH & ADD CARD */}
          <div className={BENTO_CARD}>
          <span className={`${LABEL_MONO} mb-1 block`}>SEARCH &amp; ADD</span>
          <p className="mb-3.5 text-[11px] text-text-muted">AniList &amp; Trakt search</p>

          <form onSubmit={searchMedia} className="flex flex-col gap-2.5">
            <input
              type="text"
              placeholder="Search title"
              value={mediaQuery}
              onChange={(e) => setMediaQuery(e.target.value)}
              required
              className={INPUT_CLASS}
            />

            <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)} className={`${INPUT_CLASS} cursor-pointer text-xs`}>
              <option value="movie">Movies (Trakt)</option>
              <option value="show">TV Shows (Trakt)</option>
              <option value="anime">Anime (AniList)</option>
            </select>

            <button type="submit" disabled={isSearchingMedia} className={`${BTN_PRIMARY} mt-1 w-full py-2.5`}>
              {isSearchingMedia ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 flex max-h-[300px] flex-col gap-2.5 overflow-y-auto">
              {searchResults.map((res, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-md bg-bg-secondary p-2">
                  {isSafeImageUrl(res.coverImage) ? (
                    <img src={res.coverImage} alt={res.title} className="h-[46px] w-8 rounded object-cover" />
                  ) : (
                    <div className="flex h-[46px] w-8 items-center justify-center rounded bg-bg-card text-sm">🎬</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold">{res.title}</p>
                    <p className="text-[10px] text-text-muted">{res.year || "—"}</p>
                    <button
                      onClick={() => addToWatchlist(res)}
                      className="mt-1 cursor-pointer rounded border-none bg-text-primary px-1.5 py-0.5 text-[10px] text-white"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

          {/* AI Recommendations Panel */}
          <div className={BENTO_CARD}>
          <span className={`${LABEL_MONO} mb-3 block`}>🤖 AI Recommendation of the Day</span>
          <p className="text-[10px] leading-[1.4] text-text-secondary mb-3">
            Get 1 personalized suggestion for today based on your {activeCategoryTab === "movie" ? "movies" : activeCategoryTab === "show" ? "shows" : "anime"} watch history.
          </p>

          {recLoading ? (
            <div className="flex flex-col items-center justify-center py-5 gap-1.5">
              <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-text-primary border-t-transparent" />
              <span className="text-[10.5px] text-text-secondary font-mono animate-pulse">Consulting AI...</span>
            </div>
          ) : rec ? (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg border border-border-subtle bg-[#fcfbfa] p-3.5 flex flex-col gap-3">
                <div className="flex gap-3">
                  {rec.coverImage ? (
                    <img src={rec.coverImage} alt={rec.title} className="h-[76px] w-[52px] shrink-0 rounded object-cover shadow-sm border border-border-subtle" />
                  ) : (
                    <div className="flex h-[76px] w-[52px] shrink-0 items-center justify-center rounded bg-bg-secondary text-lg border border-border-subtle">
                      🎬
                    </div>
                  )}
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[12.5px] font-bold text-text-primary leading-tight block">
                        {rec.title}
                      </span>
                      <span className="text-[10px] text-text-muted mt-0.5 block">
                        {rec.releaseYear ? `${rec.releaseYear}` : "—"}
                      </span>
                    </div>
                    {rec.score && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-[#b3666b]">
                        <span>⭐</span> {rec.score}
                      </div>
                    )}
                  </div>
                </div>

                {rec.synopsis && (
                  <div className="text-[10.5px] leading-[1.4] text-text-secondary border-t border-border-subtle pt-2">
                    <span className="font-semibold text-text-primary block mb-0.5">Synopsis</span>
                    {rec.synopsis}
                  </div>
                )}

                {rec.rationale && (
                  <div className="text-[10px] leading-[1.4] text-text-muted italic bg-bg-secondary/35 p-2 rounded border border-border-subtle/50">
                    💡 {rec.rationale}
                  </div>
                )}
              </div>

              {isLogged ? (
                <div className="flex items-center justify-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold py-2">
                  <span>✓</span> Added to your list
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {showRatingSelector ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-card p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-text-secondary whitespace-nowrap">Your Rating:</span>
                        <select
                          value={ratingInput}
                          onChange={(e) => setRatingInput(e.target.value)}
                          className="flex-1 rounded border border-border-subtle bg-bg-card px-1.5 py-1 text-xs text-text-primary outline-none"
                        >
                          {Array.from({ length: 10 }, (_, i) => 10 - i).map((score) => (
                            <option key={score} value={score}>{score}/10</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => logRecommendation("completed")}
                          disabled={logActionLoading}
                          className="rounded bg-text-primary text-[10px] font-bold text-white py-1.5 hover:bg-[#2e2d27] disabled:opacity-50 text-center"
                        >
                          {logActionLoading ? "Saving..." : "Log"}
                        </button>
                        <button
                          onClick={() => setShowRatingSelector(false)}
                          className="rounded border border-border-subtle bg-transparent text-[10px] text-text-secondary py-1.5 hover:bg-bg-secondary text-center animate-[fadeIn_0.2s_ease]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setShowRatingSelector(true)}
                        disabled={logActionLoading}
                        className="rounded-md border border-text-primary bg-text-primary text-[11px] font-semibold text-white py-2 hover:bg-[#2e2d27] cursor-pointer disabled:opacity-50"
                      >
                        Completed
                      </button>
                      <button
                        onClick={() => logRecommendation("dropped")}
                        disabled={logActionLoading}
                        className="rounded-md border border-border-subtle bg-transparent text-[11px] font-semibold text-[#b3666b] py-2 hover:bg-[#fef2f2] hover:border-red-200 cursor-pointer disabled:opacity-50"
                      >
                        Dropped
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {recError && (
            <p className="text-[10px] text-[#b3666b] mt-2 text-center">{recError}</p>
          )}
        </div>
      </div>

      {/* Right Column: Watchlist Bento Container */}
      <div className={`${BENTO_CARD} p-5`}>
          {/* Header Row Controls */}
          <div className="mb-4 flex flex-col gap-3 border-b border-border-subtle pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Category Tabs */}
              <div className="flex gap-1.5 rounded-lg bg-bg-secondary p-[3px] max-md:w-full">
                <button onClick={() => setActiveCategoryTab("movie")} className={`${pillClass(activeCategoryTab === "movie")} max-md:flex-1 max-md:justify-center`}>
                  🎬 Movies
                </button>
                <button onClick={() => setActiveCategoryTab("show")} className={`${pillClass(activeCategoryTab === "show")} max-md:flex-1 max-md:justify-center`}>
                  📺 TV Shows
                </button>
                <button onClick={() => setActiveCategoryTab("anime")} className={`${pillClass(activeCategoryTab === "anime")} max-md:flex-1 max-md:justify-center`}>
                  🌸 Anime
                </button>
              </div>

              {/* Right side status pills */}
              <div className="flex flex-wrap items-center gap-2.5">
                {watchlist.some((w) => !w.coverImage && (w.type === "movie" || w.type === "show")) && enrichMissingPosters && (
                  <button
                    onClick={enrichMissingPosters}
                    disabled={isEnrichingPosters}
                    className="rounded-md border border-border-subtle bg-bg-card hover:bg-bg-secondary text-[11px] font-semibold text-text-primary px-3 py-1.5 flex items-center gap-1 cursor-pointer transition-all duration-150 disabled:opacity-50"
                    title="Scan for items with missing cover art and fetch them from OMDb/TVMaze"
                  >
                    ✨ {isEnrichingPosters ? "Fetching..." : "Fetch Posters"}
                  </button>
                )}

                <div className="flex gap-1 rounded-lg bg-bg-secondary p-[3px]">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "watching", label: "👁️ Watching" },
                      { id: "paused", label: "⏸️ Paused" },
                      { id: "plan_to_watch", label: "⏳ Plan" },
                      { id: "completed", label: "✅ Done" },
                    ] as const
                  ).map((st) => (
                    <button key={st.id} onClick={() => setStatusFilter(st.id)} className={statusPillClass(statusFilter === st.id)}>
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search & sort row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                placeholder="🔍 Search by title..."
                value={titleSearch}
                onChange={(e) => setTitleSearch(e.target.value)}
                className={`${INPUT_CLASS} max-w-[260px] max-md:max-w-none max-md:flex-1`}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="cursor-pointer rounded-md border border-border-subtle bg-white px-3 py-1.5 text-[11px] max-md:flex-1"
              >
                <option value="title">Sort: Title A–Z</option>
                <option value="rating">Sort: Highest Rated</option>
                <option value="year">Sort: Newest Year</option>
              </select>
            </div>
          </div>

          {/* Watchlist Rows */}
          <div className="flex flex-col gap-2.5">
            {filteredWatchlist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3.5 rounded-lg border border-border-subtle bg-bg-card px-3.5 py-3 transition-[transform,box-shadow] duration-150 max-md:flex-col max-md:items-stretch"
              >
                {/* Poster & Info (Clickable for Detail Popup) */}
                <div 
                  onClick={() => onItemClick(item)} 
                  className="flex min-w-0 flex-1 items-center gap-3.5 max-md:w-full cursor-pointer hover:opacity-85"
                >
                  {isSafeImageUrl(item.coverImage) ? (
                    <img src={item.coverImage} alt={item.title} className="h-14 w-10 shrink-0 rounded object-cover shadow-[0_2px_6px_rgba(0,0,0,0.05)]" />
                  ) : (
                    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded bg-bg-secondary text-lg shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
                      {item.type === "movie" ? "🎬" : item.type === "show" ? "📺" : "🌸"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold">{item.title}</p>
                    <p className="mt-px text-[10.5px] text-text-muted">
                      {item.type === "movie" ? "Movie" : item.type === "show" ? "Show" : "Anime"} {item.year ? `(${item.year})` : ""}
                    </p>

                    {/* Quick Episode Incrementer */}
                    {(item.type === "show" || item.type === "anime") && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-medium text-text-secondary">
                          Ep {item.progress || 0}{item.totalEpisodes ? `/${item.totalEpisodes}` : ""}
                        </span>
                        <button
                          onClick={() => updateWatchItem(item, { progress: Math.max(0, (item.progress || 0) - 1) })}
                          className="cursor-pointer rounded-[3px] border border-border-subtle bg-bg-secondary px-1.5 py-px text-[10px] font-semibold"
                        >
                          -
                        </button>
                        <button
                          onClick={() => updateWatchItem(item, { progress: (item.progress || 0) + 1 })}
                          className="cursor-pointer rounded-[3px] border border-border-subtle bg-bg-secondary px-1.5 py-px text-[10px] font-semibold"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right controls: Status, Score, Delete */}
                <div className="flex shrink-0 items-center gap-2 max-md:w-full">
                  <select
                    value={item.status}
                    onChange={(e) => updateWatchItem(item, { status: e.target.value as any })}
                    className="cursor-pointer rounded-md border border-border-subtle bg-white px-2 py-1 text-[11px] max-md:flex-1 max-md:min-w-0"
                  >
                    <option value="watching">Watching</option>
                    <option value="paused">Paused</option>
                    <option value="plan_to_watch">Plan</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>

                  <select
                    value={item.rating || 0}
                    onChange={(e) => updateWatchItem(item, { rating: Number(e.target.value) || null })}
                    className="cursor-pointer rounded-md border border-border-subtle bg-white px-2 py-1 text-[11px] max-md:flex-1 max-md:min-w-0"
                  >
                    <option value="0">Score v</option>
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>★ {n}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => deleteWatchItem(item.id)}
                    className="shrink-0 cursor-pointer rounded-md border-none bg-transparent px-2 py-1 text-sm font-bold text-[#b3666b] hover:bg-[rgba(179,102,107,0.08)]"
                    title="Delete item"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {filteredWatchlist.length === 0 && (
              <p className="p-8 text-center text-[13px] text-text-muted">
                {isFetchingWatchlist ? "Loading watchlist..." : "No items found in this view."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
