import React from "react";
import { WatchlistItem, SearchResult } from "@/types";
import { isSafeImageUrl } from "@/lib/safe-url";
import { Search, Trash2, Sparkles } from "lucide-react";

interface BooksTabProps {
  watchlist: WatchlistItem[];
  bookQuery: string;
  setBookQuery: (q: string) => void;
  searchBooks: (e: React.FormEvent) => void;
  isSearchingBooks: boolean;
  bookResults: SearchResult[];
  addBook: (b: SearchResult) => void;
  bookFilter: "all" | "reading" | "to_read" | "completed";
  setBookFilter: (f: "all" | "reading" | "to_read" | "completed") => void;
  updateWatchItem: (item: WatchlistItem, updates: Partial<WatchlistItem>) => void;
  deleteWatchItem: (id: string) => void;
  isFetchingWatchlist: boolean;
  enrichMissingBookCovers?: () => void;
  isEnrichingBookCovers?: boolean;
  onItemClick: (item: WatchlistItem) => void;
  idToken?: string;
}

const STAT_CARD = "flex flex-col gap-1 rounded-card border border-border-subtle bg-bg-card p-5 shadow-subtle relative overflow-hidden transition-all duration-200 hover:shadow-hover hover:-translate-y-0.5";
const LABEL_MONO = "font-mono text-[10px] font-semibold tracking-[0.8px] text-text-secondary uppercase";
const STAT_VALUE = "text-[28px] font-bold tracking-[-0.5px] text-text-primary";
const STAT_SUBTEXT = "mt-1 text-[11px] text-text-muted";
const BTN_PRIMARY = "rounded-md border border-text-primary bg-text-primary text-[13px] font-medium text-white transition-all duration-200 hover:border-[#2e2d27] hover:bg-[#2e2d27] active:scale-[0.98]";
const INPUT_CLASS = "rounded-lg border border-border-subtle bg-bg-card px-3 py-2 text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus";

const pillClass = (id: string, active: boolean) => {
  const base = "cursor-pointer rounded-md border-none px-3.5 py-1.5 text-[11px] font-semibold transition-all duration-200 flex items-center gap-1.5";
  if (!active) return `${base} bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary/40`;
  
  if (id === "reading") {
    return `${base} bg-[#e0f2fe] text-[#0369a1] shadow-[0_1px_2px_rgba(3,105,161,0.05)]`;
  }
  if (id === "to_read") {
    return `${base} bg-[#ffedd5] text-[#c2410c] shadow-[0_1px_2px_rgba(194,65,12,0.05)]`;
  }
  if (id === "completed") {
    return `${base} bg-[#dcfce7] text-[#15803d] shadow-[0_1px_2px_rgba(21,128,61,0.05)]`;
  }
  return `${base} bg-white text-text-primary shadow-sm`;
};

