const DB_NAME = "pdfnest-offline";
const DB_VERSION = 1;
const STORE_NAME = "pdfs";
const MAX_CACHE_BYTES = 200 * 1024 * 1024; // 200MB

interface CachedPDF {
  id: string;
  blob: Blob;
  fileName: string;
  fileSize: number;
  cachedAt: number;
  lastAccessed: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cachePDF(
  id: string,
  blob: Blob,
  fileName: string
): Promise<void> {
  try {
    await enforceCacheLimit(blob.size);
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const entry: CachedPDF = {
      id,
      blob,
      fileName,
      fileSize: blob.size,
      cachedAt: Date.now(),
      lastAccessed: Date.now(),
    };

    store.put(entry);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn("Failed to cache PDF offline:", err);
  }
}

export async function getCachedPDF(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const entry: CachedPDF | undefined = await new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (entry) {
      // Update last accessed
      entry.lastAccessed = Date.now();
      store.put(entry);
    }

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    db.close();

    return entry?.blob ?? null;
  } catch {
    return null;
  }
}

export async function removeCachedPDF(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    db.close();
  } catch {
    // ignore
  }
}

export async function getAllCachedIds(): Promise<Set<string>> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);

    const ids = new Set<string>();
    await new Promise<void>((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          ids.add(cursor.key as string);
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return ids;
  } catch {
    return new Set();
  }
}

export async function getCacheSize(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    let total = 0;

    await new Promise<void>((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          total += (cursor.value as CachedPDF).fileSize;
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    return total;
  } catch {
    return 0;
  }
}

async function enforceCacheLimit(incomingSize: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    const entries: CachedPDF[] = [];
    await new Promise<void>((resolve, reject) => {
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          entries.push(cursor.value as CachedPDF);
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });

    let totalSize = entries.reduce((sum, e) => sum + e.fileSize, 0);

    if (totalSize + incomingSize <= MAX_CACHE_BYTES) {
      db.close();
      return;
    }

    // Sort by LRU (oldest accessed first)
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

    for (const entry of entries) {
      if (totalSize + incomingSize <= MAX_CACHE_BYTES) break;
      store.delete(entry.id);
      totalSize -= entry.fileSize;
    }

    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
    });
    db.close();
  } catch {
    // ignore - best effort
  }
}

export function isOffline(): boolean {
  return !navigator.onLine;
}

// --- Offline file metadata persistence ---

const FILE_LIST_KEY = "pdfnest-offline-file-list";

export interface OfflineFileMetadata {
  id: string;
  name: string;
  file_name: string;
  file_size: number;
  storage_path: string;
  category_id: string | null;
  created_at: string;
  is_favorite: boolean;
  thumbnail_url: string | null;
}

export function saveFileListForOffline(files: OfflineFileMetadata[]): void {
  try {
    localStorage.setItem(FILE_LIST_KEY, JSON.stringify(files));
  } catch {
    // Storage full or unavailable
  }
}

export function getOfflineFileList(): OfflineFileMetadata[] {
  try {
    const stored = localStorage.getItem(FILE_LIST_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}
