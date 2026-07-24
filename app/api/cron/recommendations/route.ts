import { NextRequest, NextResponse } from "next/server";
import { getCredentials, parseFirebaseConfig } from "@/lib/credentials";
import { refreshIdToken } from "@/lib/auth";
import { listWatchlist, saveDailyRecommendation, DailyRecommendation } from "@/lib/firebase";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = "force-dynamic";

// Calculate calendar date in IST (UTC+5:30)
function getCalendarIstDate() {
  const nowUtc = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(nowUtc.getTime() + istOffset);
  const yyyy = nowIst.getUTCFullYear();
  const mm = String(nowIst.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nowIst.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify cron authorization
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const refreshToken = process.env.CRON_REFRESH_TOKEN;
    if (!refreshToken) {
      return NextResponse.json({ error: "Missing CRON_REFRESH_TOKEN" }, { status: 500 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    // 2. Exchange refresh token for fresh session
    const creds = await getCredentials(req);
    const config = parseFirebaseConfig(creds);
    const { idToken, user } = await refreshIdToken(config, refreshToken);

    const session = {
      creds,
      config,
      uid: user.uid,
      idToken,
      user,
    };

    // 3. Fetch user's watchlist/books from Firestore
    const allItems = await listWatchlist(session);
    const existingTitles = allItems.map((item) => item.title.toLowerCase().trim());

    // 4. Set up calendar date string in IST
    const dateStr = getCalendarIstDate();

    // 5. Initialize Gemini
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    // 6. Generate for each type: movie, show, anime, book
    const types: ("movie" | "show" | "anime" | "book")[] = ["movie", "show", "anime", "book"];

    await Promise.all(
      types.map(async (type) => {
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

Return no other text or markdown blocks. Just the raw JSON object.
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

Return no other text or markdown blocks. Just the raw JSON object.
`;
        }

        const response = await model.generateContent(prompt);
        const replyText = response.response.text();
        const geminiResult = JSON.parse(replyText.trim());

        // 7. Enrichment (Quick, single-attempt lookup)
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
            console.error("[Cron Recs] OpenLibrary fetch failed:", e);
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
              console.error("[Cron Recs] OMDb fetch failed:", e);
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
              console.error("[Cron Recs] TVMaze fetch failed:", e);
            }
          }
        }

        const payload: DailyRecommendation = {
          type,
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

        const key = `${type}_${dateStr}`;
        await saveDailyRecommendation(session, key, payload);
      })
    );

    return NextResponse.json({ success: true, date: dateStr, uid: user.uid });
  } catch (error: any) {
    console.error("[Cron Recs Error]:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
