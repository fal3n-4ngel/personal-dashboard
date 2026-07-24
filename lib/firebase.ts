import { randomUUID } from "crypto";
import { Session } from "./auth";
import { ApiError } from "./errors";
import { cacheGet, cacheSet, cacheInvalidate } from "./cache";
import { encrypt, decrypt } from "./encryption";

export interface ExpenseEntry {
  title: string;
  amount: number;
  category?: string;
  date?: string; // YYYY-MM-DD
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  amount: number | null;
  category: string | null;
  date: string | null;
  notes: string | null;
  createdAt: number;
}

export interface WatchlistItem {
  id?: string;
  title: string;
  type: "movie" | "show" | "anime" | "book";
  status: "plan_to_watch" | "watching" | "completed" | "dropped" | "paused";
  progress: number;
  totalEpisodes: number | null;
  rating: number | null;
  coverImage: string | null;
  year: number | null;
  updatedAt: number;
  createdAt: number;
  anilistId?: number | null;
  traktId?: number | null;
}

export interface SyncEntry {
  title: string;
  type: WatchlistItem["type"];
  status: WatchlistItem["status"];
  progress: number;
  totalEpisodes: number | null;
  rating: number | null;
  coverImage: string | null;
  year: number | null;
  anilistId?: number | null;
  traktId?: number | null;
}

export type SyncSource = "anilist" | "trakt" | "letterboxd" | "manual" | string;

/* ─── Firestore REST transport ───
 * All reads/writes go through the Firestore REST API authenticated with the
 * caller's own Firebase ID token (never an unauthenticated SDK instance), so
 * the per-user Firestore security rules are enforced by the database itself —
 * the API server holds no privileged credentials that could bypass them. */

const FIRESTORE_HOST = "https://firestore.googleapis.com/v1";

// Document ids appear in REST paths and backtick-quoted field masks; restrict
// them so neither can be broken out of. Covers Firestore auto-ids and UUIDs.
const DOC_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

export function assertDocId(id: string, what: string): string {
  if (!DOC_ID_RE.test(id)) throw new ApiError(400, `Invalid ${what} id.`);
  return id;
}

function docsRoot(session: Session): string {
  return `${FIRESTORE_HOST}/projects/${session.config.projectId}/databases/(default)/documents`;
}

function docName(session: Session, ...segments: string[]): string {
  return `projects/${session.config.projectId}/databases/(default)/documents/${segments.join("/")}`;
}

async function fsFetch<T = unknown>(session: Session, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.idToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (res.ok) {
    return res.json();
  }

  if (res.status === 404) throw new ApiError(404, "Record not found.");
  if (res.status === 403) throw new ApiError(403, "Permission denied by database security rules.");
  if (res.status === 401) throw new ApiError(401, "Database rejected the authentication token.");

  const detail = await res.text().catch(() => "");
  console.error(`Firestore request failed (${res.status}):`, detail.slice(0, 500));
  throw new ApiError(502, "Database request failed.");
}

/* ─── Firestore value encoding ─── */

// Mirrors the Firestore REST API's discriminated "Value" wire format.
type FirestoreValue =
  | { nullValue: null }
  | { stringValue: string }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { timestampValue: string };

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
}

interface RunQueryRow {
  document?: FirestoreDocument;
}

function toValue(v: unknown): FirestoreValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === "object") return { mapValue: { fields: toFields(v as Record<string, unknown>) } };
  throw new ApiError(400, "Unsupported value type in payload.");
}

function toFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) fields[key] = toValue(value);
  }
  return fields;
}

function fromValue(v: FirestoreValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return fromFields(v.mapValue?.fields || {});
  if ("arrayValue" in v) return (v.arrayValue?.values || []).map(fromValue);
  if ("timestampValue" in v) return v.timestampValue;
  return null;
}

function fromFields(fields: Record<string, FirestoreValue> | undefined): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields || {})) {
    obj[key] = fromValue(value);
  }
  return obj;
}

function idFromName(name: string): string {
  return name.split("/").pop() || name;
}

