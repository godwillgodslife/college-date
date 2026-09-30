export const FINDER_FREE_SEARCHES_DEFAULT = 2;
export const FINDER_RATE_LIMIT_HOURLY = 5;

export function getFinderStatusCacheKey(userId) {
    return ['finder_status', userId || 'anon'];
}

export function getFinderFallbackMessage() {
    return 'No confident match found. Try another photo or explore people around your campus.';
}
