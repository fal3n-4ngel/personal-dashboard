import { NextResponse } from "next/server";
import { AUTHOR, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// OpenAPI 3.1 spec consumed by ChatGPT Custom GPT Actions, Claude Projects, and
// AI Agent integrations (imported from /api/openapi.json). Keep operationIds stable.
export async function GET() {
  const errorResponse = (description: string) => ({
    description,
    content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
  });

  const writeResult = (description: string) => ({
    "200": {
      description,
      content: { "application/json": { schema: { $ref: "#/components/schemas/WriteResult" } } },
    },
    "400": errorResponse("Invalid input"),
    "401": errorResponse("Missing or invalid authentication token"),
    "404": errorResponse("Record not found"),
  });

  const idParam = (what: string) => ({
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string" },
    description: `Unique id of the ${what}, as returned by the list endpoint.`,
  });

  const spec = {
    openapi: "3.1.0",
    info: {
      title: "Personal Dashboard API",
      description:
        "API for a personal expense ledger, subscription tracker, investment portfolio, movie/show/anime/book watchlist, " +
        "and scratchpad notes, backed by Firestore. Every request must carry the user's Firebase ID token or Permanent API Key as a Bearer token; " +
        "all data is scoped to that user.",
      version: "2.2.0",
      contact: { name: AUTHOR.name, url: AUTHOR.url, email: AUTHOR.email },
    },
    servers: [
      {
        url: SITE_URL,
        description: "Production server",
      },
    ],
    security: [{ BearerAuth: [] }],
    paths: {
      "/api/expenses": {
        get: {
          operationId: "listExpenses",
          summary: "List expenses",
          description:
            "Retrieve the user's expense transactions, newest first. Supports free-text and date/category filtering.",
          "x-openai-isConsequential": false,
          parameters: [
            { name: "q", in: "query", schema: { type: "string" }, description: "Free-text filter on title and notes" },
            { name: "category", in: "query", schema: { type: "string" }, description: "Exact category name (case-insensitive)" },
            { name: "from", in: "query", schema: { type: "string", format: "date" }, description: "Only expenses on or after this date (YYYY-MM-DD)" },
            { name: "to", in: "query", schema: { type: "string", format: "date" }, description: "Only expenses on or before this date (YYYY-MM-DD)" },
          ],
          responses: {
            "200": {
              description: "Array of expense records",
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ExpenseRecord" } } } },
            },
            "401": errorResponse("Missing or invalid authentication token"),
          },
        },
        post: {
          operationId: "createExpense",
          summary: "Log one or more expenses",
          description:
            "Record a single expense, or several at once by sending { \"items\": [...] }. " +
            "Omitted dates default to today. Amounts are in the user's currency (INR).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Create a single expense by providing its properties directly, or pass an array of items to create multiple.",
                  properties: {
                    title: { type: "string", description: "Title of the expense (ignored if items is provided)" },
                    amount: { type: "number", description: "Expense amount (ignored if items is provided)" },
                    category: { type: "string", description: "Category name (ignored if items is provided)" },
                    date: { type: "string", format: "date", description: "YYYY-MM-DD date string (ignored if items is provided)" },
                    notes: { type: "string", description: "Additional notes (ignored if items is provided)" },
                    items: {
                      type: "array",
                      description: "Optional list of multiple expenses to create in batch",
                      items: {
                        $ref: "#/components/schemas/ExpenseEntry",
                      },
                    },
                  },
                },
              },
            },
          },
          responses: writeResult("Expense(s) logged"),
        },
      },
      "/api/expenses/{id}": {
        delete: {
          operationId: "deleteExpense",
          summary: "Delete an expense",
          description: "Archive / remove an expense transaction permanently.",
          "x-openai-isConsequential": true,
          parameters: [idParam("expense")],
          responses: writeResult("Expense deleted"),
        },
      },
      "/api/expenses/categories": {
        get: {
          operationId: "listExpenseCategories",
          summary: "List expense categories",
          description: "Retrieve all distinct category names used by the user in expense transactions.",
          "x-openai-isConsequential": false,
          responses: {
            "200": {
              description: "Array of category names",
              content: { "application/json": { schema: { type: "array", items: { type: "string" } } } },
            },
            "401": errorResponse("Missing or invalid authentication token"),
          },
        },
      },
      "/api/watchlist": {
        get: {
          operationId: "listWatchlistItems",
          summary: "List watchlist items",
          description:
            "Retrieve the user's movies, shows, anime, and books, most recently updated first. " +
            "Supports filtering by type or status, plus pagination (limit/offset) to prevent large payloads.",
          "x-openai-isConsequential": false,
          parameters: [
            { name: "q", in: "query", required: false, description: "Free-text search query to filter watchlist items by title (partial matching)", schema: { type: "string" } },
            { name: "type", in: "query", required: false, description: "Filter by media type: 'movie', 'show', 'anime', or 'book'", schema: { type: "string", enum: ["movie", "show", "anime", "book"] } },
            { name: "status", in: "query", required: false, description: "Filter by status: 'watching', 'paused', 'plan_to_watch', 'completed', or 'dropped'", schema: { type: "string", enum: ["watching", "paused", "plan_to_watch", "completed", "dropped"] } },
            { name: "limit", in: "query", required: false, description: "Maximum number of items to return (default 50)", schema: { type: "integer", default: 50 } },
            { name: "offset", in: "query", required: false, description: "Offset index for pagination", schema: { type: "integer", default: 0 } },
          ],
          responses: {
            "200": {
              description: "Array of watchlist items (or paginated object if limit/offset requested)",
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/WatchlistItem" } } } },
            },
            "401": errorResponse("Missing or invalid authentication token"),
          },
        },
        post: {
          operationId: "addWatchlistItem",
          summary: "Add a watchlist item",
          description:
            "Add a movie, show, anime, or book to the watchlist. Check listWatchlistItems first to avoid duplicates. " +
            "Use the real official title (not the user's shorthand), and always populate 'year' — infer it from your own knowledge if not stated; it disambiguates remakes and sequels.",
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/NewWatchlistItem" } } },
          },
          responses: writeResult("Watchlist item created"),
        },
      },
      "/api/watchlist/{id}": {
        patch: {
          operationId: "updateWatchlistItem",
          summary: "Update a watchlist item",
          description: "Update status, episode progress, rating, or other fields of a watchlist item. Only the provided fields change.",
          "x-openai-isConsequential": false,
          parameters: [idParam("watchlist item")],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/WatchlistItemPatch" } } },
          },
          responses: writeResult("Watchlist item updated"),
        },
        delete: {
          operationId: "deleteWatchlistItem",
          summary: "Delete a watchlist item",
          description: "Remove an item from the watchlist.",
          "x-openai-isConsequential": true,
          parameters: [idParam("watchlist item")],
          responses: writeResult("Watchlist item deleted"),
        },
      },
      "/api/watchlist/sync": {
        post: {
          operationId: "syncWatchlist",
          summary: "Bulk sync watchlist entries",
          description:
            "Sync external entries (AniList, Trakt, Letterboxd CSV, or custom LLM batches) into the watchlist with automatic deduplication. " +
            "Include 'year' on every entry when it's determinable — it's what the dedup logic and the UI use to tell apart same-titled remakes/reboots.",
          "x-openai-isConsequential": true,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    source: { type: "string", description: "Optional sync source name (e.g. letterboxd, anilist, trakt, gpt)" },
                    items: {
                      type: "array",
                      items: { $ref: "#/components/schemas/NewWatchlistItem" },
                      description: "List of watchlist items (can use 'items' or 'entries')",
                    },
                    entries: {
                      type: "array",
                      items: { $ref: "#/components/schemas/NewWatchlistItem" },
                      description: "List of watchlist items (alias for 'items')",
                    },
                  },
                },
              },
            },
          },
          responses: writeResult("Watchlist entries synced"),
        },
      },
      "/api/subscriptions": {
        get: {
          operationId: "listSubscriptions",
          summary: "List subscriptions",
          description: "Retrieve the user's recurring subscriptions, newest first.",
          "x-openai-isConsequential": false,
          responses: {
            "200": {
              description: "Array of subscriptions",
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/SubscriptionRecord" } } } },
            },
            "401": errorResponse("Missing or invalid authentication token"),
          },
        },
        post: {
          operationId: "createSubscription",
          summary: "Add a subscription",
          description: "Track a new recurring monthly or yearly subscription cost.",
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/SubscriptionEntry" } } },
          },
          responses: writeResult("Subscription created"),
        },
      },
      "/api/subscriptions/{id}": {
        patch: {
          operationId: "updateSubscription",
          summary: "Update a subscription",
          description: "Update one or more fields of an existing subscription (e.g. cost, nextBillingDate, billingCycle). Only provided fields change.",
          "x-openai-isConsequential": false,
          parameters: [idParam("subscription")],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/SubscriptionPatch" } } },
          },
          responses: writeResult("Subscription updated"),
        },
        delete: {
          operationId: "deleteSubscription",
          summary: "Delete a subscription",
          description: "Stop tracking a subscription.",
          "x-openai-isConsequential": true,
          parameters: [idParam("subscription")],
          responses: writeResult("Subscription deleted"),
        },
      },
      "/api/portfolio": {
        get: {
          operationId: "getPortfolio",
          summary: "Get the investment portfolio",
          description: "Retrieve every asset (equities, crypto, mutual funds, gold, cash, ...) in the user's investment portfolio.",
          "x-openai-isConsequential": false,
          responses: {
            "200": {
              description: "The portfolio",
              content: { "application/json": { schema: { $ref: "#/components/schemas/PortfolioRecord" } } },
            },
            "401": errorResponse("Missing or invalid authentication token"),
          },
        },
        post: {
          operationId: "replacePortfolioAssets",
          summary: "Replace the portfolio's assets",
          description:
            "Replace the entire assets list with the array provided — this is a full replace, not a per-asset patch.",
          "x-openai-isConsequential": true,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/PortfolioUpdate" } } },
          },
          responses: writeResult("Portfolio updated"),
        },
      },
      "/api/portfolio/prices": {
        post: {
          operationId: "refreshPortfolioPrices",
          summary: "Refresh portfolio market prices",
          description: "Fetch live market prices from Binance (crypto) and Yahoo Finance (stocks/mutual funds) to update asset valuations.",
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    assets: { type: "array", items: { $ref: "#/components/schemas/InvestmentAsset" } },
                    forceRefresh: { type: "boolean", description: "Bypass 5-minute cache" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Updated assets with live prices and conversion rates",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      assets: { type: "array", items: { $ref: "#/components/schemas/InvestmentAsset" } },
                      usdToInr: { type: "number" },
                      cooldownActive: { type: "boolean" },
                    },
                  },
                },
              },
            },
            "401": errorResponse("Missing or invalid authentication token"),
          },
        },
      },
      "/api/portfolio/search": {
        get: {
          operationId: "searchPortfolioSymbols",
          summary: "Search stock & crypto symbols",
          description: "Autocomplete stock tickers, mutual funds, or crypto pairs via Yahoo Finance.",
          "x-openai-isConsequential": false,
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string" }, description: "Search query string (e.g. AAPL, BTC, RELIANCE)" },
          ],
          responses: {
            "200": {
              description: "List of matching symbols",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      quotes: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            symbol: { type: "string" },
                            name: { type: "string" },
                            exchange: { type: "string" },
                            type: { type: "string" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": errorResponse("Missing or invalid authentication token"),
          },
        },
      },
      "/api/notes": {
        get: {
          operationId: "getNote",
          summary: "Get the scratchpad note",
          description: "Retrieve the user's single auto-saving scratchpad note.",
          "x-openai-isConsequential": false,
          responses: {
            "200": {
              description: "The note",
              content: { "application/json": { schema: { $ref: "#/components/schemas/NoteRecord" } } },
            },
            "401": errorResponse("Missing or invalid authentication token"),
          },
        },
        post: {
          operationId: "updateNote",
          summary: "Replace the scratchpad note",
          description: "Overwrite the entire contents of the user's scratchpad note.",
          "x-openai-isConsequential": false,
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/NoteContent" } } },
          },
          responses: writeResult("Note saved"),
        },
      },
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Bearer token supporting both Firebase ID tokens and Permanent API Keys. " +
            "In ChatGPT Actions or your custom developer AI Agent platform, choose Authentication → API Key → Bearer and paste your token or Permanent API Key.",
        },
      },
      schemas: {
        ExpenseEntry: {
          type: "object",
          required: ["title", "amount"],
          properties: {
            title: { type: "string", maxLength: 200, description: "Short description of the transaction", examples: ["Uber Ride"] },
            amount: { type: "number", description: "Amount spent (INR)", examples: [350.5] },
            category: { type: "string", maxLength: 100, description: "Category name, e.g. Transport, Food, Rent", examples: ["Transport"] },
            date: { type: "string", format: "date", description: "Transaction date (YYYY-MM-DD). Defaults to today.", examples: ["2026-07-20"] },
            notes: { type: "string", maxLength: 1000, description: "Optional free-form notes", examples: ["Ride back from airport"] },
          },
        },
        ExpenseRecord: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique expense id — use for updates/deletes" },
            title: { type: "string" },
            amount: { type: ["number", "null"] },
            category: { type: ["string", "null"] },
            date: { type: ["string", "null"], format: "date" },
            notes: { type: ["string", "null"] },
            createdAt: { type: "integer", description: "Creation time (Unix ms)" },
          },
        },
        WatchlistItem: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique item id — use for updates/deletes" },
            title: { type: "string" },
            type: { type: "string", enum: ["movie", "show", "anime", "book"] },
            status: { type: "string", enum: ["plan_to_watch", "watching", "paused", "completed", "dropped"] },
            progress: { type: "integer", description: "Episodes watched (0 for movies)" },
            totalEpisodes: { type: ["integer", "null"] },
            rating: { type: ["number", "null"], description: "User rating out of 10" },
            coverImage: { type: ["string", "null"], description: "Cover image URL" },
            year: { type: ["integer", "null"], description: "Release year" },
            updatedAt: { type: "integer", description: "Last update time (Unix ms)" },
            createdAt: { type: "integer", description: "When this item was added to the watchlist (Unix ms)" },
          },
        },
        NewWatchlistItem: {
          type: "object",
          required: ["title", "type", "status"],
          properties: {
            title: {
              type: "string",
              maxLength: 300,
              description:
                "The actual, official title — not the user's shorthand, nickname, or a paraphrase. Resolve casual references (e.g. \"dune 2\", \"got\") to their real title (\"Dune: Part Two\", \"Game of Thrones\") before sending.",
              examples: ["Frieren: Beyond Journey's End"],
            },
            type: { type: "string", enum: ["movie", "show", "anime", "book"] },
            status: { type: "string", enum: ["plan_to_watch", "watching", "paused", "completed", "dropped"], description: "Use plan_to_watch unless told otherwise" },
            progress: { type: "integer", minimum: 0, default: 0, description: "Episodes already watched" },
            totalEpisodes: { type: ["integer", "null"], minimum: 0 },
            rating: { type: ["number", "null"], minimum: 0, maximum: 10 },
            coverImage: { type: ["string", "null"], description: "Cover image URL (http/https)" },
            year: {
              type: ["integer", "null"],
              minimum: 1800,
              maximum: 2200,
              description:
                "Release year (publish year for books). Strongly recommended on every create — infer it from your own knowledge of the title if the user didn't say it. Disambiguates remakes/reboots/sequels sharing a title.",
              examples: [2024],
            },
          },
        },
        WatchlistItemPatch: {
          type: "object",
          description: "Any subset of watchlist fields to change.",
          properties: {
            title: { type: "string", maxLength: 300 },
            type: { type: "string", enum: ["movie", "show", "anime", "book"] },
            status: { type: "string", enum: ["plan_to_watch", "watching", "paused", "completed", "dropped"] },
            progress: { type: "integer", minimum: 0, description: "Episodes watched" },
            totalEpisodes: { type: ["integer", "null"], minimum: 0 },
            rating: { type: ["number", "null"], minimum: 0, maximum: 10 },
            coverImage: { type: ["string", "null"] },
            year: { type: ["integer", "null"], minimum: 1800, maximum: 2200, description: "Release/publish year. Fix this if the stored value is missing or wrong." },
          },
        },
        SubscriptionEntry: {
          type: "object",
          required: ["name", "cost", "billingCycle", "nextBillingDate"],
          properties: {
            name: { type: "string", maxLength: 200, examples: ["Netflix"] },
            cost: { type: "number", minimum: 0, description: "Cost per billing cycle (INR)", examples: [649] },
            billingCycle: { type: "string", enum: ["monthly", "yearly"] },
            nextBillingDate: { type: "string", format: "date", description: "Next charge date (YYYY-MM-DD)", examples: ["2026-08-15"] },
            icon: { type: ["string", "null"], maxLength: 10, description: "Optional short emoji/code to represent the service" },
          },
        },
        SubscriptionPatch: {
          type: "object",
          description: "Any subset of subscription fields to change.",
          properties: {
            name: { type: "string", maxLength: 200 },
            cost: { type: "number", minimum: 0 },
            billingCycle: { type: "string", enum: ["monthly", "yearly"] },
            nextBillingDate: { type: "string", format: "date" },
            icon: { type: ["string", "null"], maxLength: 10 },
          },
        },
        SubscriptionRecord: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique subscription id — use for updates/deletes" },
            name: { type: "string" },
            cost: { type: "number" },
            billingCycle: { type: "string", enum: ["monthly", "yearly"] },
            nextBillingDate: { type: "string", format: "date" },
            icon: { type: ["string", "null"] },
            createdAt: { type: "integer", description: "Creation time (Unix ms)" },
          },
        },
        InvestmentAsset: {
          type: "object",
          required: ["name", "category", "amount", "investedAmount"],
          properties: {
            id: { type: "string", description: "Unique asset id. Omit when adding a brand-new asset — the server generates one." },
            name: { type: "string", maxLength: 200, examples: ["Nifty 50 Index Fund"] },
            category: { type: "string", enum: ["equity", "crypto", "mutual_fund", "sip", "gold", "cash", "other"] },
            amount: { type: "number", minimum: 0, description: "Current value of the holding (INR)" },
            investedAmount: { type: "number", minimum: 0, description: "Total amount originally invested (INR)" },
            quantity: { type: "number", minimum: 0, description: "Units/shares/coins held" },
            buyPrice: { type: "number", minimum: 0, description: "Average purchase price per unit" },
            currentPrice: { type: "number", minimum: 0, description: "Latest known price per unit" },
            notes: { type: "string", maxLength: 1000 },
            createdAt: { type: "integer", description: "Creation time (Unix ms)" },
          },
        },
        PortfolioRecord: {
          type: "object",
          properties: {
            assets: { type: "array", items: { $ref: "#/components/schemas/InvestmentAsset" } },
            updatedAt: { type: "integer", description: "Last update time (Unix ms)" },
          },
        },
        PortfolioUpdate: {
          type: "object",
          required: ["assets"],
          properties: {
            assets: {
              type: "array",
              maxItems: 500,
              items: { $ref: "#/components/schemas/InvestmentAsset" },
              description: "The complete list of assets — this replaces the whole portfolio, so include every asset that should still exist.",
            },
          },
        },
        NoteRecord: {
          type: "object",
          properties: {
            content: { type: "string", description: "Markdown/plain-text note content" },
            updatedAt: { type: "integer", description: "Last update time (Unix ms)" },
          },
        },
        NoteContent: {
          type: "object",
          properties: {
            content: { type: "string", maxLength: 50000 },
          },
        },
        WriteResult: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            id: { type: "string", description: "Id of the affected record" },
            added: { type: "integer", description: "Batch creates only: number of entries written" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", examples: ["Unauthorized"] },
            message: { type: "string", examples: ["Invalid or expired authentication token."] },
          },
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
