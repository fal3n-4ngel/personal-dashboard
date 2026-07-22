import React, { useState, useEffect } from "react";
import { WatchlistItem, FirebaseUser } from "@/types";
import { anilistQuery } from "@/lib/anilist";
import { traktRequest } from "@/lib/trakt-client";

interface MediaDetailsModalProps {
  item: WatchlistItem;
  onClose: () => void;
  user: FirebaseUser;
}

const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

export const MediaDetailsModal: React.FC<MediaDetailsModalProps> = ({ item, onClose, user }) => {
  const [synopsis, setSynopsis] = useState<string | null>(null);
  const [director, setDirector] = useState<string | null>(null);
  const [author, setAuthor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchSynopsis = async () => {
      setIsLoading(true);
      setSynopsis(null);
      setDirector(null);
      setAuthor(null);
      try {
        // 1. Anime (AniList)
        if (item.type === "anime" && item.anilistId) {
          const query = `
            query ($id: Int) {
              Media(id: $id) {
                description
                staff(limit: 8) {
                  edges {
                    role
                    node { name { full } }
                  }
                }
              }
            }
          `;
          const data = await anilistQuery(query, { id: item.anilistId });
          const desc = data?.data?.Media?.description;
          if (active && desc) {
            setSynopsis(stripHtml(desc));
          }
          // Anime director lookup
          const staffEdges = data?.data?.Media?.staff?.edges || [];
          const dirNode = staffEdges.find((e: any) => e.role && e.role.toLowerCase().includes("director"));
          if (active && dirNode) {
            setDirector(dirNode.node.name.full);
          }
          if (desc && active) return;
        }

        // 2. TV Show / Movie via Trakt Details
        if ((item.type === "movie" || item.type === "show") && item.traktId) {
          try {
            const apiKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
            let omdbSucceeded = false;
            
            // First fetch Trakt details to get the IMDb ID
            const details = await traktRequest(user.idToken, `${item.type}s/${item.traktId}`);
            if (active && details?.overview) {
              setSynopsis(details.overview);
            }
            const imdbId = details?.ids?.imdb;

            if (imdbId && apiKey) {
              try {
                const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&plot=full&apikey=${apiKey}`);
                if (res.ok) {
                  const data = await res.json();
                  if (active && data.Director && data.Director !== "N/A") {
                    setDirector(data.Director);
                  }
                  if (active && data.Plot && data.Plot !== "N/A" && !details?.overview) {
                    setSynopsis(data.Plot);
                  }
                  omdbSucceeded = true;
                }
              } catch (e) {
                console.error("OMDb inner search failed:", e);
              }
            }

            if (!omdbSucceeded && active) {
              // Try Trakt People as fallback for Director
              try {
                const people = await traktRequest(user.idToken, `${item.type}s/${item.traktId}/people`);
                const directors = people?.crew?.directing
                  ?.filter((m: any) => m.job === "Director")
                  ?.map((m: any) => m.person?.name);
                if (active && directors && directors.length > 0) {
                  setDirector(directors.join(", "));
                }
              } catch (peopleErr) {
                console.error("Trakt people failed:", peopleErr);
              }
            }
            if (active) return;
          } catch (e) {
            console.error("Trakt details fetch error:", e);
          }
        }

        // 3. Fallback: TV Show TVMaze check
        if (item.type === "show") {
          try {
            const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(item.title)}`);
            if (res.ok) {
              const data = await res.json();
              if (active && data.summary) {
                setSynopsis(stripHtml(data.summary));
              }
              if (active && data._embedded?.cast?.[0]?.person?.name) {
                // TVMaze creator fallback info
                setDirector(data._embedded?.cast?.[0]?.person?.name);
              }
              if (active && data.summary) return;
            }
          } catch (e) {
            console.error("TVMaze summary error:", e);
          }
        }

        // 4. Fallback: Movie/Show OMDb Plot check
        const apiKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
        if ((item.type === "movie" || item.type === "show") && apiKey) {
          try {
            const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(item.title)}&plot=full&apikey=${apiKey}`);
            if (res.ok) {
              const data = await res.json();
              if (active && data.Director && data.Director !== "N/A") {
                setDirector(data.Director);
              }
              if (active && data.Plot && data.Plot !== "N/A") {
                setSynopsis(data.Plot);
                return;
              }
            }
          } catch (e) {
            console.error("OMDb plot error:", e);
          }
        }

        // 5. Books via Google Books API with OpenLibrary Fallback
        if (item.type === "book") {
          let descFound = false;
          try {
            const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(item.title)}`);
            if (res.ok) {
              const data = await res.json();
              const desc = data.items?.[0]?.volumeInfo?.description;
              const authors = data.items?.[0]?.volumeInfo?.authors;
              if (active && authors && authors.length > 0) {
                setAuthor(authors.join(", "));
              }
              if (desc) {
                setSynopsis(desc);
                descFound = true;
              }
            }
          } catch (e) {
            console.warn("Google Books API failed, falling back to OpenLibrary:", e);
          }

          if (!descFound) {
            try {
              const searchRes = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(item.title)}&limit=1`);
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                const firstDoc = searchData.docs?.[0];
                const workKey = firstDoc?.key;
                const authorNames = firstDoc?.author_name;
                if (active && authorNames && authorNames.length > 0) {
                  setAuthor(authorNames.join(", "));
                }
                if (workKey) {
                  const workRes = await fetch(`https://openlibrary.org${workKey}.json`);
                  if (workRes.ok) {
                    const workData = await workRes.json();
                    let desc = workData.description;
                    if (desc) {
                      if (typeof desc === "object" && desc.value) {
                        desc = desc.value;
                      }
                      setSynopsis(stripHtml(desc));
                      descFound = true;
                    }
                  }
                }
              }
            } catch (olErr) {
              console.error("OpenLibrary fallback failed:", olErr);
            }
          }

          if (descFound && active) return;
        }

        if (active) {
          setSynopsis("No synopsis available.");
        }
      } catch (err) {
        console.error("Error fetching synopsis:", err);
        if (active) {
          setSynopsis("Could not load description.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchSynopsis();

    return () => {
      active = false;
    };
  }, [item, user.idToken]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex w-[500px] max-w-[90%] flex-col gap-4 rounded-card border border-border-subtle bg-[#f4f3ec] p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)] text-text-primary relative max-h-[85vh] overflow-y-auto">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4.5 right-4.5 cursor-pointer border-none bg-transparent p-1 text-base text-text-secondary hover:text-text-primary transition-colors"
        >
          ✕
        </button>

        {/* Modal Content Layout */}
        <div className="flex gap-5 max-sm:flex-col">
          {/* Left Column: Poster / Cover */}
          <div className="w-32 shrink-0 max-sm:mx-auto relative">
            {item.coverImage ? (
              <>
                <img src={item.coverImage} alt={item.title} className="w-full rounded-lg shadow-sm object-cover aspect-[2/3]" />
                {item.type === "book" && (
                  <div className="absolute inset-y-0 left-0 w-2.5 bg-linear-to-r from-black/25 via-black/10 to-transparent pointer-events-none" />
                )}
              </>
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center rounded-lg bg-bg-secondary text-4xl shadow-sm">
                {item.type === "movie" ? "🎬" : item.type === "show" ? "📺" : item.type === "anime" ? "🌸" : "📚"}
              </div>
            )}
          </div>

          {/* Right Column: Metadata & Synopsis */}
          <div className="flex-1 min-w-0">
            <span className="inline-block rounded bg-[#eae8e0] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-text-secondary">
              {item.type === "movie" ? "Movie" : item.type === "show" ? "TV Show" : item.type === "anime" ? "Anime" : "Book"}
            </span>
            <h3 className="mt-2 text-[15px] font-bold leading-tight font-serif tracking-tight text-text-primary break-words">
              {item.title}
            </h3>
            {director && (
              <p className="text-[11.5px] text-text-secondary mt-1.5 font-medium">
                Director: <span className="text-text-primary font-semibold">{director}</span>
              </p>
            )}
            {author && (
              <p className="text-[11.5px] text-text-secondary mt-1.5 font-medium">
                Author: <span className="text-text-primary font-semibold">{author}</span>
              </p>
            )}
            {item.year && (
              <p className="text-[11px] text-text-muted mt-1.5">
                {item.type === "book" ? "Published:" : "Release Year:"} {item.year}
              </p>
            )}

            {/* Status & Rating */}
            <div className="mt-4 flex flex-col gap-2.5 border-t border-b border-border-subtle py-3.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Status:</span>
                <span className="font-semibold capitalize">
                  {item.status === "watching" && item.type === "book" ? "Reading" : item.status.replace(/_/g, " ")}
                </span>
              </div>
              {(item.type === "show" || item.type === "anime") && (
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">Progress:</span>
                  <span className="font-mono font-semibold">
                    Ep {item.progress || 0}{item.totalEpisodes ? ` / ${item.totalEpisodes}` : ""}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary">Rating:</span>
                <span className="font-semibold">
                  {item.rating ? `★ ${item.rating} / 10` : "No rating yet"}
                </span>
              </div>
            </div>

            {/* Synopsis Section */}
            <div className="mt-4">
              <h4 className="font-serif text-[12px] font-bold text-text-primary">Synopsis</h4>
              <div className="mt-1.5 max-h-[160px] overflow-y-auto pr-1 text-[11.5px] leading-[1.6] text-text-secondary whitespace-pre-line">
                {isLoading ? (
                  <span className="text-text-muted italic">Fetching synopsis...</span>
                ) : (
                  synopsis
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-4 text-[9.5px] text-text-muted flex flex-col gap-1 border-t border-border-subtle pt-3">
              <p>Last Updated: {new Date(item.updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
              {item.anilistId && (
                <p>AniList ID: <span className="font-mono">{item.anilistId}</span></p>
              )}
              {item.traktId && (
                <p>Trakt ID: <span className="font-mono">{item.traktId}</span></p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