export const BooksTab: React.FC<BooksTabProps> = ({
  watchlist,
  bookQuery,
  setBookQuery,
  searchBooks,
  isSearchingBooks,
  bookResults,
  addBook,
  bookFilter,
  setBookFilter,
  updateWatchItem,
  deleteWatchItem,
  isFetchingWatchlist,
  enrichMissingBookCovers,
  isEnrichingBookCovers = false,
  onItemClick,
  idToken,
}) => {
  const [titleSearch, setTitleSearch] = React.useState("");
  const [sortBy, setSortBy] = React.useState<"title" | "year_new" | "year_old">("title");

  interface AIBookRecommendation {
    title: string;
    author: string;
    releaseYear?: string;
    rationale: string;
    synopsis: string;
    coverImage?: string | null;
    score?: string | null;
    date: string;
    isLogged?: boolean;
  }

  const [rec, setRec] = React.useState<AIBookRecommendation | null>(null);
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

    fetch("/api/assistant/recommendations?type=book", {
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
  }, [idToken]);

  const logRecommendation = async (status: "completed" | "dropped") => {
    if (!rec) return;
    setLogActionLoading(true);
    try {
      const score = status === "completed" ? parseInt(ratingInput, 10) : null;
      const body = {
        title: rec.title,
        type: "book",
        status: status,
        progress: 0,
        totalEpisodes: null,
        rating: score,
        coverImage: rec.coverImage || null,
        year: rec.releaseYear ? parseInt(rec.releaseYear, 10) : null,
        notes: `Author: ${rec.author}`,
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
          type: "book",
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

  const books = watchlist.filter((item) => item.type === "book");

  const filteredBooks = books
    .filter((item) => {
      if (bookFilter === "all") return true;
      if (bookFilter === "reading") return item.status === "watching";
      if (bookFilter === "to_read") return item.status === "plan_to_watch";
      if (bookFilter === "completed") return item.status === "completed";
      return true;
    })
    .filter((item) => {
      if (!titleSearch.trim()) return true;
      return item.title.toLowerCase().includes(titleSearch.trim().toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "year_new") return (b.year || 0) - (a.year || 0);
      if (sortBy === "year_old") return (a.year || 0) - (b.year || 0);
      return a.title.localeCompare(b.title);
    });

  const readingCount = books.filter((i) => i.status === "watching").length;
  const toReadCount = books.filter((i) => i.status === "plan_to_watch").length;
  const finishedCount = books.filter((i) => i.status === "completed").length;

  return (
    <div className="flex flex-col gap-6 animate-[fadeIn_0.4s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      <h1 className="font-serif text-3xl font-bold tracking-tight text-text-primary">Book Library</h1>

      {/* Book Stat Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        <div className={`${STAT_CARD} border-t-2 border-t-accent-blue/80`}>
          <span className={LABEL_MONO}>READING NOW</span>
          <span className={STAT_VALUE}>{readingCount}</span>
          <span className={STAT_SUBTEXT}>In progress</span>
        </div>
        <div className={`${STAT_CARD} border-t-2 border-t-[#e39282]/80`}>
          <span className={LABEL_MONO}>TO READ</span>
          <span className={STAT_VALUE} style={{ color: "#e39282" }}>{toReadCount}</span>
          <span className={STAT_SUBTEXT}>On the shelf</span>
        </div>
        <div className={`${STAT_CARD} border-t-2 border-t-[#b3666b]/80`}>
          <span className={LABEL_MONO}>FINISHED</span>
          <span className={STAT_VALUE} style={{ color: "#b3666b" }}>{finishedCount}</span>
          <span className={STAT_SUBTEXT}>Books read</span>
        </div>
        <div className={`${STAT_CARD} border-t-2 border-t-text-secondary/40`}>
          <span className={LABEL_MONO}>TOTAL IN LIBRARY</span>
          <span className={STAT_VALUE}>{books.length}</span>
          <span className={STAT_SUBTEXT}>All books</span>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-[260px_minmax(0,1fr)] items-start gap-5 max-md:grid-cols-1">
        {/* Left Column wrapper */}
        <div className="flex flex-col gap-5">
          {/* Search Google Books Card */}
          <div className="rounded-card border border-border-subtle bg-bg-card p-4.5 shadow-subtle flex flex-col gap-3">
            <span className={`${LABEL_MONO} mb-1 block`}>Search Google Books</span>
            <p className="mb-3.5 text-[11px] text-text-muted">Google Books API search</p>
            <form onSubmit={searchBooks} className="flex flex-col gap-2.5">
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-text-muted pointer-events-none">
                  <Search className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <input
                  type="text"
                  placeholder="Search books..."
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-subtle bg-bg-card text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus"
                  required
                />
              </div>
              <button type="submit" disabled={isSearchingBooks} className={`${BTN_PRIMARY} w-full py-2.5`}>
                {isSearchingBooks ? "Searching..." : "Search"}
              </button>
            </form>

            {/* Search Results */}
            {bookResults.length > 0 && (
              <div className="mt-4 flex max-h-[300px] flex-col gap-2.5 overflow-y-auto pr-1">
                {bookResults.map((res, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-md bg-bg-secondary p-2">
                    {isSafeImageUrl(res.coverImage) ? (
                      <img src={res.coverImage} alt={res.title} className="h-12 w-8.5 rounded object-cover shadow-sm" />
                    ) : (
                      <div className="flex h-12 w-8.5 items-center justify-center rounded bg-bg-card text-lg">📚</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-text-primary" title={res.title}>{res.title}</p>
                      <p className="text-[10px] text-text-muted">{res.year || "—"}</p>
                      <button
                        onClick={() => addBook(res)}
                        className="mt-1 cursor-pointer rounded border-none bg-text-primary px-1.5 py-0.5 text-[9.5px] text-white hover:bg-[#2e2d27]"
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
          <div className="rounded-card border border-border-subtle bg-bg-card p-4.5 shadow-subtle flex flex-col gap-3">
            <span className={`${LABEL_MONO} mb-1 block`}>🤖 AI Recommendation of the Day</span>
            <p className="text-[10px] leading-[1.4] text-text-secondary mb-1">
              Get 1 personalized suggestion for today based on your book reading history.
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
                        📚
                      </div>
                    )}
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[12.5px] font-bold text-text-primary leading-tight block">
                          {rec.title}
                        </span>
                        <span className="text-[10px] text-text-muted mt-0.5 block">
                          By {rec.author} {rec.releaseYear ? `(${rec.releaseYear})` : ""}
                        </span>
                      </div>
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
                    <span>✓</span> Added to your library
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
                            type="button"
                            onClick={() => logRecommendation("completed")}
                            disabled={logActionLoading}
                            className="rounded bg-text-primary text-[10px] font-bold text-white py-1.5 hover:bg-[#2e2d27] disabled:opacity-50 text-center"
                          >
                            {logActionLoading ? "Saving..." : "Log"}
                          </button>
                          <button
                            type="button"
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
                          type="button"
                          onClick={() => setShowRatingSelector(true)}
                          disabled={logActionLoading}
                          className="rounded-md border border-text-primary bg-text-primary text-[11px] font-semibold text-white py-2 hover:bg-[#2e2d27] cursor-pointer disabled:opacity-50 animate-[fadeIn_0.2s_ease]"
                        >
                          Completed
                        </button>
                        <button
                          type="button"
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

        {/* Right Column: Your Library Section */}
        <div>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-bold tracking-tight text-text-primary">Your Library</h2>

          <div className="flex flex-wrap items-center gap-2.5">
            {books.some((b) => !b.coverImage) && enrichMissingBookCovers && (
              <button
                onClick={enrichMissingBookCovers}
                disabled={isEnrichingBookCovers}
                className="flex cursor-pointer items-center gap-1 rounded-md border border-border-subtle bg-bg-card px-3 py-1.5 text-[11px] font-semibold text-text-primary transition-all duration-150 hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                title="Scan for books with missing cover art and fetch them from OpenLibrary"
              >
                <Sparkles className="h-3 w-3" strokeWidth={2.5} />
                {isEnrichingBookCovers ? "Fetching..." : "Fetch Posters"}
              </button>
            )}

            {/* Filter Pills */}
            <div className="flex gap-1 rounded-lg bg-bg-secondary p-[3px]">
              {(
                [
                  { id: "reading", label: "📖 Reading" },
                  { id: "to_read", label: "⏳ To Read" },
                  { id: "completed", label: "✅ Done" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setBookFilter(bookFilter === f.id ? "all" : f.id)}
                  className={pillClass(f.id, bookFilter === f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search & sort row */}
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <div className="relative max-w-[260px] flex-1 max-md:max-w-none">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted">
              <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <input
              type="text"
              placeholder="Search your library by title..."
              value={titleSearch}
              onChange={(e) => setTitleSearch(e.target.value)}
              className={`${INPUT_CLASS} w-full pl-8`}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="cursor-pointer rounded-md border border-border-subtle bg-white px-3 py-1.5 text-[11px] max-md:flex-1"
          >
            <option value="title">Sort: Title A–Z</option>
            <option value="year_new">Sort: Newest Year</option>
            <option value="year_old">Sort: Oldest Year</option>
          </select>
        </div>

        {/* Book Covers Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5">
          {filteredBooks.map((item) => (
            <div key={item.id} className="group flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-card p-3 shadow-subtle hover:shadow-[0_8px_30px_rgba(28,27,24,0.04)] transition-all duration-300 hover:-translate-y-1">
              <div 
                onClick={() => onItemClick(item)}
                className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-sm transition-all duration-300 group-hover:shadow-md cursor-pointer"
              >
                {isSafeImageUrl(item.coverImage) ? (
                  <>
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                    {/* 3D Book spine shadow overlay */}
                    <div className="absolute inset-y-0 left-0 w-2.5 bg-linear-to-r from-black/25 via-black/10 to-transparent pointer-events-none" />
                    {/* Subtle gloss overlay to simulate paper book cover sheen */}
                    <div className="absolute inset-0 bg-linear-to-tr from-white/0 via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-bg-secondary text-4xl shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                    📚
                  </div>
                )}
                {/* Delete button absolute overlay (visible on hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteWatchItem(item.id);
                  }}
                  className="absolute top-2 right-2 z-10 cursor-pointer items-center justify-center rounded-md border border-border-subtle bg-white/95 text-text-muted shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[#fdf2f2] hover:text-[#b3666b] hover:border-[#fde2e2] active:scale-95"
                  title="Remove book"
                >
                  <Trash2 className="h-3 w-3 " strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex flex-col flex-1 justify-between gap-2.5">
                <p 
                  onClick={() => onItemClick(item)}
                  className="cursor-pointer line-clamp-2 min-h-[36px] font-serif text-[13px] font-bold tracking-tight text-text-primary leading-tight group-hover:text-text-primary/90 transition-colors" 
                  title={item.title}
                >
                  {item.title}
                </p>
                <div className="relative w-full mt-auto">
                  <select
                    value={item.status}
                    onChange={(e) => updateWatchItem(item, { status: e.target.value as any })}
                    className="w-full cursor-pointer appearance-none rounded-lg border border-border-subtle bg-bg-secondary/40 py-1 pl-2.5 pr-6 text-[10.5px] font-bold text-text-secondary transition-all duration-200 hover:border-border-hover hover:bg-bg-secondary hover:text-text-primary outline-none"
                  >
                    <option value="watching">📖 Reading</option>
                    <option value="plan_to_watch">⏳ To Read</option>
                    <option value="completed">✅ Done</option>
                  </select>
                  <span className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-text-muted text-[8px] select-none">
                    ▼
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filteredBooks.length === 0 && (
            <p className="col-span-full p-8 text-center text-[13px] text-text-muted">
              {isFetchingWatchlist ? "Loading library..." : "No books found in this view."}
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
);
};
