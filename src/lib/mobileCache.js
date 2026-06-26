const DB_NAME = 'the-college-date-cache';
const DB_VERSION = 1;
const STORE_NAME = 'records';
const MEMORY_CACHE = new Map();

function canUseIndexedDB() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function serializeKey(key) {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

function openCacheDb() {
  if (!canUseIndexedDB()) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getMobileCache(key, { ttlMs = 5 * 60 * 1000 } = {}) {
  const serializedKey = serializeKey(key);
  const memoryRecord = MEMORY_CACHE.get(serializedKey);

  if (memoryRecord && Date.now() - memoryRecord.createdAt <= ttlMs) {
    return memoryRecord.value;
  }

  const db = await openCacheDb();
  if (!db) return undefined;

  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(serializedKey);

    request.onsuccess = () => {
      const record = request.result;
      if (!record || Date.now() - record.createdAt > ttlMs) {
        resolve(undefined);
        return;
      }
      MEMORY_CACHE.set(serializedKey, record);
      resolve(record.value);
    };
    request.onerror = () => resolve(undefined);
  });
}

export async function setMobileCache(key, value) {
  if (value === undefined) return;

  const serializedKey = serializeKey(key);
  const record = {
    key: serializedKey,
    createdAt: Date.now(),
    value
  };

  MEMORY_CACHE.set(serializedKey, record);

  try {
    const db = await openCacheDb();
    if (!db) return;

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[MobileCache] Persist skipped:', error);
  }
}

export async function removeMobileCache(key) {
  const serializedKey = serializeKey(key);
  MEMORY_CACHE.delete(serializedKey);

  try {
    const db = await openCacheDb();
    if (!db) return;

    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(serializedKey);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('[MobileCache] Remove skipped:', error);
  }
}

export async function clearMobileCache({ userId } = {}) {
  MEMORY_CACHE.clear();

  try {
    const db = await openCacheDb();
    if (!db) return;

    const allRecords = await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });

    await Promise.all(
      allRecords
        .filter((record) => !userId || record.key.includes(userId))
        .map((record) => removeMobileCache(record.key))
    );
  } catch (error) {
    console.warn('[MobileCache] Clear skipped:', error);
  }
}
