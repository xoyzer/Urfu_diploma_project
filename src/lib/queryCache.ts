const TTL = 60_000; // 60 seconds

interface CacheEntry {
    data: unknown;
    timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry || Date.now() - entry.timestamp > TTL) return null;
    return entry.data as T;
}

export function setCached(key: string, data: unknown): void {
    cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(...keys: string[]): void {
    for (const key of keys) cache.delete(key);
}

export function invalidateAll(): void {
    cache.clear();
}
