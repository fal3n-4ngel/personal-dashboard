import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { ApiError } from "@/lib/errors";
import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
import {
  listExpenses,
  createExpense,
  archiveExpense,
  listWatchlist,
  addWatchlistItem,
  updateWatchlistItem,
  listSubscriptions,
  getPortfolio,
  getNote,
  updateNote
} from "@/lib/firebase";

export const dynamic = "force-dynamic";

const SYSTEM_INSTRUCTION = `You are a strict, focused, domain-specific AI Assistant for the PHub Dashboard app.
Your only purpose is to help users manage their personal dashboard data.

You can help with:
1. Expenses (logging new expenses, listing transactions, checking monthly summaries).
2. Watchlist (adding movies/shows/anime/books, updating episode progress, completed ratings, listing watchlist).
3. Subscriptions (listing monthly/yearly costs).
4. Portfolio (checking net asset value, list of investment assets).
5. Scratchpad Notes (getting or updating notes).

CRITICAL GUARDRAIL:
- You are allowed (and expected) to analyze the user's data to answer analysis/recommendation questions directly related to their dashboard (e.g. recommending movies/shows based on their watchlist history, analyzing expense patterns, suggesting budget adjustments, summarizing their notes).
- If the user asks completely off-topic questions (e.g. general science, history, coding/programming, writing essays, math puzzles, general internet search, general-purpose chat/assistance), you MUST refuse to answer.
- When refusing off-topic queries, reply exactly with: "I can only assist you with managing your expenses, watchlist, subscriptions, portfolio, or scratchpad notes on this dashboard."
- Never break this rule.`;

const functionDeclarations: FunctionDeclaration[] = [
  {
    name: "listExpenses",
    description: "Retrieve list of expenses. Supports query search, category filtering, and date range checks.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        q: { type: SchemaType.STRING, description: "Free text search query" },
        category: { type: SchemaType.STRING, description: "Exact category filter" },
        from: { type: SchemaType.STRING, description: "Start date (YYYY-MM-DD)" },
        to: { type: SchemaType.STRING, description: "End date (YYYY-MM-DD)" }
      }
    }
  },
  {
    name: "createExpense",
    description: "Record a new expense transaction. Date defaults to today if omitted.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Short description of expense" },
        amount: { type: SchemaType.NUMBER, description: "Spent amount in INR" },
        category: { type: SchemaType.STRING, description: "Category, e.g. Food, Transport, Rent" },
        date: { type: SchemaType.STRING, description: "YYYY-MM-DD format" },
        notes: { type: SchemaType.STRING, description: "Additional details" }
      },
      required: ["title", "amount"]
    }
  },
  {
    name: "deleteExpense",
    description: "Remove an expense transaction by its ID.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Unique expense record ID" }
      },
      required: ["id"]
    }
  },
  {
    name: "listWatchlistItems",
    description: "Retrieve all movies, TV shows, anime, and books in the user's library.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "addWatchlistItem",
    description: "Add a media item (movie, show, anime, or book) to the watchlist.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING, description: "Title of the media" },
        type: { type: SchemaType.STRING, description: "Type of media (movie, show, anime, book)" },
        status: { type: SchemaType.STRING, description: "Status (plan_to_watch, watching, completed, dropped). Default is 'plan_to_watch'" },
        progress: { type: SchemaType.INTEGER, description: "Current episode or page progress" },
        totalEpisodes: { type: SchemaType.INTEGER, description: "Total episodes/pages if known" },
        rating: { type: SchemaType.NUMBER, description: "User rating out of 10" }
      },
      required: ["title", "type", "status"]
    }
  },
  {
    name: "updateWatchlistItem",
    description: "Update fields of an item in the watchlist.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        id: { type: SchemaType.STRING, description: "Item ID" },
        status: { type: SchemaType.STRING, description: "Status (plan_to_watch, watching, completed, dropped)" },
        progress: { type: SchemaType.INTEGER },
        rating: { type: SchemaType.NUMBER, description: "Rating out of 10" }
      },
      required: ["id"]
    }
  },
  {
    name: "listSubscriptions",
    description: "Retrieve all recurring subscription records.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "getPortfolio",
    description: "Retrieve all assets in the user's investment portfolio.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "getNote",
    description: "Fetch the contents of the auto-saving scratchpad note.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "updateNote",
    description: "Overwrite the entire content of the scratchpad note.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: { type: SchemaType.STRING, description: "New markdown/text note content" }
      },
      required: ["content"]
    }
  }
];

