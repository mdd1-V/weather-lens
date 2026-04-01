interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL = 15 * 60 * 1000; // 15 minutes

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

export function clearCache(): void {
  store.clear();
}

export function cacheKey(source: string, lat: number, lon: number): string {
  return `${source}:${lat.toFixed(2)}:${lon.toFixed(2)}`;
}
