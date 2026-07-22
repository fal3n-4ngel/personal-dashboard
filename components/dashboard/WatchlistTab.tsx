import React from "react";
import { WatchlistItem, SearchResult } from "@/types";

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
  letterboxdCsv: string;
  setLetterboxdCsv: (s: string) => void;
  handleLetterboxdImport: () => void;
  isImportingLetterboxd: boolean;
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
}

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
  letterboxdCsv,
  setLetterboxdCsv,
  handleLetterboxdImport,
  isImportingLetterboxd,
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
}) => {
  const [statusFilter, setStatusFilter] = React.useState<"all" | "watching" | "plan_to_watch" | "completed">("all");
  const [activeCategoryTab, setActiveCategoryTab] = React.useState<"all_media" | "anime">("all_media");

  // Strict filtering fix:
  // "all_media" (Movies & Shows tab) ONLY shows Movies and TV Shows.
  // "anime" (Anime tab) ONLY shows Anime.
  const filteredWatchlist = watchlist.filter((item) => {
    if (item.type === "book") return false;
    if (activeCategoryTab === "anime") {
      if (item.type !== "anime") return false;
    } else {
      if (item.type !== "movie" && item.type !== "show") return false;
      if (watchlistFilter !== "all" && item.type !== watchlistFilter) return false;
    }
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
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
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* 4 Overview Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div className="stat-card">
          <span className="label-mono">WATCHING NOW</span>
          <span className="stat-value">{watchingTotal}</span>
          <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "10px", fontFamily: "monospace" }}>
            <span style={{ color: "#3b82f6", fontWeight: 600 }}>ANIME {watchingAnime}</span>
            <span style={{ color: "var(--text-muted)" }}>TV/S {watchingShows}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="label-mono">PLAN TO WATCH</span>
          <span className="stat-value" style={{ color: "#e39282" }}>{planTotal}</span>
          <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "10px", fontFamily: "monospace" }}>
            <span style={{ color: "#3b82f6", fontWeight: 600 }}>ANIME {planAnime}</span>
            <span style={{ color: "var(--text-muted)" }}>TV/S {planShows}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="label-mono">COMPLETED</span>
          <span className="stat-value" style={{ color: "#e39282" }}>{completedTotal}</span>
          <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "10px", fontFamily: "monospace" }}>
            <span style={{ color: "#3b82f6", fontWeight: 600 }}>ANIME {completedAnime}</span>
            <span style={{ color: "var(--text-muted)" }}>TV/S {completedShows}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="label-mono">LIBRARY</span>
          <div style={{ display: "flex", gap: "16px", alignItems: "baseline", marginTop: "8px" }}>
            <div><span style={{ fontSize: "20px", fontWeight: 700 }}>{totalAnime}</span><span style={{ fontSize: "9px", fontFamily: "monospace", color: "var(--text-muted)", marginLeft: "4px" }}>ANIME</span></div>
            <div><span style={{ fontSize: "20px", fontWeight: 700 }}>{totalShows}</span><span style={{ fontSize: "9px", fontFamily: "monospace", color: "var(--text-muted)", marginLeft: "4px" }}>SHOWS</span></div>
            <div><span style={{ fontSize: "20px", fontWeight: 700 }}>{totalMovies}</span><span style={{ fontSize: "9px", fontFamily: "monospace", color: "var(--text-muted)", marginLeft: "4px" }}>MOVIES</span></div>
          </div>
        </div>
      </div>

      {/* Integration Banners */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* AniList Card */}
        <div className="bento-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "14px" }}>AL</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "14px" }}>Connect AniList</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Sync your anime and manga watch progress automatically.</p>
            </div>
          </div>
          {anilistUser ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {syncAnilist && (
                <button onClick={syncAnilist} disabled={isSyncingAnilist} className="btn-primary" style={{ fontSize: "12px", padding: "8px 18px", height: "36px" }}>
                  {isSyncingAnilist ? "Syncing..." : "Sync Now"}
                </button>
              )}
              <button onClick={disconnectAnilist} className="btn-secondary" style={{ fontSize: "12px", padding: "8px 18px", height: "36px" }}>Disconnect ({anilistUser.name})</button>
            </div>
          ) : (
            <button onClick={connectAnilist} className="btn-primary" style={{ fontSize: "12px", padding: "8px 20px", height: "36px" }}>Connect</button>
          )}
        </div>

        {/* Trakt Card */}
        <div className="bento-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#ed1c24", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "12px" }}>TR</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "14px" }}>Connect Trakt</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Sync your movies and TV shows watch progress automatically.</p>
            </div>
          </div>
          {traktUser ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {syncTrakt && (
                <button onClick={syncTrakt} disabled={isSyncingTrakt} className="btn-primary" style={{ fontSize: "12px", padding: "8px 18px", height: "36px" }}>
                  {isSyncingTrakt ? "Syncing..." : "Sync Now"}
                </button>
              )}
              <button onClick={disconnectTrakt} className="btn-secondary" style={{ fontSize: "12px", padding: "8px 18px", height: "36px" }}>Disconnect ({traktUser.name || traktUser.username})</button>
            </div>
          ) : (
            <button onClick={connectTrakt} className="btn-primary" style={{ fontSize: "12px", padding: "8px 20px", height: "36px" }}>Connect</button>
          )}
        </div>

        {/* Letterboxd Card */}
        <div className="bento-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#00e054", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "14px" }}>•••</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "14px" }}>Import Letterboxd</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>Upload your Letterboxd CSV (watchlist or watched) to import your movies.</p>
            </div>
          </div>
          <button onClick={() => setShowLetterboxdModal(true)} style={{ backgroundColor: "#00e054", color: "#fff", border: "none", borderRadius: "6px", padding: "8px 18px", fontSize: "12px", fontWeight: 600, cursor: "pointer", height: "36px" }}>Upload CSV</button>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="responsive-grid" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "20px", alignItems: "start" }}>
        {/* Left Column: SEARCH & ADD */}
        <div className="bento-card">
          <span className="label-mono" style={{ marginBottom: "4px", display: "block" }}>SEARCH &amp; ADD</span>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px" }}>AniList &amp; Trakt search</p>

          <form onSubmit={searchMedia} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="text"
              placeholder="Search title"
              value={mediaQuery}
              onChange={(e) => setMediaQuery(e.target.value)}
              required
              style={{ width: "100%" }}
            />

            <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)} style={{ width: "100%", padding: "8px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid var(--border-subtle)" }}>
              <option value="movie">Movies (Trakt)</option>
              <option value="show">TV Shows (Trakt)</option>
              <option value="anime">Anime (AniList)</option>
            </select>

            <button type="submit" disabled={isSearchingMedia} className="btn-primary" style={{ width: "100%", padding: "10px", marginTop: "4px" }}>
              {isSearchingMedia ? "Searching..." : "Search"}
            </button>
          </form>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
              {searchResults.map((res, i) => (
                <div key={i} style={{ display: "flex", gap: "10px", backgroundColor: "var(--bg-secondary)", padding: "8px", borderRadius: "6px", alignItems: "center" }}>
                  {res.coverImage ? (
                    <img src={res.coverImage} alt={res.title} style={{ width: "32px", height: "46px", objectFit: "cover", borderRadius: "4px" }} />
                  ) : (
                    <div style={{ width: "32px", height: "46px", backgroundColor: "var(--bg-card)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>🎬</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{res.title}</p>
                    <p style={{ fontSize: "10px", color: "var(--text-muted)" }}>{res.year || "—"}</p>
                    <button
                      onClick={() => addToWatchlist(res)}
                      style={{ fontSize: "10px", padding: "2px 6px", marginTop: "4px", backgroundColor: "var(--text-primary)", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Watchlist Bento Container */}
        <div className="bento-card" style={{ padding: "20px" }}>
          {/* Header Row Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
            {/* Category Tabs */}
            <div style={{ display: "flex", gap: "6px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px" }}>
              <button
                onClick={() => setActiveCategoryTab("all_media")}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "5px 14px",
                  backgroundColor: activeCategoryTab === "all_media" ? "#fff" : "transparent",
                  color: activeCategoryTab === "all_media" ? "var(--text-primary)" : "var(--text-secondary)",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: activeCategoryTab === "all_media" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                }}
              >
                🎬 Movies &amp; Shows
              </button>
              <button
                onClick={() => setActiveCategoryTab("anime")}
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "5px 14px",
                  backgroundColor: activeCategoryTab === "anime" ? "#fff" : "transparent",
                  color: activeCategoryTab === "anime" ? "var(--text-primary)" : "var(--text-secondary)",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: activeCategoryTab === "anime" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                }}
              >
                🌸 Anime
              </button>
            </div>

            {/* Right side status pills & dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {activeCategoryTab === "all_media" && (
                <select
                  value={watchlistFilter}
                  onChange={(e) => setWatchlistFilter(e.target.value as any)}
                  style={{ fontSize: "11px", padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border-subtle)", backgroundColor: "#fff" }}
                >
                  <option value="all">All Types</option>
                  <option value="movie">Movies Only</option>
                  <option value="show">TV Shows Only</option>
                </select>
              )}

              <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px" }}>
                {[
                  { id: "all", label: "All" },
                  { id: "watching", label: "👁️ Watching" },
                  { id: "plan_to_watch", label: "⏳ Plan" },
                  { id: "completed", label: "✅ Done" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id as any)}
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "5px 12px",
                      backgroundColor: statusFilter === st.id ? "#fff" : "transparent",
                      color: statusFilter === st.id ? "var(--text-primary)" : "var(--text-secondary)",
                      borderRadius: "6px",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: statusFilter === st.id ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                    }}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Watchlist Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredWatchlist.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "14px",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-card)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                {/* Poster & Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                  {item.coverImage ? (
                    <img src={item.coverImage} alt={item.title} style={{ width: "40px", height: "56px", objectFit: "cover", borderRadius: "4px", flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }} />
                  ) : (
                    <div style={{ width: "40px", height: "56px", backgroundColor: "var(--bg-secondary)", borderRadius: "4px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                      {item.type === "movie" ? "🎬" : item.type === "show" ? "📺" : "🌸"}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "13.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
                    <p style={{ fontSize: "10.5px", color: "var(--text-muted)", marginTop: "1px" }}>
                      {item.type === "movie" ? "Movie" : item.type === "show" ? "Show" : "Anime"} {item.year ? `(${item.year})` : ""}
                    </p>

                    {/* Quick Episode Incrementer */}
                    {(item.type === "show" || item.type === "anime") && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)", fontFamily: "monospace", fontWeight: 500 }}>
                          Ep {item.progress || 0}{item.totalEpisodes ? `/${item.totalEpisodes}` : ""}
                        </span>
                        <button
                          onClick={() => updateWatchItem(item, { progress: Math.max(0, (item.progress || 0) - 1) })}
                          style={{ padding: "1px 6px", fontSize: "10px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "3px", cursor: "pointer", fontWeight: 600 }}
                        >
                          -
                        </button>
                        <button
                          onClick={() => updateWatchItem(item, { progress: (item.progress || 0) + 1 })}
                          style={{ padding: "1px 6px", fontSize: "10px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "3px", cursor: "pointer", fontWeight: 600 }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right controls: Status, Score, Delete */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <select
                    value={item.status}
                    onChange={(e) => updateWatchItem(item, { status: e.target.value as any })}
                    style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border-subtle)", backgroundColor: "#fff", cursor: "pointer" }}
                  >
                    <option value="watching">Watching</option>
                    <option value="plan_to_watch">Plan</option>
                    <option value="completed">Completed</option>
                    <option value="dropped">Dropped</option>
                  </select>

                  <select
                    value={item.rating || 0}
                    onChange={(e) => updateWatchItem(item, { rating: Number(e.target.value) || null })}
                    style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border-subtle)", backgroundColor: "#fff", cursor: "pointer" }}
                  >
                    <option value="0">Score v</option>
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>★ {n}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => deleteWatchItem(item.id)}
                    style={{ backgroundColor: "transparent", border: "none", color: "#b3666b", fontSize: "14px", fontWeight: 700, padding: "4px 8px", cursor: "pointer", borderRadius: "6px" }}
                    title="Delete item"
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(179,102,107,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}

            {filteredWatchlist.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px", fontSize: "13px" }}>
                {isFetchingWatchlist ? "Loading watchlist..." : "No items found in this view."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
