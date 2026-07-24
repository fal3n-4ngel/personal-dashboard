import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listWatchlist, getDailyRecommendations, saveDailyRecommendation, DailyRecommendation } from "@/lib/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError, toErrorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

// Calculate active recommendation date in IST (UTC+5:30) with 6 AM rollover
function getActiveIstDate() {
  const nowUtc = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(nowUtc.getTime() + istOffset);
  
  if (nowIst.getUTCHours() < 6) {
    nowIst.setUTCDate(nowIst.getUTCDate() - 1);
  }
  
  const yyyy = nowIst.getUTCFullYear();
  const mm = String(nowIst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowIst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const type = req.nextUrl.searchParams.get("type") || "movie"; // "movie", "show", "anime", or "book"

    const dateStr = getActiveIstDate();
    const key = `${type}_${dateStr}`;

    // 1. Check if recommendation is already generated in Firestore
    const currentRecs = await getDailyRecommendations(session);
    if (currentRecs[key]) {
      return NextResponse.json({ recommendation: currentRecs[key] });
    }

    // 2. Fallback: Generate on-the-fly if not present (e.g. cron missed it)
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new ApiError(500, "Server GEMINI_API_KEY is not configured.");
    }

    const allItems = await listWatchlist(session);
    const existingTitles = allItems.map((item) => item.title.toLowerCase().trim());
    let prompt = "";

    if (type === "book") {
      const books = allItems.filter((i) => i.type === "book");
      const readList = books.filter((b) => b.status === "completed").map((b) => b.title).slice(-15);
      const planList = books.filter((b) => b.status === "plan_to_watch").map((b) => b.title).slice(-15);
      
      prompt = `
You are a premium library assistant. Based on the user's reading lists:
Completed books: ${JSON.stringify(readList)}
Plan to read books: ${JSON.stringify(planList)}

Recommend exactly 1 book they should read next.
DO NOT recommend any book that is already in their library list: ${JSON.stringify(existingTitles)}. This is a strict constraint.
Return ONLY a valid JSON object with the keys:
- "title": Title of the book
- "author": Author name
- "releaseYear": The publication year (as a string)
- "synopsis": A short 2-3 sentence engaging synopsis of the book
- "rationale": A short 1-2 sentence explanation of why they will like it based on their history.

Return no other text, comments or markdown blocks. Just the raw JSON object.
`;
    } else {
      const media = allItems.filter((i) => i.type === type);
      const watched = media
        .filter((m) => m.status === "completed")
        .map((m) => ({ title: m.title, rating: m.rating }))
        .slice(-15);
      const planList = media
        .filter((m) => m.status === "plan_to_watch")
        .map((m) => ({ title: m.title }))
        .slice(-15);

      prompt = `
You are a premium AI media assistant. Based on the user's ${type} list history:
Completed ${type} list: ${JSON.stringify(watched)}
Plan to watch ${type} list: ${JSON.stringify(planList)}

Recommend exactly 1 ${type} they should watch next.
DO NOT recommend any ${type} that is already in their watchlist: ${JSON.stringify(existingTitles)}. This is a strict constraint.
Return ONLY a valid JSON object with the keys:
- "title": Title of the ${type}
- "releaseYear": The release year (as a string)
- "synopsis": A short 2-3 sentence engaging synopsis/plot of the ${type}
- "rationale": A short 1-2 sentence explanation of why they will like it based on their history.

Return no other text, comments or markdown blocks. Just the raw JSON object.
`;
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const response = await model.generateContent(prompt);
    const replyText = response.response.text();
    const geminiResult = JSON.parse(replyText.trim());

    // Quick single-attempt lookup
    let coverImage: string | null = null;
    let score: string | null = null;

    if (type === "book") {
      try {
        const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(geminiResult.title)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          const doc = data.docs?.[0];
          if (doc?.cover_i) {
            coverImage = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
          }
        }
      } catch (e) {
        console.error("OpenLibrary fallback fetch failed:", e);
      }
    } else {
      const omdbKey = process.env.NEXT_PUBLIC_IMDB_API_KEY;
      if (omdbKey) {
        try {
          const res = await fetch(
            `https://www.omdbapi.com/?t=${encodeURIComponent(geminiResult.title)}&y=${geminiResult.releaseYear || ""}&apikey=${omdbKey}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.Poster && data.Poster !== "N/A") coverImage = data.Poster;
            if (data.imdbRating && data.imdbRating !== "N/A") score = data.imdbRating;
          }
        } catch (e) {
          console.error("OMDb fallback fetch failed:", e);
        }
      }

      if (!coverImage) {
        try {
          const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(geminiResult.title)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.image?.medium) coverImage = data.image.medium;
            if (data.rating?.average) score = String(data.rating.average);
          }
        } catch (e) {
          console.error("TVMaze fallback fetch failed:", e);
        }
      }
    }

    const payload: DailyRecommendation = {
      type: type as any,
      title: geminiResult.title,
      releaseYear: geminiResult.releaseYear,
      author: geminiResult.author || "",
      synopsis: geminiResult.synopsis || "",
      rationale: geminiResult.rationale || "",
      coverImage,
      score,
      isLogged: false,
      date: dateStr,
    };

    // Save to Firestore so it's cached for future loads
    await saveDailyRecommendation(session, key, payload);

    return NextResponse.json({ recommendation: payload });
  } catch (error) {
    return toErrorResponse(error, "GET /api/assistant/recommendations");
  }
}

// POST endpoint to update the isLogged status of a recommendation
export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);
    const body = await req.json();
    const { type, date, isLogged } = body;

    if (!type || !date) {
      throw new ApiError(400, "Missing type or date parameters.");
    }

    const key = `${type}_${date}`;
    const currentRecs = await getDailyRecommendations(session);

    if (!currentRecs[key]) {
      throw new ApiError(404, "Recommendation not found.");
    }

    currentRecs[key].isLogged = !!isLogged;
    await saveDailyRecommendation(session, key, currentRecs[key]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "POST /api/assistant/recommendations");
  }
}
