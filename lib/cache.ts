interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs = 5 * 60 * 1000): void {
  for (const [id, entry] of store) if (entry.expiresAt <= Date.now()) store.delete(id);
  if (store.size >= 250) store.delete(store.keys().next().value!);
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function buildCacheKey(parts: Record<string, string | number | undefined>): string {
  return Object.entries(parts)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
}
