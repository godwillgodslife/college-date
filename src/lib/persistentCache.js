import { clearMobileCache, setMobileCache } from './mobileCache';

const CACHE_PREFIX = 'tcd-cache:';
const DEFAULT_TTL_MS = 5 * 60 * 1000;

function isStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function isNativeApp() {
  return typeof window !== 'undefined' &&
    window.Capacitor !== undefined &&
    window.Capacitor.isNativePlatform?.();
}

function serializeKey(key) {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

function storageKey(key) {
  return `${CACHE_PREFIX}${serializeKey(key)}`;
}

export function getCachedData(key, { ttlMs = DEFAULT_TTL_MS } = {}) {
  if (!isStorageAvailable()) return undefined;

  try {
    const raw = window.localStorage.getItem(storageKey(key));
    if (!raw) return undefined;

    const cached = JSON.parse(raw);
    if (!cached || Date.now() - cached.createdAt > ttlMs) {
      window.localStorage.removeItem(storageKey(key));
      return undefined;
    }

    return cached.value;
  } catch {
    return undefined;
  }
}

export function setCachedData(key, value) {
  if (!isStorageAvailable() || value === undefined) return;

  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify({
      createdAt: Date.now(),
      value
    }));
    setMobileCache(key, value);
  } catch (error) {
    console.warn('[Cache] Persist skipped:', error);
  }
}

export function persistentSWR(key, options = {}) {
  if (!key || !isNativeApp()) return options;

  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const fallbackData = options.fallbackData ?? getCachedData(key, { ttlMs });
  const onSuccess = (data, swrKey, config) => {
    setCachedData(key, data);
    options.onSuccess?.(data, swrKey, config);
  };

  const { ttlMs: _ttlMs, ...rest } = options;
  return {
    ...rest,
    fallbackData,
    keepPreviousData: true,
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
