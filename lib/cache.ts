import { redis } from "./redis";

// Tiny async TTL cache for per-user Firestore reads.
// Uses Redis (via Upstash) for serverless persistence across cold starts,
// gracefully falling back to an in-memory Map for local development.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const localStore = new Map<string, CacheEntry<unknown>>();

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  if (redis) {
    try {
      const data = await redis.get<T>(key);
      return data === null ? undefined : data;
    } catch (err) {
      console.warn("Redis get error:", err);
      return undefined;
    }
  } else {
    const entry = localStore.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      localStore.delete(key);
      return undefined;
    }
    return entry.value as T;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  if (redis) {
    try {
      await redis.set(key, value, { px: ttlMs });
    } catch (err) {
      console.warn("Redis set error:", err);
    }
  } else {
    localStore.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

export async function cacheInvalidate(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn("Redis del error:", err);
    }
  } else {
    localStore.delete(key);
  }
}
