// Tiny in-process TTL cache for per-user Firestore reads.
// Lives for the lifetime of the server process — on a long-running Node server
// (next start / a container) this actually absorbs repeat reads; on cold-start
// serverless platforms each cold start begins empty, so this is a bonus layer
// on top of (not a replacement for) keeping the read count itself low.
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheInvalidate(key: string): void {
  store.delete(key);
}
