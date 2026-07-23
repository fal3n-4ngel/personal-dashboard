import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);

    const username = req.nextUrl.searchParams.get("username");
    if (!username) {
      throw new ApiError(400, "Username query parameter is required");
    }

    const feedUrl = `https://letterboxd.com/${encodeURIComponent(username.trim())}/rss/`;
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      throw new ApiError(res.status, `Failed to fetch Letterboxd RSS feed for username: ${username}`);
    }

    const xml = await res.text();
    const items = xml.split("<item>");
    items.shift(); // Remove channel metadata before the first item

    const movies = items
      .map((item) => {
        // Match film title (which might be inside CDATA)
        const titleMatch = item.match(/<letterboxd:filmTitle>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/letterboxd:filmTitle>/);
        const yearMatch = item.match(/<letterboxd:filmYear>(\d+)<\/letterboxd:filmYear>/);
        const ratingMatch = item.match(/<letterboxd:memberRating>([\d.]+)<\/letterboxd:memberRating>/);

        const title = titleMatch ? titleMatch[1].trim() : null;
        const year = yearMatch ? parseInt(yearMatch[1], 10) : null;
        // Letterboxd rating is out of 5 (e.g. 4.5), scale it to 10 (e.g. 9.0)
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) * 2 : null;

        return {
          title,
          year,
          rating,
          type: "movie" as const,
          status: "completed" as const, // items in diary/feed are watched
          progress: 1,
          totalEpisodes: 1,
        };
      })
      .filter((m) => m.title !== null);

    return NextResponse.json({ username, movies });
  } catch (error) {
    return toErrorResponse(error, "GET /api/watchlist/letterboxd");
  }
}
