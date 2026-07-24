import { redis } from "./redis";

// Tiny async TTL cache for per-user Firestore reads.
// Uses a hybrid Layer 1 (Memory) and Layer 2 (Upstash Redis) caching strategy
// to stay well within free tier limits.

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}
const localStore = new Map<string, CacheEntry<unknown>>();

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  // Layer 1: Check in-memory local cache first (0 network cost, 0 Redis commands)
  const localEntry = localStore.get(key);
  if (localEntry && Date.now() <= localEntry.expiresAt) {
    return localEntry.value as T;
  }

  // Layer 2: Check remote Redis cache
  if (redis) {
    try {
      const data = await redis.get<T>(key);
      if (data !== null && data !== undefined) {
        // Populate L1 cache for subsequent warm requests (cache in memory for 30s max for consistency)
        localStore.set(key, { value: data, expiresAt: Date.now() + 30_000 });
        return data;
      }
    } catch (err) {
      console.warn("Redis get error:", err);
    }
  }
  return undefined;
}

export async function cacheSet<T>(key: string, value: T, ttlMs: number): Promise<void> {
  // Save to Layer 1 memory
  localStore.set(key, { value, expiresAt: Date.now() + ttlMs });

  // Save to Layer 2 remote Redis
  if (redis) {
    try {
      await redis.set(key, value, { px: ttlMs });
    } catch (err) {
      console.warn("Redis set error:", err);
    }
  }
}

export async function cacheInvalidate(key: string): Promise<void> {
  // Evict from both layers
  localStore.delete(key);
  if (redis) {
    try {
      await redis.del(key);
    } catch (err) {
      console.warn("Redis del error:", err);
    }
  }
}
