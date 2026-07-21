/**
 * Supabase Free Tier currently rejects transformation query params in this app,
 * so keep the original URL stable for browser and app-level media caches.
 */
export function getOptimizedUrl(src) {
  return src || src;
}