// Runs a single-collection equality query scoped to the user. The userId
// filter also satisfies the security-rule ownership check for list queries.
async function runOwnedQuery(session: Session, collectionId: string): Promise<{ id: string; data: Record<string, unknown> }[]> {
  const body = {
    structuredQuery: {
      from: [{ collectionId }],
      where: {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: session.uid },
        },
      },
    },
  };

  const rows = await fsFetch<RunQueryRow[]>(session, `${docsRoot(session)}:runQuery`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  return (rows || [])
    .filter((row): row is Required<RunQueryRow> => !!row.document)
    .map((row) => ({ id: idFromName(row.document.name), data: fromFields(row.document.fields) }));
}

/* ─── Expenses ─── */

const EXPENSE_CACHE_TTL = 30_000;
const WATCHLIST_CACHE_TTL = 30_000;
const BATCH_CONCURRENCY = 3;

// Cache keys include the project id: uids are only unique within a Firebase
// project, and callers may bring their own project via X-Firebase-Config —
// without the project scope, a foreign project's uid could collide with (and
// poison or leak) another user's cached data.
function expenseCacheKey(session: Session): string {
  return `expenses:${session.config.projectId}:${session.uid}`;
}

function watchlistCacheKey(session: Session): string {
  return `watchlist:${session.config.projectId}:${session.uid}`;
}

// Shared by listExpenses and getCategories so a categories lookup doesn't
// re-scan the whole collection on top of the list fetch that just happened.
async function getRawExpenses(session: Session): Promise<ExpenseRecord[]> {
  const cacheKey = expenseCacheKey(session);
  const cached = await cacheGet<ExpenseRecord[]>(cacheKey);
  if (cached) return cached;

  const rows = await runOwnedQuery(session, "expenses");
  const records: ExpenseRecord[] = rows.map(({ id, data }) => {
    const title = decrypt(data.title as string || "");
    const category = decrypt(data.category as string || "");
    const notes = decrypt(data.notes as string || "");
    const amountStr = typeof data.amount === "string" ? decrypt(data.amount) : String(data.amount ?? "");
    const amountParsed = amountStr ? parseFloat(amountStr) : null;
    
    return {
      id,
      title: title || "Untitled",
      amount: (amountParsed === null || isNaN(amountParsed)) ? null : amountParsed,
      category: category || null,
      date: (data.date as string) || null,
      notes: notes || null,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    };
  });

  await cacheSet(cacheKey, records, EXPENSE_CACHE_TTL);
  return records;
}

export async function listExpenses(
  session: Session,
  filters?: { q?: string; category?: string; from?: string; to?: string }
): Promise<ExpenseRecord[]> {
  // Copy so in-place sort() below never mutates the cached array.
  let records = [...(await getRawExpenses(session))];

  if (filters?.q) {
    const qLower = filters.q.toLowerCase();
    records = records.filter(
      (r) =>
        r.title.toLowerCase().includes(qLower) ||
        (r.notes && r.notes.toLowerCase().includes(qLower))
    );
  }

  if (filters?.category) {
    const catLower = filters.category.toLowerCase();
    records = records.filter((r) => r.category && r.category.toLowerCase() === catLower);
  }

  if (filters?.from) {
    records = records.filter((r) => r.date && r.date >= filters.from!);
  }

  if (filters?.to) {
    records = records.filter((r) => r.date && r.date <= filters.to!);
  }

  // Sort by date descending, then by createdAt descending
  records.sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA);
    }
    return b.createdAt - a.createdAt;
  });

  return records;
}

export async function getCategories(session: Session): Promise<{ id: string; name: string }[]> {
  const records = await getRawExpenses(session);
  const uniqueCategories = new Set<string>();

  records.forEach((r) => {
    if (r.category && r.category.trim()) {
      uniqueCategories.add(r.category.trim());
    }
  });

  return Array.from(uniqueCategories).map((name) => ({ id: name, name }));
}

