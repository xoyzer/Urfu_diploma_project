// Per-key TTL in milliseconds. Keys not listed here fall back to DEFAULT_TTL.
const KEY_TTL: Record<string, number> = {
    catalog_products: 5 * 60_000,
    admin_customers: 3 * 60_000,
    admin_customers_products: 3 * 60_000,
    admin_orders: 2 * 60_000,
    inv_products: 2 * 60_000,
    inv_transactions: 2 * 60_000,
    inv_delivery_orders: 2 * 60_000,
};
const DEFAULT_TTL = 60_000;

const LS_PREFIX = "qc_";

interface CacheEntry {
    data: unknown;
    timestamp: number;
}

// In-memory layer (fast; cleared on page unload)
const memCache = new Map<string, CacheEntry>();

function ttlFor(key: string): number {
    return KEY_TTL[key] ?? DEFAULT_TTL;
}

function lsKey(key: string): string {
    return LS_PREFIX + key;
}

function readLs(key: string): CacheEntry | null {
    try {
        const raw = localStorage.getItem(lsKey(key));
        if (!raw) return null;
        return JSON.parse(raw) as CacheEntry;
    } catch {
        return null;
    }
}

function writeLs(key: string, entry: CacheEntry): void {
    try {
        localStorage.setItem(lsKey(key), JSON.stringify(entry));
    } catch {
        // quota exceeded — ignore, memory cache still works
    }
}

function removeLs(key: string): void {
    try {
        localStorage.removeItem(lsKey(key));
    } catch {
        // ignore
    }
}

export function getCached<T>(key: string): T | null {
    const ttl = ttlFor(key);
    const now = Date.now();

    // Check memory first
    const mem = memCache.get(key);
    if (mem && now - mem.timestamp <= ttl) {
        return mem.data as T;
    }

    // Fall back to localStorage (survives page reload)
    const ls = readLs(key);
    if (ls && now - ls.timestamp <= ttl) {
        memCache.set(key, ls); // promote to memory
        return ls.data as T;
    }

    return null;
}

export function setCached(key: string, data: unknown): void {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    memCache.set(key, entry);
    writeLs(key, entry);
}

export function invalidateCache(...keys: string[]): void {
    for (const key of keys) {
        memCache.delete(key);
        removeLs(key);
    }
}

export function invalidateAll(): void {
    memCache.clear();
    try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith(LS_PREFIX)) toRemove.push(k);
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
        // ignore
    }
}
