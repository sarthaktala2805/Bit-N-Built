// StageX AI — IndexedDB Media & File Storage
// Enables direct file uploads (Videos, PPTs, Documents, Scripts) from laptop and mobile devices
// without hitting the 5MB window.localStorage quota limits.

const DB_NAME = "StageX_Media_DB";
const STORE_NAME = "event_resources_files";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

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

export interface StoredMediaFile {
  id: string;
  name: string;
  type: string;
  size: number;
  blob: Blob;
  dataUrl?: string;
  uploadedAt: number;
}

/**
 * Saves a local file (from mobile or laptop) into IndexedDB
 */
export async function saveMediaFile(id: string, file: File): Promise<StoredMediaFile> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const record: StoredMediaFile = {
      id,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      blob: file,
      uploadedAt: Date.now(),
    };

    const req = store.put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves a stored file from IndexedDB
 */
export async function getMediaFile(id: string): Promise<StoredMediaFile | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Creates an object URL for a media file (for video players or file downloads)
 */
export async function getMediaObjectUrl(id: string): Promise<string | null> {
  const file = await getMediaFile(id);
  if (!file || !file.blob) return null;
  try {
    return URL.createObjectURL(file.blob);
  } catch {
    return null;
  }
}

/**
 * Deletes a file from IndexedDB
 */
export async function deleteMediaFile(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}
