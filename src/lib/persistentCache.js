import { clearMobileCache, setMobileCache } from './mobileCache';

const CACHE_PREFIX = 'tcd-cache:';
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function isStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function serializeKey(key) {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

function storageKey(key) {
  return `${CACHE_PREFIX}${serializeKey(key)}`;
}

export function getCachedRecord(key, { ttlMs = DEFAULT_TTL_MS, allowStale = false } = {}) {
  if (!isStorageAvailable()) return undefined;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return undefined;

    const cached = JSON.parse(raw);
    const createdAt = cached?.createdAt || cached?.timestamp || 0;
    const stale = !createdAt || Date.now() - createdAt > ttlMs;
    if (!cached || (stale && !allowStale)) {
      window.localStorage.removeItem(storageKey(key));
      return undefined;
    }

    return {
      ...cached,
      createdAt,
      stale,
      value: cached.value
    };
  } catch {
    return undefined;
  }
}

export function getCachedData(key, { ttlMs = DEFAULT_TTL_MS, allowStale = false } = {}) {
  return getCachedRecord(key, { ttlMs, allowStale })?.value;
}

export function setCachedData(key, value, metadata = {}) {
  if (!isStorageAvailable() || value === undefined) return;

  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify({
      createdAt: Date.now(),
      ...metadata,
      value
    }));
    setMobileCache(key, value);
  } catch (error) {
    console.warn('[Cache] Persist skipped:', error);
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
