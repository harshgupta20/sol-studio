// Browser storage helpers. Rules (see SECURITY in README):
//  - Non-secret preferences (selected repo/branch, UI, chosen AI model) → localStorage.
//  - Secrets (AI API key, GitHub token) are NEVER written here by default. When a
//    user explicitly opts in, they go to sessionStorage only (cleared on tab close).
//  - Larger, disposable data (workspace drafts) → IndexedDB.

type Store = 'local' | 'session';

function backing(store: Store): Storage | null {
  try {
    return store === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null; // private mode / blocked
  }
}

export function readJSON<T>(store: Store, key: string, fallback: T): T {
  const s = backing(store);
  if (!s) return fallback;
  try {
    const raw = s.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJSON(store: Store, key: string, value: unknown): void {
  const s = backing(store);
  if (!s) return;
  try {
    s.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / blocked — non-fatal */
  }
}

export function remove(store: Store, key: string): void {
  const s = backing(store);
  if (!s) return;
  try {
    s.removeItem(key);
  } catch {
    /* ignore */
  }
}

// --- IndexedDB keyval (workspace drafts) ------------------------------------

const DB_NAME = 'sol-studio';
const STORE = 'kv';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}
