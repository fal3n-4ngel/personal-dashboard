import React from "react";
import { WatchlistItem, SearchResult } from "@/types";

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
}

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
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Book Library</h1>

      {/* Book Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        <div className="stat-card">
          <span className="label-mono">READING NOW</span>
          <span className="stat-value">{readingCount}</span>
          <span className="stat-subtext">In progress</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">TO READ</span>
          <span className="stat-value" style={{ color: "#e39282" }}>{toReadCount}</span>
          <span className="stat-subtext">On the shelf</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">FINISHED</span>
          <span className="stat-value" style={{ color: "#e39282" }}>{finishedCount}</span>
          <span className="stat-subtext">Books read</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">TOTAL IN LIBRARY</span>
          <span className="stat-value">{books.length}</span>
          <span className="stat-subtext">All books</span>
        </div>
      </div>

      {/* Search Google Books Card */}
      <div className="bento-card">
        <span className="label-mono" style={{ marginBottom: "12px", display: "block" }}>Search Google Books</span>
        <form onSubmit={searchBooks} style={{ display: "flex", gap: "12px" }}>
          <input
            type="text"
            placeholder="Title, Author..."
            value={bookQuery}
            onChange={(e) => setBookQuery(e.target.value)}
            style={{ flex: 1 }}
            required
          />
          <button type="submit" disabled={isSearchingBooks} className="btn-primary" style={{ padding: "8px 24px" }}>
            {isSearchingBooks ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Search Results */}
        {bookResults.length > 0 && (
          <div style={{ marginTop: "16px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
            {bookResults.map((res, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", backgroundColor: "var(--bg-body)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)", alignItems: "center" }}>
                {res.coverImage ? (
                  <img src={res.coverImage} alt={res.title} style={{ width: "40px", height: "56px", objectFit: "cover", borderRadius: "4px" }} />
                ) : (
                  <div style={{ width: "40px", height: "56px", backgroundColor: "var(--bg-secondary)", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>📚</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{res.title}</p>
                  <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{res.year || "—"}</p>
                  <button onClick={() => addBook(res)} className="btn-secondary" style={{ fontSize: "10px", padding: "3px 8px", marginTop: "6px" }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Your Library</h2>

          {/* Filter Pills */}
          <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px" }}>
            {[
              { id: "reading", label: "📖 Reading" },
              { id: "to_read", label: "⏳ To Read" },
              { id: "completed", label: "✅ Done" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setBookFilter(bookFilter === f.id ? "all" : (f.id as any))}
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "4px 10px",
                  backgroundColor: bookFilter === f.id ? "#fff" : "transparent",
                  color: bookFilter === f.id ? "var(--text-primary)" : "var(--text-secondary)",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: bookFilter === f.id ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Book Covers Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "24px" }}>
          {filteredBooks.map((item) => (
            <div
              key={item.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                transition: "transform 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
            >
              {item.coverImage ? (
                <img
                  src={item.coverImage}
                  alt={item.title}
                  style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
              ) : (
                <div style={{ width: "100%", height: "180px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "36px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  📚
                </div>
              )}
              <div>
                <p style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", minHeight: "38px" }}>
                  {item.title}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                  <select
                    value={item.status}
                    onChange={(e) => updateWatchItem(item, { status: e.target.value as any })}
                    style={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border-subtle)", backgroundColor: "#fff", cursor: "pointer", flex: 1, marginRight: "8px" }}
                  >
                    <option value="watching">Reading</option>
                    <option value="plan_to_watch">To Read</option>
                    <option value="completed">Done</option>
                  </select>
                  <button
                    onClick={() => deleteWatchItem(item.id)}
                    style={{ backgroundColor: "transparent", border: "none", color: "#b3666b", fontSize: "13px", cursor: "pointer", padding: "4px" }}
                    title="Remove book"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredBooks.length === 0 && (
            <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)", padding: "32px", fontSize: "13px" }}>
              {isFetchingWatchlist ? "Loading library..." : "No books found in this view."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
