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

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>Book Library</h1>

      {/* Book Stats */}
      <div className="responsive-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "14px" }}>
        <div className="stat-card">
          <span className="label-mono">Reading Now</span>
          <span className="stat-value">{books.filter((i) => i.status === "watching").length}</span>
          <span className="stat-subtext">In progress</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">To Read</span>
          <span className="stat-value">{books.filter((i) => i.status === "plan_to_watch").length}</span>
          <span className="stat-subtext">Reading list</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">Finished</span>
          <span className="stat-value" style={{ color: "#16a34a" }}>{books.filter((i) => i.status === "completed").length}</span>
          <span className="stat-subtext">Books read</span>
        </div>
        <div className="stat-card">
          <span className="label-mono">Total Library</span>
          <span className="stat-value">{books.length}</span>
          <span className="stat-subtext">Total books</span>
        </div>
      </div>

      {/* OpenLibrary Search Form */}
      <div className="bento-card">
        <span className="label-mono" style={{ marginBottom: "12px", display: "block" }}>Search OpenLibrary</span>
        <form onSubmit={searchBooks} style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Search book title or author..."
            value={bookQuery}
            onChange={(e) => setBookQuery(e.target.value)}
            style={{ flex: 1 }}
            required
          />
          <button type="submit" disabled={isSearchingBooks} className="btn-primary">
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

      {/* Filter Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "4px", backgroundColor: "var(--bg-secondary)", borderRadius: "8px", padding: "3px" }}>
          {[
            { id: "all", label: "All Books" },
            { id: "reading", label: "Reading Now" },
            { id: "to_read", label: "To Read" },
            { id: "completed", label: "Finished" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setBookFilter(f.id as any)}
              style={{
                fontSize: "11px",
                fontWeight: 600,
                padding: "5px 12px",
                backgroundColor: bookFilter === f.id ? "#fff" : "transparent",
                color: bookFilter === f.id ? "var(--text-primary)" : "var(--text-secondary)",
                borderRadius: "6px",
                boxShadow: bookFilter === f.id ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                transition: "all 0.2s",
                border: "none",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{filteredBooks.length} books</span>
      </div>

      {/* Book Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
        {filteredBooks.map((item) => (
          <div key={item.id} className="bento-card" style={{ padding: "14px", display: "flex", gap: "12px" }}>
            {item.coverImage ? (
              <img src={item.coverImage} alt={item.title} style={{ width: "70px", height: "100px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} />
            ) : (
              <div style={{ width: "70px", height: "100px", backgroundColor: "var(--bg-secondary)", borderRadius: "6px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                📚
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: "13.5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.title}>
                  {item.title}
                </p>
                {item.year && <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{item.year}</p>}
              </div>

              <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <select
                  value={item.status}
                  onChange={(e) => updateWatchItem(item, { status: e.target.value as any })}
                  style={{ fontSize: "11px", padding: "3px 6px", width: "100%" }}
                >
                  <option value="plan_to_watch">To Read</option>
                  <option value="watching">Reading Now</option>
                  <option value="completed">Finished</option>
                  <option value="dropped">Dropped</option>
                </select>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    onClick={() => deleteWatchItem(item.id)}
                    style={{ backgroundColor: "transparent", border: "none", color: "#b3666b", fontSize: "11px", marginLeft: "auto", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {filteredBooks.length === 0 && (
          <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--text-muted)", padding: "32px" }}>
            {isFetchingWatchlist ? "Loading books..." : "No books in this list."}
          </p>
        )}
      </div>
    </div>
  );
};
