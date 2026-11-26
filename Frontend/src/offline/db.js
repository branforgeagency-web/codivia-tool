/* CODIVIA offline — minimal promise wrapper around IndexedDB (one database, named object stores).
 *
 *   await idbPut('drafts', key, value) · await idbGet('drafts', key) · await idbDelete('drafts', key)
 *   await idbEntries('drafts')  → [[key, value], …]
 *
 * When IndexedDB is unavailable (old browser, some private windows, storage blocked) every call
 * falls back to an in-memory Map, so callers never need their own checks — the server stays the
 * source of truth either way.
 */

const DB_NAME = 'codivia-offline';
const DB_VERSION = 1;
const STORES = ['drafts'];

let dbPromise = null;
const memory = new Map(STORES.map((s) => [s, new Map()]));

const promisify = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => STORES.forEach((s) => req.result.objectStoreNames.contains(s) || req.result.createObjectStore(s));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null); // blocked / private mode → in-memory fallback
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function run(store, mode, fn) {
  const db = await openDb();
  if (!db) return fn(null, memory.get(store));
  const tx = db.transaction(store, mode);
  const result = await fn(tx.objectStore(store), null);
  if (mode === 'readwrite') {
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }
  return result;
}

export const idbGet = (store, key) => run(store, 'readonly', (os, mem) => (os ? promisify(os.get(key)) : mem.get(key)));

export const idbPut = (store, key, value) =>
  run(store, 'readwrite', (os, mem) => {
    if (!os) return mem.set(key, value);
    os.put(value, key);
    return undefined;
  });

export const idbDelete = (store, key) =>
  run(store, 'readwrite', (os, mem) => {
    if (!os) return mem.delete(key);
    os.delete(key);
    return undefined;
  });

export const idbEntries = (store) =>
  run(store, 'readonly', async (os, mem) => {
    if (!os) return [...mem.entries()];
    const [keys, values] = await Promise.all([promisify(os.getAllKeys()), promisify(os.getAll())]);
    return keys.map((k, i) => [k, values[i]]);
  });

// Ask the browser not to evict our data when the disk is nearly full (best effort, once).
let persistAsked = false;
export function requestPersistentStorage() {
  if (persistAsked || typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) return;
  persistAsked = true;
  navigator.storage.persist().catch(() => {});
}