async function executeTool(session: any, name: string, args: any) {
  try {
    switch (name) {
      case "listExpenses":
        return await listExpenses(session, args);
      case "createExpense":
        return await createExpense(session, args);
      case "deleteExpense":
        return await archiveExpense(session, args.id);
      case "listWatchlistItems":
        return await listWatchlist(session);
      case "addWatchlistItem":
        return await addWatchlistItem(session, args);
      case "updateWatchlistItem":
        return await updateWatchlistItem(session, args.id, args);
      case "listSubscriptions":
        return await listSubscriptions(session);
      case "getPortfolio":
        return await getPortfolio(session);
      case "getNote":
        const note = await getNote(session);
        return note || { content: "" };
      case "updateNote":
        return await updateNote(session, args.content);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err: any) {
    return { error: err.message || "Failed to execute database action" };
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser(req);

    if (!redis) {
      return NextResponse.json({ error: "Rate limit cache offline." }, { status: 500 });
    }
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json({ error: "Server GEMINI_API_KEY is not configured." }, { status: 500 });
    }

    const uid = session.uid;
    const globalKey = "rate:gemini:global:minute";
    const userKey = `rate:gemini:user:${uid}:minute`;

    // Global Cap: 15 req/min
    const globalCount = await redis.incr(globalKey);
    if (globalCount === 1) await redis.expire(globalKey, 60);
    if (globalCount > 15) {
      return NextResponse.json(
        { error: "The assistant is busy right now. Please try again in a few seconds." },
        { status: 429 }
      );
    }

    // User Cap: 5 req/min
    const userCount = await redis.incr(userKey);
    if (userCount === 1) await redis.expire(userKey, 60);
    if (userCount > 5) {
      return NextResponse.json(
        { error: "You are sending messages too quickly. Please wait a minute." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing message query." }, { status: 400 });
    }

    // 1. Initialize Google Gen AI client with the gemini-2.5-flash model
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: [{ functionDeclarations }]
    });

    // 2. Format history for Google Gen AI SDK
    // SDK expects format: [{ role: "user" | "model", parts: [{ text: "..." } | { functionCall: ... } | { functionResponse: ... }] }]
    const sdkHistory = history.map((h: any) => ({
      role: h.role,
      parts: h.parts
    }));

    const chat = model.startChat({
      history: sdkHistory
    });

    // 3. Send prompt
    let response = await chat.sendMessage(message);
    let attempts = 0;

    // 4. Handle tool calls loop
    while (attempts < 5) {
      const functionCalls = response.response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        const rawResult = await executeTool(session, call.name, call.args);
        const toolResult = (rawResult && typeof rawResult === "object" && !Array.isArray(rawResult)) ? rawResult : { result: rawResult };

        // Send function execution feedback to chat
        response = await chat.sendMessage([{
          functionResponse: {
            name: call.name,
            response: toolResult
          }
        }]);

        attempts++;
      } else {
        // Retrieve updated history from chat
        const updatedHistory = await chat.getHistory();
        
        // Return text answer and dialogue logs
        return NextResponse.json({
          reply: response.response.text(),
          history: updatedHistory
        });
      }
    }

    throw new Error("Too many tool call iterations.");
  } catch (error: any) {
    console.error("Assistant Chat Error:", error);
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: error.message || "Failed to process chat query" }, { status: 500 });
  }
}
