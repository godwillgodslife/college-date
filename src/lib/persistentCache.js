import { clearMobileCache, getMemoryCacheRecord, removeMobileCache, setMobileCache } from './mobileCache';

export const APP_CACHE_VERSION = 'v2.2.66';
const CACHE_PREFIX = `tcd-cache-${APP_CACHE_VERSION}:`;
const LEGACY_PREFIXES = [
  'tcd-cache:',
  'tcd-cache-v2.2.40:',
  'tcd-cache-v2.2.41:',
  'tcd-cache-v2.2.42:',
  'tcd-cache-v2.2.43:',
  'tcd-cache-v2.2.44:',
  'tcd-cache-v2.2.58:',
  'tcd-cache-v2.2.59:',
  'tcd-cache-v2.2.60:',
  'tcd-cache-v2.2.61:',
  'tcd-cache-v2.2.62:',
  'tcd-cache-v2.2.63:',
  'tcd-cache-v2.2.64:',
  'tcd-cache-v2.2.65:'
];
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function isStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

// Invalidate legacy cache entries from earlier application versions
if (isStorageAvailable()) {
  try {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (LEGACY_PREFIXES.some(p => k.startsWith(p)) || (k.startsWith('tcd-cache-') && !k.startsWith(CACHE_PREFIX)))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => window.localStorage.removeItem(k));
  } catch (e) {
    console.warn('[Cache] Version pruning skipped:', e);
  }
}

function serializeKey(key) {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

function storageKey(key) {
  return `${CACHE_PREFIX}${serializeKey(key)}`;
}

export function getCachedRecord(key, { ttlMs = DEFAULT_TTL_MS, allowStale = false } = {}) {
  if (!key) return undefined;

  // 1. Try synchronous localStorage read
  if (isStorageAvailable()) {
    try {
      const raw = window.localStorage.getItem(storageKey(key));
      if (raw) {
        const cached = JSON.parse(raw);
        const createdAt = cached?.createdAt || cached?.timestamp || 0;
        const stale = !createdAt || Date.now() - createdAt > ttlMs;
        if (!cached || (stale && !allowStale)) {
          window.localStorage.removeItem(storageKey(key));
        } else {
          return {
            ...cached,
            createdAt,
            stale,
            value: cached.value
          };
        }
      }
    } catch (e) {
      console.warn('[Cache] LocalStorage read skipped:', e);
    }
  }

  // 2. Fallback to synchronous in-memory cache record from mobileCache
  const memoryRecord = getMemoryCacheRecord(key, { ttlMs, allowStale });
  if (memoryRecord) {
    return {
      ...memoryRecord,
      createdAt: memoryRecord.createdAt || 0,
      stale: memoryRecord.stale || false,
      value: memoryRecord.value
    };
  }

  return undefined;
}

export function getCachedData(key, { ttlMs = DEFAULT_TTL_MS, allowStale = false } = {}) {
  return getCachedRecord(key, { ttlMs, allowStale })?.value;
}

export function setCachedData(key, value, metadata = {}) {
  if (value === undefined || !key) return;

  const serialized = {
    createdAt: Date.now(),
    ...metadata,
    value
  };

  // 1. Write to localStorage (gracefully handled on quota limits)
  if (isStorageAvailable()) {
    try {
      window.localStorage.setItem(storageKey(key), JSON.stringify(serialized));
    } catch (error) {
      console.warn('[Cache] LocalStorage quota limit reached, relying on IndexedDB:', error);
    }
  }

  // 2. Always write to mobileCache (in-memory Map + IndexedDB)
  try {
    setMobileCache(key, value);
  } catch (error) {
    console.warn('[Cache] MobileCache persist skipped:', error);
  }
}

export function invalidateCachedData(key) {
  if (!key) return;

  if (isStorageAvailable()) {
    try {
      window.localStorage.removeItem(storageKey(key));
    } catch (e) {
      console.warn('[Cache] LocalStorage delete skipped:', e);
    }
  }

  try {
    removeMobileCache(key);
  } catch (e) {
    console.warn('[Cache] MobileCache delete skipped:', e);
  }
}

export function persistentSWR(key, options = {}) {
  if (!key || !isStorageAvailable()) return options;

  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const fallbackRecord = getCachedRecord(key, { ttlMs, allowStale: true });
  const fallbackData = options.fallbackData ?? fallbackRecord?.value;
  const onSuccess = (data, swrKey, config) => {
    setCachedData(key, data);
    options.onSuccess?.(data, swrKey, config);
  };

  const { ttlMs: _ttlMs, ...rest } = options;
  return {
    ...rest,
    fallbackData,
    keepPreviousData: true,
    isPaused: () => typeof navigator !== 'undefined' && navigator.onLine === false && fallbackData !== undefined,
    revalidateIfStale: true,
    onSuccess
  };
}

export function clearAppCache({ userId } = {}) {
  if (!isStorageAvailable()) return;

  try {
    Object.keys(window.localStorage).forEach((key) => {
      if (!key.startsWith(CACHE_PREFIX)) return;
      if (!userId || key.includes(userId)) {
        window.localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('[Cache] Clear skipped:', error);
  }

  clearMobileCache({ userId });
}
