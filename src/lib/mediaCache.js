const MEDIA_CACHE_NAME = 'tcd-media-cache-v1';
const MEDIA_MANIFEST_KEY = 'tcd-media-cache-manifest';
const MAX_MEDIA_ENTRIES = 120;
const MAX_MEDIA_BYTES = 60 * 1024 * 1024;
const MAX_SINGLE_MEDIA_BYTES = 5 * 1024 * 1024;

function canUseMediaCache() {
  return typeof window !== 'undefined'
    && typeof window.caches !== 'undefined'
    && typeof window.localStorage !== 'undefined'
    && typeof window.URL !== 'undefined';
}

function hashString(value) {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function readManifest() {
  if (!canUseMediaCache()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MEDIA_MANIFEST_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeManifest(entries) {
  if (!canUseMediaCache()) return;
  try {
    window.localStorage.setItem(MEDIA_MANIFEST_KEY, JSON.stringify(entries));
  } catch (error) {
    console.warn('[MediaCache] Manifest write skipped:', error);
  }
}

function getStableMediaId(src) {
  if (!src || typeof src !== 'string' || src.startsWith('blob:') || src.startsWith('data:')) return null;

  try {
    const url = new URL(src, window.location.origin);
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    const stablePath = `${url.origin}${url.pathname}`;
    return hashString(stablePath);
  } catch {
    return hashString(`local:${src}`);
  }
}

function getCacheUrl(src, cacheKey) {
  const id = getStableMediaId(cacheKey || src);
  return id ? `${window.location.origin}/__tcd_media_cache__/${id}` : null;
}

function looksCacheableImage(src, contentType = '') {
  if (!src || src.startsWith('blob:') || src.startsWith('data:')) return false;
  if (contentType.toLowerCase().startsWith('image/')) return true;

  try {
    const { pathname, hostname } = new URL(src, window.location.origin);
    return /\.(avif|gif|jpe?g|png|webp|svg)$/i.test(pathname)
      || pathname.includes('/storage/v1/object/')
      || hostname.includes('supabase.co')
      || hostname.includes('dicebear.com');
  } catch {
    return false;
  }
}

async function trimMediaCache(cache) {
  let manifest = readManifest()
    .filter(entry => entry?.cacheUrl)
    .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));

  let totalBytes = manifest.reduce((sum, entry) => sum + Number(entry.size || 0), 0);
  const keep = [];
  const remove = [];

  for (const entry of manifest) {
    const wouldExceedCount = keep.length >= MAX_MEDIA_ENTRIES;
    const wouldExceedBytes = totalBytes > MAX_MEDIA_BYTES && keep.length > 0;
    if (wouldExceedCount || wouldExceedBytes) {
      remove.push(entry);
      totalBytes -= Number(entry.size || 0);
    } else {
      keep.push(entry);
    }
  }

  await Promise.allSettled(remove.map(entry => cache.delete(entry.cacheUrl)));
  writeManifest(keep);
}

export async function getCachedMediaObjectUrl(src, { cacheKey } = {}) {
  if (!canUseMediaCache()) return null;
  const cacheUrl = getCacheUrl(src, cacheKey);
  if (!cacheUrl) return null;

  try {
    const cache = await window.caches.open(MEDIA_CACHE_NAME);
    const response = await cache.match(cacheUrl);
    if (!response) return null;

    const blob = await response.blob();
    if (!blob || blob.size === 0) return null;

    const now = Date.now();
    const manifest = readManifest().map(entry => entry.cacheUrl === cacheUrl
      ? { ...entry, lastAccessed: now }
      : entry
    );
    writeManifest(manifest);

    return window.URL.createObjectURL(blob);
  } catch (error) {
    console.warn('[MediaCache] Read skipped:', error);
    return null;
  }
}

export async function cacheMediaSource(src, { cacheKey } = {}) {
  if (!canUseMediaCache() || !looksCacheableImage(src)) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const cacheUrl = getCacheUrl(src, cacheKey);
  if (!cacheUrl) return null;

  try {
    const response = await fetch(src, { cache: 'force-cache' });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !looksCacheableImage(src, contentType)) return null;

    const blob = await response.blob();
    if (!blob || blob.size === 0 || blob.size > MAX_SINGLE_MEDIA_BYTES) return null;

    const cache = await window.caches.open(MEDIA_CACHE_NAME);
    await cache.put(cacheUrl, new Response(blob, {
      headers: {
        'content-type': contentType || blob.type || 'application/octet-stream',
        'x-tcd-media-src': src,
        'x-tcd-cached-at': String(Date.now())
      }
    }));

    const now = Date.now();
    const manifest = readManifest().filter(entry => entry.cacheUrl !== cacheUrl);
    manifest.unshift({
      cacheUrl,
      size: blob.size,
      contentType: contentType || blob.type,
      cachedAt: now,
      lastAccessed: now
    });
    writeManifest(manifest);
    await trimMediaCache(cache);

    return cacheUrl;
  } catch (error) {
    console.warn('[MediaCache] Write skipped:', error);
    return null;
  }
}

export async function clearMediaCache() {
  if (!canUseMediaCache()) return;
  try {
    await window.caches.delete(MEDIA_CACHE_NAME);
    window.localStorage.removeItem(MEDIA_MANIFEST_KEY);
  } catch (error) {
    console.warn('[MediaCache] Clear skipped:', error);
  }
}
