import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCachedRecord, setCachedData } from '../lib/persistentCache';
import { getMobileCache, setMobileCache } from '../lib/mobileCache';

export function useCachedAsync(key, fetcher, {
  enabled = true,
  ttlMs = 5 * 60 * 1000,
  initialData,
  onError
} = {}) {
  const keyString = useMemo(() => (key ? JSON.stringify(key) : ''), [key]);
  const stableKey = useMemo(() => key, [keyString]);
  const syncCachedRecord = stableKey ? getCachedRecord(stableKey, { ttlMs, allowStale: true }) : undefined;
  const syncCached = syncCachedRecord?.value;
  const [data, setData] = useState(syncCached ?? initialData);
  const [isStale, setIsStale] = useState(Boolean(syncCachedRecord?.stale));
  const [loading, setLoading] = useState(Boolean(enabled && stableKey && data === undefined));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!enabled || !stableKey || !fetcher) return undefined;
    if (!silent && data === undefined) setLoading(true);
    if (silent) setRefreshing(true);

    try {
      const fresh = await fetcher();
      setData(fresh);
      setIsStale(false);
      setCachedData(stableKey, fresh);
      setMobileCache(stableKey, fresh);
      setError(null);
      return fresh;
    } catch (err) {
      setError(err);
      onError?.(err);
      return undefined;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data, enabled, fetcher, onError, stableKey]);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      if (!enabled || !stableKey) {
        setLoading(false);
        return;
      }

      const cached = await getMobileCache(stableKey, { ttlMs });
      if (mounted && cached !== undefined) {
        setData(cached);
        setIsStale(false);
        setLoading(false);
      }

      refresh({ silent: cached !== undefined || data !== undefined });
    }

    hydrate();
    return () => {
      mounted = false;
    };
  }, [enabled, refresh, stableKey, ttlMs]);

  return { data, setData, loading, refreshing, error, refresh, isStale };
}