export async function createExpense(session: Session, entry: ExpenseEntry) {
  const docData = {
    userId: session.uid, // Partition by User UID; rules require it to match the token
    title: encrypt(entry.title),
    amount: encrypt(String(entry.amount)),
    category: entry.category ? encrypt(entry.category) : null,
    date: entry.date || new Date().toISOString().slice(0, 10),
    notes: entry.notes ? encrypt(entry.notes) : null,
    createdAt: Date.now(),
  };

  const created = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/expenses`, {
    method: "POST",
    body: JSON.stringify({ fields: toFields(docData) }),
  });

  await cacheInvalidate(expenseCacheKey(session));
  return { id: idFromName(created.name) };
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i]!) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  });

  await Promise.all(workers);
  return results;
}

export async function createExpenseBatch(session: Session, entries: ExpenseEntry[]) {
  const results = await mapWithConcurrency(entries, BATCH_CONCURRENCY, (entry) => createExpense(session, entry));
  return results.map((r, i) => {
    const entry = entries[i]!;
    if (r.status === "fulfilled") {
      return { success: true, title: entry.title, ...r.value };
    } else {
      return { success: false, title: entry.title, error: (r.reason as Error)?.message || "Unknown error" };
    }
  });
}

export async function updateExpense(session: Session, id: string, entry: Partial<ExpenseEntry>) {
  assertDocId(id, "expense");

  const updateData: Record<string, unknown> = {};
  if (entry.title !== undefined) updateData.title = encrypt(entry.title);
  if (entry.amount !== undefined) updateData.amount = entry.amount !== null ? encrypt(String(entry.amount)) : null;
  if (entry.category !== undefined) updateData.category = entry.category ? encrypt(entry.category) : null;
  if (entry.date !== undefined) updateData.date = entry.date || null;
  if (entry.notes !== undefined) updateData.notes = entry.notes ? encrypt(entry.notes) : null;

  const params = new URLSearchParams();
  // The mask never includes userId, so ownership can't be reassigned; the
  // exists precondition turns a patch of a missing doc into a 404 instead of
  // an implicit create.
  for (const field of Object.keys(updateData)) params.append("updateMask.fieldPaths", field);
  params.append("currentDocument.exists", "true");

  await fsFetch(session, `${docsRoot(session)}/expenses/${id}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(updateData) }),
  });

  await cacheInvalidate(expenseCacheKey(session));
  return { id };
}

export async function archiveExpense(session: Session, id: string) {
  assertDocId(id, "expense");

  await fsFetch(session, `${docsRoot(session)}/expenses/${id}?currentDocument.exists=true`, {
    method: "DELETE",
  });

  await cacheInvalidate(expenseCacheKey(session));
  return { id };
}

/* ─── Watchlist ───
 * One doc per user (watchlists/{userId}), items keyed by id in a nested map
 * field — a personal watchlist is naturally bounded (low thousands of titles),
 * so it fits Firestore's 1MiB document cap comfortably. Writes go through
 * documents:commit with a field mask per changed item, so ANY number of
 * adds/updates in one call still costs exactly 1 Firestore write. */

