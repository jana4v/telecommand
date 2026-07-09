/**
 * mnemonicCache — IndexedDB-backed persistent cache for the heavy mnemonic
 * payloads (the ~5 MB /mnemonics/tm catalog and the ~0.4 MB
 * id_to_mnemonic_mapping).
 *
 * Why IndexedDB and not localStorage:
 *   - The catalog is ~5 MB. localStorage's quota is ~5 MB per origin and stores
 *     UTF-16, so the string can need ~10 MB → QuotaExceededError. We already hit
 *     this exact wall with the diagram cache.
 *   - localStorage is synchronous: reading/writing 5 MB blocks the main thread.
 *   - IndexedDB is async and sized for hundreds of MB, and is reachable from a
 *     Worker if we later move the fetch/parse off the main thread.
 *
 * The cache is keyed by a `version` string the caller derives from a cheap
 * signal (a hash of the live-key list). When mnemonics are re-uploaded the
 * version changes and the cache is transparently refetched.
 *
 * Every operation fails soft: any IndexedDB error resolves to null/no-op so the
 * caller falls back to a normal network fetch. Caching is a pure optimisation
 * and must never break mnemonic loading.
 */

import type { MnemonicInfo } from "./mnemonicStore";

const DB_NAME = "spasdacs";
const DB_VERSION = 1;
const STORE = "mnemonics";
const CACHE_KEY = "tm_catalog_v1";

/** Shape persisted in IndexedDB. */
export interface CachedMnemonics {
  version: string;
  catalog: MnemonicInfo[];
  mapping: Record<string, string>;
  subsystems: string[];
  live: string[];
  savedAt: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn("[mnemonicCache] IndexedDB open failed:", req.error);
        resolve(null);
      };
    } catch (e) {
      console.warn("[mnemonicCache] IndexedDB unavailable:", e);
      resolve(null);
    }
  });
  return dbPromise;
}

/**
 * Return the cached payload if present AND its version matches `expectedVersion`.
 * A version mismatch (mnemonics changed) or any error resolves to null so the
 * caller refetches.
 */
export async function getCachedMnemonics(expectedVersion: string): Promise<CachedMnemonics | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(CACHE_KEY);
      req.onsuccess = () => {
        const val = req.result as CachedMnemonics | undefined;
        if (val && val.version === expectedVersion) resolve(val);
        else resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Delete the cached mnemonic payload so the next loadMnemonics() refetches from
 * the gateway. Use for a hard reset (e.g. a "Clear cache" action). Fails soft.
 */
export async function clearCachedMnemonics(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Persist the payload. Fails soft — a write error is logged and ignored. */
export async function setCachedMnemonics(payload: CachedMnemonics): Promise<void> {
  const db = await openDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(payload, CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.warn("[mnemonicCache] write failed:", tx.error);
        resolve();
      };
      tx.onabort = () => resolve();
    } catch (e) {
      console.warn("[mnemonicCache] write threw:", e);
      resolve();
    }
  });
}

/**
 * Compute a small, stable version token from the live-key list. mnemonics are
 * effectively immutable between uploads; when the live list changes (e.g. a new
 * mnemonic catalogue is uploaded) the hash changes and the cache invalidates.
 * Uses a djb2 hash + length so it's cheap and collision-resistant enough for a
 * cache key.
 */
export function mnemonicVersion(live: string[]): string {
  let h = 5381;
  // Hash the joined list. The list is small relative to the 5 MB catalog.
  const s = live.join("");
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i); // h * 33 ^ c
  }
  // >>> 0 to keep it unsigned; include length to further reduce collisions.
  return `${(h >>> 0).toString(36)}_${live.length}`;
}
