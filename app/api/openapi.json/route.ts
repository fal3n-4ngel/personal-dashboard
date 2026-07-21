import { NextResponse } from "next/server";
import { AUTHOR, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// OpenAPI 3.1 spec consumed by ChatGPT Custom GPT Actions (imported from
// /api/openapi.json). Keep operationIds stable — GPT actions reference them.
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
        "API for a personal expense ledger and a movie/show/anime watchlist, backed by Firestore. " +
        "Every request must carry the user's Firebase ID token as a Bearer token; all data is scoped to that user. " +
        "Self-hosted deployments configure Firebase via the FIREBASE_CONFIG environment variable.",
      version: "2.0.0",
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
                        $ref: "#/components/schemas/ExpenseEntry"
                      }
                    }
                  }
                },
              },
            },
          },
          responses: writeResult("Expense(s) created"),
        },
      },
      "/api/expenses/{id}": {
        patch: {
          operationId: "updateExpense",
          summary: "Update an expense",
          description: "Update one or more fields of an existing expense. Only the provided fields change.",
          "x-openai-isConsequential": false,
          parameters: [idParam("expense")],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ExpenseEntryPatch" } } },
          },
          responses: writeResult("Expense updated"),
        },
        delete: {
          operationId: "deleteExpense",
          summary: "Delete an expense",
          description: "Permanently delete an expense record.",
          "x-openai-isConsequential": true,
          parameters: [idParam("expense")],
          responses: writeResult("Expense deleted"),
        },
      },
      "/api/expenses/categories": {
        get: {
          operationId: "listExpenseCategories",
          summary: "List expense categories",
          description: "Return the distinct category names used by the user's expenses. Prefer reusing one of these when logging.",
          "x-openai-isConsequential": false,
          responses: {
            "200": {
              description: "List of categories",
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Category" } } } },
            },
            "401": errorResponse("Missing or invalid authentication token"),
          },
        },
      },
      "/api/watchlist": {
        get: {
          operationId: "listWatchlistItems",
          summary: "List watchlist items",
          description: "Retrieve the user's movies, shows, and anime, most recently updated first.",
          "x-openai-isConsequential": false,
          responses: {
            "200": {
              description: "Array of watchlist items",
              content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/WatchlistItem" } } } },
            },
            "401": errorResponse("Missing or invalid authentication token"),
          },
        },
        post: {
          operationId: "addWatchlistItem",
          summary: "Add a watchlist item",
          description: "Add a movie, show, or anime to the watchlist. Check listWatchlistItems first to avoid duplicates.",
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
          description: "Permanently remove an item from the watchlist.",
          "x-openai-isConsequential": true,
          parameters: [idParam("watchlist item")],
          responses: writeResult("Watchlist item deleted"),
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
            "Firebase ID token of the signed-in user. In ChatGPT Actions choose Authentication → API Key → Bearer and paste the token. " +
            "Tokens expire after ~1 hour; copy a fresh one from the dashboard's GPT Integration page when requests start returning 401.",
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
        ExpenseBatch: {
          type: "object",
          required: ["items"],
          properties: {
            items: {
              type: "array",
              maxItems: 100,
              items: { $ref: "#/components/schemas/ExpenseEntry" },
              description: "Multiple expense entries to log in one call",
            },
          },
        },
        ExpenseEntryPatch: {
          type: "object",
          description: "Any subset of expense fields to change.",
          properties: {
            title: { type: "string", maxLength: 200 },
            amount: { type: "number" },
            category: { type: ["string", "null"], maxLength: 100 },
            date: { type: ["string", "null"], format: "date" },
            notes: { type: ["string", "null"], maxLength: 1000 },
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
        Category: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
          },
        },
        WatchlistItem: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique item id — use for updates/deletes" },
            title: { type: "string" },
            type: { type: "string", enum: ["movie", "show", "anime", "book"] },
            status: { type: "string", enum: ["plan_to_watch", "watching", "completed", "dropped"] },
            progress: { type: "integer", description: "Episodes watched (0 for movies)" },
            totalEpisodes: { type: ["integer", "null"] },
            rating: { type: ["number", "null"], description: "User rating out of 10" },
            coverImage: { type: ["string", "null"], description: "Cover image URL" },
            year: { type: ["integer", "null"], description: "Release year" },
            updatedAt: { type: "integer", description: "Last update time (Unix ms)" },
          },
        },
        NewWatchlistItem: {
          type: "object",
          required: ["title", "type", "status"],
          properties: {
            title: { type: "string", maxLength: 300, examples: ["Frieren: Beyond Journey's End"] },
            type: { type: "string", enum: ["movie", "show", "anime", "book"] },
            status: { type: "string", enum: ["plan_to_watch", "watching", "completed", "dropped"], description: "Use plan_to_watch unless told otherwise" },
            progress: { type: "integer", minimum: 0, default: 0, description: "Episodes already watched" },
            totalEpisodes: { type: ["integer", "null"], minimum: 0 },
            rating: { type: ["number", "null"], minimum: 0, maximum: 10 },
            coverImage: { type: ["string", "null"], description: "Cover image URL (http/https)" },
            year: { type: ["integer", "null"], minimum: 1800, maximum: 2200 },
          },
        },
        WatchlistItemPatch: {
          type: "object",
          description: "Any subset of watchlist fields to change.",
          properties: {
            title: { type: "string", maxLength: 300 },
            type: { type: "string", enum: ["movie", "show", "anime", "book"] },
            status: { type: "string", enum: ["plan_to_watch", "watching", "completed", "dropped"] },
            progress: { type: "integer", minimum: 0, description: "Episodes watched" },
            totalEpisodes: { type: ["integer", "null"], minimum: 0 },
            rating: { type: ["number", "null"], minimum: 0, maximum: 10 },
            coverImage: { type: ["string", "null"] },
            year: { type: ["integer", "null"], minimum: 1800, maximum: 2200 },
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