// Commits a masked merge into the user's watchlist doc. `patches` maps item id
// to either its changed fields or null (= delete the item). `wholeItemIds`
// marks brand-new items whose entire map should be replaced; other items are
// masked per-field so partial patches don't wipe sibling fields.
async function writeWatchlistItems(
  session: Session,
  patches: Record<string, Record<string, unknown> | null>,
  wholeItemIds?: Set<string>
): Promise<void> {
  const fieldPaths: string[] = [];
  const items: Record<string, unknown> = {};

  for (const [id, patch] of Object.entries(patches)) {
    assertDocId(id, "watchlist item");
    if (patch === null) {
      fieldPaths.push(`items.\`${id}\``); // masked but absent from fields → deleted
    } else if (wholeItemIds?.has(id)) {
      fieldPaths.push(`items.\`${id}\``);
      items[id] = patch;
    } else {
      for (const key of Object.keys(patch)) {
        if (patch[key] === undefined) continue;
        fieldPaths.push(`items.\`${id}\`.${key}`);
      }
      items[id] = patch;
    }
  }

  if (fieldPaths.length === 0) return;

  const body = {
    writes: [
      {
        update: {
          name: docName(session, "watchlists", session.uid),
          fields: toFields({ items }),
        },
        updateMask: { fieldPaths },
      },
    ],
  };

  await fsFetch(session, `${docsRoot(session)}:commit`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// One-time lazy migration from the old per-item "watchlist" collection
// (pre-redesign) into the new single-doc shape, so existing data isn't
// stranded. Old docs are left in place untouched (not deleted) as a safety
// net; this only runs when a user's new watchlists/{userId} doc doesn't exist.
async function migrateLegacyWatchlist(session: Session): Promise<Record<string, WatchlistItem>> {
  const rows = await runOwnedQuery(session, "watchlist");
  if (rows.length === 0) return {};

  const items: Record<string, WatchlistItem> = {};
  rows.forEach(({ id, data }) => {
    items[id] = {
      title: (data.title as string) || "Untitled",
      type: (data.type as WatchlistItem["type"]) || "movie",
      status: (data.status as WatchlistItem["status"]) || "plan_to_watch",
      progress: typeof data.progress === "number" ? data.progress : 0,
      totalEpisodes: typeof data.totalEpisodes === "number" ? data.totalEpisodes : null,
      rating: typeof data.rating === "number" ? data.rating : null,
      coverImage: (data.coverImage as string) || null,
      year: typeof data.year === "number" ? data.year : null,
      updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : (typeof data.updatedAt === "number" ? data.updatedAt : 0),
      anilistId: typeof data.anilistId === "number" ? data.anilistId : null,
      traktId: typeof data.traktId === "number" ? data.traktId : null,
    };
  });

  await writeWatchlistItems(session, items as unknown as Record<string, Record<string, unknown>>, new Set(Object.keys(items)));
  return items;
}

async function getRawWatchlist(session: Session): Promise<Record<string, WatchlistItem>> {
  const cacheKey = watchlistCacheKey(session);
  const cached = await cacheGet<Record<string, WatchlistItem>>(cacheKey);
  if (cached) return cached;

  let items: Record<string, WatchlistItem>;
  try {
    const snap = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/watchlists/${session.uid}`);
    items = (fromFields(snap.fields).items as Record<string, WatchlistItem>) || {};
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      items = await migrateLegacyWatchlist(session);
    } else {
      throw error;
    }
  }

  await cacheSet(cacheKey, items, WATCHLIST_CACHE_TTL);
  return items;
}

export async function listWatchlist(session: Session): Promise<WatchlistItem[]> {
  const itemsMap = await getRawWatchlist(session);
  // Items added before createdAt existed have no such field in Firestore —
  // updatedAt is the closest available proxy for when they first appeared.
  const items = Object.entries(itemsMap).map(([id, data]) => ({
    ...data,
    id,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : data.updatedAt,
  }));
  items.sort((a, b) => b.updatedAt - a.updatedAt);
  return items;
}

export async function addWatchlistItem(session: Session, item: Omit<WatchlistItem, "id" | "updatedAt" | "createdAt">) {
  const id = randomUUID();
  const now = Date.now();
  const docData = { ...item, updatedAt: now, createdAt: now };

  await writeWatchlistItems(session, { [id]: docData as unknown as Record<string, unknown> }, new Set([id]));
  await cacheInvalidate(watchlistCacheKey(session));
  return { id };
}

export async function updateWatchlistItem(
  session: Session,
  id: string,
  item: Partial<Omit<WatchlistItem, "id" | "updatedAt" | "createdAt">>
) {
  const patch: Record<string, unknown> = { ...item, updatedAt: Date.now() };
  Object.keys(patch).forEach((key) => {
    if (patch[key] === undefined) delete patch[key];
  });

  await writeWatchlistItems(session, { [id]: patch });
  await cacheInvalidate(watchlistCacheKey(session));
  return { id };
}

// Syncs an external library (AniList, Trakt, ...) into the user's watchlist.
// Reads once, diffs against what's already stored (skipping entries whose
// tracked fields didn't change), and commits every add/update in a single
// masked write — a full library sync costs exactly 1 Firestore write no matter
// how many titles changed.
export async function bulkSyncWatchlist(
  session: Session,
  source: SyncSource,
  entries: SyncEntry[]
): Promise<{ added: number; updated: number; skipped: number }> {
  const idField = source === "anilist" ? "anilistId" : source === "trakt" ? "traktId" : null;

  const itemsMap = await getRawWatchlist(session);
  const existingByExternalId = new Map<number, { id: string; item: WatchlistItem }>();
  const existingByTitleType = new Map<string, { id: string; item: WatchlistItem }>();

  Object.entries(itemsMap).forEach(([id, item]) => {
    if (idField) {
      const extId = item[idField];
      if (extId !== undefined && extId !== null) {
        existingByExternalId.set(Number(extId), { id, item });
      }
    }
    if (item.title && item.type) {
      const key = `${item.type.toLowerCase()}:${item.title.toLowerCase().trim()}`;
      existingByTitleType.set(key, { id, item });
    }
  });

  let added = 0, updated = 0, skipped = 0;
  const now = Date.now();
  const patches: Record<string, Record<string, unknown> | null> = {};
  const newIds = new Set<string>();

  for (const entry of entries) {
    const extId = source === "anilist" ? entry.anilistId : source === "trakt" ? entry.traktId : null;
    let match = extId !== undefined && extId !== null ? existingByExternalId.get(Number(extId)) : undefined;

    if (!match && entry.title && entry.type) {
      const key = `${entry.type.toLowerCase()}:${entry.title.toLowerCase().trim()}`;
      match = existingByTitleType.get(key);
    }

    if (match) {
      const totalEp = entry.totalEpisodes !== undefined && entry.totalEpisodes !== null
        ? Number(entry.totalEpisodes)
        : (match.item.totalEpisodes !== undefined && match.item.totalEpisodes !== null ? Number(match.item.totalEpisodes) : null);
      const prog = entry.progress !== undefined && entry.progress !== null
        ? Number(entry.progress)
        : (match.item.progress !== undefined && match.item.progress !== null ? Number(match.item.progress) : 0);

      let finalStatus = entry.status;
      if (totalEp && totalEp > 0 && prog >= totalEp) {
        finalStatus = "completed";
      }

      const changed =
        match.item.status !== finalStatus ||
        Number(match.item.progress || 0) !== Number(entry.progress || 0) ||
        Number(match.item.rating || 0) !== Number(entry.rating || 0) ||
        (entry.coverImage && match.item.coverImage !== entry.coverImage);

      if (!changed) {
        skipped++;
        continue;
      }

      patches[match.id] = {
        status: finalStatus,
        progress: entry.progress,
        rating: entry.rating,
        ...(entry.coverImage ? { coverImage: entry.coverImage } : {}),
        updatedAt: now,
      };
      updated++;
    } else {
      const id = randomUUID();
      const totalEp = entry.totalEpisodes !== undefined && entry.totalEpisodes !== null ? Number(entry.totalEpisodes) : null;
      const prog = entry.progress !== undefined && entry.progress !== null ? Number(entry.progress) : 0;
      
      let finalStatus = entry.status;
      if (totalEp && totalEp > 0 && prog >= totalEp) {
        finalStatus = "completed";
      }

      patches[id] = {
        title: entry.title,
        type: entry.type,
        status: finalStatus,
        progress: entry.progress,
        totalEpisodes: entry.totalEpisodes,
        rating: entry.rating,
        coverImage: entry.coverImage,
        year: entry.year,
        anilistId: entry.anilistId ?? null,
        traktId: entry.traktId ?? null,
        updatedAt: now,
        createdAt: now,
      };
      newIds.add(id);
      added++;
    }
  }

  await writeWatchlistItems(session, patches, newIds);
  await cacheInvalidate(watchlistCacheKey(session));
  return { added, updated, skipped };
}

export async function deleteWatchlistItem(session: Session, id: string) {
  await writeWatchlistItems(session, { [id]: null });
  await cacheInvalidate(watchlistCacheKey(session));
  return { id };
}
export interface SubscriptionRecord { id: string; name: string; cost: number; billingCycle: "monthly" | "yearly"; nextBillingDate: string; icon: string | null; createdAt: number; }
export interface NoteRecord { id: string; content: string; updatedAt: number; }

const SUBSCRIPTION_CACHE_TTL = 30_000;

function subscriptionCacheKey(session: Session): string {
  return `subscriptions:${session.config.projectId}:${session.uid}`;
}

export async function listSubscriptions(session: Session): Promise<SubscriptionRecord[]> {
  const cacheKey = subscriptionCacheKey(session);
  const cached = await cacheGet<SubscriptionRecord[]>(cacheKey);
  if (cached) return cached;

  const rows = await runOwnedQuery(session, "subscriptions");
  const records = rows
    .map(({ id, data }) => ({
      id,
      name: (data.name as string) || "Untitled",
      cost: typeof data.cost === "number" ? data.cost : 0,
      billingCycle: (data.billingCycle as SubscriptionRecord["billingCycle"]) || "monthly",
      nextBillingDate: (data.nextBillingDate as string) || "",
      icon: (data.icon as string) || null,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    }))
    .sort((a, b) => b.createdAt - a.createdAt);

  await cacheSet(cacheKey, records, SUBSCRIPTION_CACHE_TTL);
  return records;
}

export interface SubscriptionEntry {
  name: string;
  cost: number;
  billingCycle: "monthly" | "yearly";
  nextBillingDate: string;
  icon?: string | null;
}

export async function createSubscription(session: Session, entry: SubscriptionEntry) {
  const docData = {
    userId: session.uid, // Partition by User UID; rules require it to match the token
    name: entry.name,
    cost: entry.cost,
    billingCycle: entry.billingCycle,
    nextBillingDate: entry.nextBillingDate,
    icon: entry.icon || null,
    createdAt: Date.now(),
  };

  const created = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/subscriptions`, {
    method: "POST",
    body: JSON.stringify({ fields: toFields(docData) }),
  });

  await cacheInvalidate(subscriptionCacheKey(session));
  return { id: idFromName(created.name) };
}

export async function deleteSubscription(session: Session, id: string) {
  assertDocId(id, "subscription");

  await fsFetch(session, `${docsRoot(session)}/subscriptions/${id}?currentDocument.exists=true`, {
    method: "DELETE",
  });

  await cacheInvalidate(subscriptionCacheKey(session));
  return { id };
}

export async function updateSubscription(session: Session, id: string, updates: Partial<SubscriptionRecord>) {
  assertDocId(id, "subscription");
  const docData = { ...updates };
  
  const params = new URLSearchParams();
  Object.keys(updates).forEach((k) => {
    params.append("updateMask.fieldPaths", k);
  });

  await fsFetch(session, `${docsRoot(session)}/subscriptions/${id}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });

  await cacheInvalidate(subscriptionCacheKey(session));
}

const NOTE_CACHE_TTL = 30_000;
function noteCacheKey(session: Session): string { return `note:${session.config.projectId}:${session.uid}`; }

export async function getNote(session: Session): Promise<NoteRecord | null> {
  const cacheKey = noteCacheKey(session);
  const cached = await cacheGet<NoteRecord | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/notes/${session.uid}`);
    const data = fromFields(res.fields || {});
    const record = { id: session.uid, content: (data.content as string) || "", updatedAt: (data.updatedAt as number) || 0 };
    await cacheSet(cacheKey, record, NOTE_CACHE_TTL);
    return record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await cacheSet(cacheKey, null, NOTE_CACHE_TTL);
      return null;
    }
    throw err;
  }
}

