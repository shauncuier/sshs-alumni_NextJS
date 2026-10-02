/**
 * SSGHS Alumni — Offline Directory Storage
 * 
 * Stores batch directories and member cards in local storage / IndexedDB
 * for offline availability during campus visits and reunions.
 */

export interface CachedBatchDirectory<T = unknown> {
  batchYear: number;
  cachedAt: number;
  members: T[];
}

const STORAGE_PREFIX = "ssghs_cache_batch_";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function saveBatchToOfflineStorage<T = unknown>(batchYear: number, members: T[]): void {
  if (typeof window === "undefined") return;

  try {
    const data: CachedBatchDirectory<T> = {
      batchYear,
      cachedAt: Date.now(),
      members,
    };
    localStorage.setItem(`${STORAGE_PREFIX}${batchYear}`, JSON.stringify(data));
  } catch (e) {
    console.warn("[Offline Storage] Failed to cache batch directory", e);
  }
}

export function getBatchFromOfflineStorage<T = unknown>(batchYear: number): T[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${batchYear}`);
    if (!raw) return null;

    const data: CachedBatchDirectory<T> = JSON.parse(raw);
    if (Date.now() - data.cachedAt > TTL_MS) {
      localStorage.removeItem(`${STORAGE_PREFIX}${batchYear}`);
      return null;
    }

    return data.members;
  } catch {
    return null;
  }
}

export function isOffline(): boolean {
  if (typeof window === "undefined") return false;
  return !navigator.onLine;
}
