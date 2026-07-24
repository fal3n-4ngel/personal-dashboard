import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";
import { listWatchlist, addWatchlistItem, updateWatchlistItem } from "@/lib/firebase";
import { validateNewWatchlistItem } from "@/lib/validate";

export const dynamic = "force-dynamic";

async function autohealWatchlistItem(session: any, id: string, item: any) {
  let coverImage: string | null = null;

  try {
    if (item.type === "movie" || item.type === "show") {
      const apiKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
      if (apiKey) {
        try {
          const res = await fetch(
            `https://www.omdbapi.com/?t=${encodeURIComponent(item.title)}&y=${item.year || ""}&apikey=${apiKey}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.Poster && data.Poster !== "N/A") {
              coverImage = data.Poster;
            }
          }
        } catch (e) {
          console.error("[Autoheal] OMDb fetch failed:", e);
        }
      }

      if (!coverImage && item.type === "show") {
        try {
          const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(item.title)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.image?.medium) {
              coverImage = data.image.medium;
            }
          }
        } catch (e) {
          console.error("[Autoheal] TVMaze fetch failed:", e);
        }
      }
    } else if (item.type === "book") {
      try {
        const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(item.title)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          const doc = data.docs?.[0];
          if (doc?.cover_i) {
            coverImage = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
          }
        }
      } catch (e) {
        console.error("[Autoheal] OpenLibrary fetch failed:", e);
      }
    }

    if (coverImage) {
      console.log(`[Autoheal] Found cover image for ${item.title}: ${coverImage}`);
      await updateWatchlistItem(session, id, { coverImage });
    }
  } catch (err) {
    console.error("[Autoheal] Error autohealing item:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    let items = await listWatchlist(session);

    const type = req.nextUrl.searchParams.get("type");
    const status = req.nextUrl.searchParams.get("status");
    const q = req.nextUrl.searchParams.get("q");
    const limitParam = req.nextUrl.searchParams.get("limit");
    const offsetParam = req.nextUrl.searchParams.get("offset");

    if (type) {
      items = items.filter((i) => i.type.toLowerCase() === type.toLowerCase());
    }
    if (status) {
      items = items.filter((i) => i.status.toLowerCase() === status.toLowerCase());
    }
    if (q) {
      const qLower = q.toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(qLower));
    }

    const total = items.length;
    const hasPagination = limitParam !== null || offsetParam !== null;

    if (hasPagination) {
      const offset = Math.max(0, parseInt(offsetParam || "0", 10) || 0);
      const limit = Math.max(1, parseInt(limitParam || "50", 10) || 50);
      const paginatedItems = items.slice(offset, offset + limit);
      return NextResponse.json({
        items: paginatedItems,
        total,
        offset,
        limit,
        hasMore: offset + limit < total,
      });
    }

    return NextResponse.json(items);
  } catch (error) {
    return toErrorResponse(error, "GET /api/watchlist");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(400, "Invalid JSON body");
    }

    const item = validateNewWatchlistItem(body);
    const result = await addWatchlistItem(session, item);

    if (!item.coverImage) {
      autohealWatchlistItem(session, result.id, item).catch((err) => {
        console.error("Autohealing background error:", err);
      });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return toErrorResponse(error, "POST /api/watchlist");
  }
}