export async function updateNote(session: Session, content: string) {
  const docData = { content, updatedAt: Date.now() };
  const params = new URLSearchParams();
  params.append("updateMask.fieldPaths", "content");
  params.append("updateMask.fieldPaths", "updatedAt");

  await fsFetch(session, `${docsRoot(session)}/notes/${session.uid}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });
  await cacheInvalidate(noteCacheKey(session));
}

export interface InvestmentAsset {
  id: string;
  name: string;
  category: "equity" | "crypto" | "mutual_fund" | "sip" | "gold" | "cash" | "other";
  amount: number;
  investedAmount: number;
  quantity?: number;
  buyPrice?: number;
  currentPrice?: number;
  previousClose?: number | null;
  notes?: string;
  createdAt?: number;
}

export interface PortfolioRecord {
  id: string;
  assets: InvestmentAsset[];
  updatedAt: number;
  valuationHistory?: Record<string, number>;
}

const PORTFOLIO_CACHE_TTL = 30_000;
function portfolioCacheKey(session: Session): string { return `portfolio:${session.config.projectId}:${session.uid}`; }

export async function getPortfolio(session: Session): Promise<PortfolioRecord | null> {
  const cacheKey = portfolioCacheKey(session);
  const cached = await cacheGet<PortfolioRecord | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/portfolios/${session.uid}`);
    const data = fromFields(res.fields || {});
    const assetsRaw = Array.isArray(data.assets) ? (data.assets as Record<string, unknown>[]) : [];

    // Parse assets fields safely
    const assets: InvestmentAsset[] = assetsRaw.map((a) => ({
      id: String(a.id || ""),
      name: String(a.name || ""),
      category: (a.category || "equity") as InvestmentAsset["category"],
      amount: Number(a.amount || 0),
      investedAmount: Number(a.investedAmount !== undefined && a.investedAmount !== null ? a.investedAmount : (a.amount || 0)),
      quantity: a.quantity !== undefined && a.quantity !== null ? Number(a.quantity) : undefined,
      buyPrice: a.buyPrice !== undefined && a.buyPrice !== null ? Number(a.buyPrice) : undefined,
      currentPrice: a.currentPrice !== undefined && a.currentPrice !== null ? Number(a.currentPrice) : undefined,
      previousClose: a.previousClose !== undefined && a.previousClose !== null ? Number(a.previousClose) : null,
      notes: a.notes ? String(a.notes) : undefined,
      createdAt: a.createdAt !== undefined && a.createdAt !== null ? Number(a.createdAt) : undefined,
    }));

    const valHistoryRaw = data.valuationHistory && typeof data.valuationHistory === "object" ? data.valuationHistory : {};
    const valuationHistory: Record<string, number> = {};
    Object.entries(valHistoryRaw as Record<string, unknown>).forEach(([k, v]) => {
      valuationHistory[k] = Number(v || 0);
    });

    const record = { id: session.uid, assets, updatedAt: Number(data.updatedAt || 0), valuationHistory };
    await cacheSet(cacheKey, record, PORTFOLIO_CACHE_TTL);
    return record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await cacheSet(cacheKey, null, PORTFOLIO_CACHE_TTL);
      return null;
    }
    throw err;
  }
}

