import { ApiError } from "./errors";
import type { ExpenseEntry, SyncEntry, SyncSource, WatchlistItem } from "./firebase";

const MEDIA_TYPES = ["movie", "show", "anime", "book"] as const;
const MEDIA_STATUSES = ["plan_to_watch", "watching", "completed", "dropped"] as const;

export const MAX_EXPENSE_BATCH = 100;
export const MAX_SYNC_ENTRIES = 5000;

function badRequest(message: string): never {
  throw new ApiError(400, message);
}

function asTrimmedString(value: unknown, field: string, maxLen: number, required: boolean): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) badRequest(`Field '${field}' is required.`);
    return undefined;
  }
  if (typeof value !== "string") badRequest(`Field '${field}' must be a string.`);
  const trimmed = (value as string).trim();
  if (required && !trimmed) badRequest(`Field '${field}' must not be empty.`);
  if (trimmed.length > maxLen) badRequest(`Field '${field}' must be at most ${maxLen} characters.`);
  return trimmed || undefined;
}

function asNumber(value: unknown, field: string, opts: { min?: number; max?: number; integer?: boolean }): number {
  const num = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof num !== "number" || !Number.isFinite(num)) badRequest(`Field '${field}' must be a number.`);
  const n = num as number;
  if (opts.integer && !Number.isInteger(n)) badRequest(`Field '${field}' must be an integer.`);
  if (opts.min !== undefined && n < opts.min) badRequest(`Field '${field}' must be >= ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max) badRequest(`Field '${field}' must be <= ${opts.max}.`);
  return n;
}

function asDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    badRequest(`Field '${field}' must be a date in YYYY-MM-DD format.`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (isNaN(parsed.getTime())) badRequest(`Field '${field}' is not a valid calendar date.`);
  return value as string;
}

function asEnum<T extends string>(value: unknown, field: string, allowed: readonly T[], required: boolean): T | undefined {
  if (value === undefined || value === null) {
    if (required) badRequest(`Field '${field}' is required. One of: ${allowed.join(", ")}.`);
    return undefined;
  }
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    badRequest(`Field '${field}' must be one of: ${allowed.join(", ")}.`);
  }
  return value as T;
}

function requireObject(body: unknown, what: string): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    badRequest(`${what} must be a JSON object.`);
  }
  return body as Record<string, unknown>;
}

/* ─── Expenses ─── */

export function validateExpenseEntry(body: unknown): ExpenseEntry {
  const b = requireObject(body, "Expense entry");
  return {
    title: asTrimmedString(b.title, "title", 200, true)!,
    amount: asNumber(b.amount, "amount", { min: -1_000_000_000, max: 1_000_000_000 }),
    category: asTrimmedString(b.category, "category", 100, false),
    date: asDate(b.date, "date"),
    notes: asTrimmedString(b.notes, "notes", 1000, false),
  };
}

export function validateExpensePatch(body: unknown): Partial<ExpenseEntry> {
  const b = requireObject(body, "Expense patch");
  const patch: Partial<ExpenseEntry> = {};
  if (b.title !== undefined) patch.title = asTrimmedString(b.title, "title", 200, true)!;
  if (b.amount !== undefined) patch.amount = asNumber(b.amount, "amount", { min: -1_000_000_000, max: 1_000_000_000 });
  if (b.category !== undefined) patch.category = asTrimmedString(b.category, "category", 100, false) ?? "";
  if (b.date !== undefined) patch.date = asDate(b.date, "date") ?? "";
  if (b.notes !== undefined) patch.notes = asTrimmedString(b.notes, "notes", 1000, false) ?? "";
  if (Object.keys(patch).length === 0) badRequest("Patch body must include at least one of: title, amount, category, date, notes.");
  return patch;
}

export function validateExpenseBatch(items: unknown[]): ExpenseEntry[] {
  if (items.length === 0) badRequest("Batch must contain at least one expense entry.");
  if (items.length > MAX_EXPENSE_BATCH) badRequest(`Batch must contain at most ${MAX_EXPENSE_BATCH} entries.`);
  return items.map((item, i) => {
    try {
      return validateExpenseEntry(item);
    } catch (error) {
      if (error instanceof ApiError) throw new ApiError(400, `Entry ${i + 1}: ${error.message}`);
      throw error;
    }
  });
}

/* ─── Watchlist ─── */

type NewWatchlistItem = Omit<WatchlistItem, "id" | "updatedAt">;

function optionalNullableNumber(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; integer?: boolean }
): number | null {
  if (value === undefined || value === null || value === "") return null;
  return asNumber(value, field, opts);
}

function validateCoverImage(value: unknown): string | null {
  const url = asTrimmedString(value, "coverImage", 500, false);
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) badRequest("Field 'coverImage' must be an http(s) URL.");
  return url;
}

export function validateNewWatchlistItem(body: unknown): NewWatchlistItem {
  const b = requireObject(body, "Watchlist item");
  return {
    title: asTrimmedString(b.title, "title", 300, true)!,
    type: asEnum(b.type, "type", MEDIA_TYPES, true)!,
    status: asEnum(b.status, "status", MEDIA_STATUSES, true)!,
    progress: b.progress !== undefined && b.progress !== null ? asNumber(b.progress, "progress", { min: 0, max: 100000, integer: true }) : 0,
    totalEpisodes: optionalNullableNumber(b.totalEpisodes, "totalEpisodes", { min: 0, max: 100000, integer: true }),
    rating: optionalNullableNumber(b.rating, "rating", { min: 0, max: 10 }),
    coverImage: validateCoverImage(b.coverImage),
    year: optionalNullableNumber(b.year, "year", { min: 1800, max: 2200, integer: true }),
    anilistId: optionalNullableNumber(b.anilistId, "anilistId", { min: 1, integer: true }),
    traktId: optionalNullableNumber(b.traktId, "traktId", { min: 1, integer: true }),
  };
}

// Whitelists patchable fields — arbitrary keys in the body are ignored rather
// than written to Firestore.
export function validateWatchlistPatch(body: unknown): Partial<NewWatchlistItem> {
  const b = requireObject(body, "Watchlist patch");
  const patch: Partial<NewWatchlistItem> = {};
  if (b.title !== undefined) patch.title = asTrimmedString(b.title, "title", 300, true)!;
  if (b.type !== undefined) patch.type = asEnum(b.type, "type", MEDIA_TYPES, true)!;
  if (b.status !== undefined) patch.status = asEnum(b.status, "status", MEDIA_STATUSES, true)!;
  if (b.progress !== undefined) patch.progress = asNumber(b.progress, "progress", { min: 0, max: 100000, integer: true });
  if (b.totalEpisodes !== undefined) patch.totalEpisodes = optionalNullableNumber(b.totalEpisodes, "totalEpisodes", { min: 0, max: 100000, integer: true });
  if (b.rating !== undefined) patch.rating = optionalNullableNumber(b.rating, "rating", { min: 0, max: 10 });
  if (b.coverImage !== undefined) patch.coverImage = validateCoverImage(b.coverImage);
  if (b.year !== undefined) patch.year = optionalNullableNumber(b.year, "year", { min: 1800, max: 2200, integer: true });
  if (Object.keys(patch).length === 0) {
    badRequest("Patch body must include at least one of: title, type, status, progress, totalEpisodes, rating, coverImage, year.");
  }
  return patch;
}

export function validateSyncPayload(body: unknown): { source: SyncSource; entries: SyncEntry[] } {
  const b = requireObject(body, "Sync payload");
  const source = asEnum(b.source, "source", ["anilist", "trakt"] as const, true)!;
  if (!Array.isArray(b.entries)) badRequest("Field 'entries' must be an array.");
  const rawEntries = b.entries as unknown[];
  if (rawEntries.length > MAX_SYNC_ENTRIES) badRequest(`Field 'entries' must contain at most ${MAX_SYNC_ENTRIES} items.`);

  const entries = rawEntries.map((raw, i) => {
    try {
      const item = validateNewWatchlistItem(raw);
      return {
        title: item.title,
        type: item.type,
        status: item.status,
        progress: item.progress,
        totalEpisodes: item.totalEpisodes,
        rating: item.rating,
        coverImage: item.coverImage,
        year: item.year,
        anilistId: item.anilistId ?? null,
        traktId: item.traktId ?? null,
      } as SyncEntry;
    } catch (error) {
      if (error instanceof ApiError) throw new ApiError(400, `Entry ${i + 1}: ${error.message}`);
      throw error;
    }
  });

  return { source, entries };
}
