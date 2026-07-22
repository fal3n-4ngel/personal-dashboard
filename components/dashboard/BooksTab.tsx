import React from "react";
import { WatchlistItem, SearchResult } from "@/types";
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
}) => {
  const books = watchlist.filter((item) => item.type === "book");

  const filteredBooks = books.filter((item) => {
    if (bookFilter === "all") return true;
    if (bookFilter === "reading") return item.status === "watching";
    if (bookFilter === "to_read") return item.status === "plan_to_watch";
    if (bookFilter === "completed") return item.status === "completed";
    return true;
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

      {/* Search Google Books Card */}
      <div className="rounded-card border border-border-subtle bg-bg-card p-6 shadow-subtle">
        <span className={`${LABEL_MONO} mb-4 block`}>Search Google Books</span>
        <form onSubmit={searchBooks} className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-text-muted pointer-events-none">
              <Search className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <input
              type="text"
              placeholder="Search for books by title, author..."
              value={bookQuery}
              onChange={(e) => setBookQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-subtle bg-bg-card text-[13px] text-text-primary outline-none transition-all duration-200 focus:border-border-hover focus:shadow-focus"
              required
            />
          </div>
          <button type="submit" disabled={isSearchingBooks} className={`${BTN_PRIMARY} px-6 py-2`}>
            {isSearchingBooks ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Search Results */}
        {bookResults.length > 0 && (
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {bookResults.map((res, i) => (
              <div key={i} className="group flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-primary p-3 transition-all duration-200 hover:bg-bg-secondary/40 hover:border-border-hover">
                <div className="relative shrink-0 shadow-sm rounded overflow-hidden h-14 w-10 bg-bg-secondary flex items-center justify-center">
                  {res.coverImage ? (
                    <>
                      <img src={res.coverImage} alt={res.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-y-0 left-0 w-1.5 bg-linear-to-r from-black/25 via-black/10 to-transparent pointer-events-none" />
                    </>
                  ) : (
                    <span className="text-lg">📚</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-text-primary" title={res.title}>{res.title}</p>
                  <p className="mt-0.5 text-[10px] text-text-muted">{res.year || "—"}</p>
                  <button
                    onClick={() => addBook(res)}
                    className="mt-2 rounded-md border border-border-subtle bg-bg-card hover:bg-bg-secondary hover:border-border-hover text-text-primary px-2.5 py-1 text-[10px] font-semibold transition-all duration-150 flex items-center justify-center gap-1 w-fit cursor-pointer"
                  >
                    + Add Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Your Library Section */}
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
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

        {/* Book Covers Grid */}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-5">
          {filteredBooks.map((item) => (
            <div key={item.id} className="group flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-card p-3 shadow-subtle hover:shadow-[0_8px_30px_rgba(28,27,24,0.04)] transition-all duration-300 hover:-translate-y-1">
              <div 
                onClick={() => onItemClick(item)}
                className="relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-sm transition-all duration-300 group-hover:shadow-md cursor-pointer"
              >
                {item.coverImage ? (
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
  );
};