export async function updatePortfolio(session: Session, assets: InvestmentAsset[]) {
  const docData = { assets, updatedAt: Date.now() };
  const params = new URLSearchParams();
  params.append("updateMask.fieldPaths", "assets");
  params.append("updateMask.fieldPaths", "updatedAt");

  await fsFetch(session, `${docsRoot(session)}/portfolios/${session.uid}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });
  await cacheInvalidate(portfolioCacheKey(session));
}

export async function updatePortfolioValuationHistory(
  session: Session,
  valuationHistory: Record<string, number>
) {
  const docData = { valuationHistory, updatedAt: Date.now() };
  const params = new URLSearchParams();
  params.append("updateMask.fieldPaths", "valuationHistory");
  params.append("updateMask.fieldPaths", "updatedAt");

  await fsFetch(session, `${docsRoot(session)}/portfolios/${session.uid}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });
  await cacheInvalidate(portfolioCacheKey(session));
}

export interface DashboardSettings {
  timeFilter: "7" | "30" | "90" | "salary" | "all";
  salaryDay: number;
  monthlySalary?: number;
  additionalIncome?: number;
  // Keyed by pay-cycle start date (YYYY-MM-DD) — the actual "cash on hand"
  // amount the user confirmed during the Financial Health reconciliation
  // check, so it survives reloads instead of resetting every visit.
  reconciliations?: Record<string, number>;
  // Keyed by the logged payday itself (YYYY-MM-DD) — lets pay-cycle math
  // snap to an actual salary date + amount instead of assuming a fixed
  // day-of-month, since many paydays are business-day rules ("last working
  // day before the 25th") that shift month to month.
  salaryLog?: Record<string, { date: string; amount: number }>;
  updatedAt: number;
}

const SETTINGS_CACHE_TTL = 30_000;
function settingsCacheKey(session: Session): string { return `settings:${session.config.projectId}:${session.uid}`; }

export async function getSettings(session: Session): Promise<DashboardSettings | null> {
  const cacheKey = settingsCacheKey(session);
  const cached = await cacheGet<DashboardSettings | null>(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const res = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/settings/${session.uid}`);
    const data = fromFields(res.fields || {});
    const reconciliationsRaw = data.reconciliations && typeof data.reconciliations === "object" ? data.reconciliations : {};
    const reconciliations: Record<string, number> = {};
    Object.entries(reconciliationsRaw as Record<string, unknown>).forEach(([k, v]) => {
      reconciliations[k] = Number(v || 0);
    });

    const salaryLogRaw = data.salaryLog && typeof data.salaryLog === "object" ? data.salaryLog : {};
    const salaryLog: Record<string, { date: string; amount: number }> = {};
    Object.entries(salaryLogRaw as Record<string, unknown>).forEach(([k, v]) => {
      const entry = v as Record<string, unknown>;
      if (entry && typeof entry === "object") {
        salaryLog[k] = { date: String(entry.date || k), amount: Number(entry.amount || 0) };
      }
    });

    const record: DashboardSettings = {
      timeFilter: (data.timeFilter as DashboardSettings["timeFilter"]) || "all",
      salaryDay: Number(data.salaryDay || 1),
      monthlySalary: Number(data.monthlySalary || 0),
      additionalIncome: Number(data.additionalIncome || 0),
      reconciliations,
      salaryLog,
      updatedAt: Number(data.updatedAt || 0),
    };
    await cacheSet(cacheKey, record, SETTINGS_CACHE_TTL);
    return record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await cacheSet(cacheKey, null, SETTINGS_CACHE_TTL);
      return null;
    }
    throw err;
  }
}

export async function updateSettings(session: Session, updates: Partial<Omit<DashboardSettings, "updatedAt">>) {
  const docData = { ...updates, updatedAt: Date.now() };
  const params = new URLSearchParams();
  Object.keys(docData).forEach((k) => params.append("updateMask.fieldPaths", k));

  await fsFetch(session, `${docsRoot(session)}/settings/${session.uid}?${params}`, {
    method: "PATCH",
    body: JSON.stringify({ fields: toFields(docData) }),
  });
  await cacheInvalidate(settingsCacheKey(session));
}

export interface DailyRecommendation {
  type: "movie" | "show" | "anime" | "book";
  title: string;
  releaseYear?: string;
  author?: string;
  synopsis: string;
  rationale: string;
  score?: number | string | null;
  coverImage?: string | null;
  isLogged?: boolean;
  date: string;
}

const RECOMMENDATIONS_CACHE_TTL = 3600; // 1 hour
function recommendationsCacheKey(session: Session): string {
  return `recommendations:${session.config.projectId}:${session.uid}`;
}

export async function getDailyRecommendations(session: Session): Promise<Record<string, DailyRecommendation>> {
  const cacheKey = recommendationsCacheKey(session);
  const cached = await cacheGet<Record<string, DailyRecommendation>>(cacheKey);
  if (cached !== undefined && cached !== null) return cached;

  try {
    const snap = await fsFetch<FirestoreDocument>(session, `${docsRoot(session)}/recommendations/${session.uid}`);
    const data = (fromFields(snap.fields || {}).items as Record<string, DailyRecommendation>) || {};
    await cacheSet(cacheKey, data, RECOMMENDATIONS_CACHE_TTL);
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      const empty = {};
      await cacheSet(cacheKey, empty, RECOMMENDATIONS_CACHE_TTL);
      return empty;
    }
    throw error;
  }
}

export async function saveDailyRecommendation(
  session: Session,
  key: string,
  recommendation: DailyRecommendation
) {
  const current = await getDailyRecommendations(session);
  current[key] = recommendation;

  const url = `${docsRoot(session)}/recommendations/${session.uid}`;
  const body = {
    fields: toFields({ items: current }),
  };

  await fsFetch(session, url, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  
  await cacheInvalidate(recommendationsCacheKey(session));
}
