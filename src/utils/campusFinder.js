export const FINDER_FREE_SEARCHES_DEFAULT = 2;
export const FINDER_RATE_LIMIT_HOURLY = 5;

export function getFinderStatusCacheKey(userId) {
    return ['finder_status', userId || 'anon'];
}

export function getFinderFallbackMessage() {
    return 'No confident match found. Try another photo or explore people around your campus.';
}

/**
 * Sanitizes and formats error messages so that technical database/schema
 * exceptions are masked into clean, reassuring user-facing copy.
 */
export function formatFinderErrorMessage(rawError) {
    if (!rawError) return 'Could not complete the search at this time.';
    if (typeof rawError !== 'string') return 'Could not complete the search at this time.';

    // Keep friendly validation, permission, and limit messages
    if (
        rawError.includes('Hourly search limit') ||
        rawError.includes('searches remaining') ||
        rawError.includes('free Campus Finder searches') ||
        rawError.includes('weekly') ||
        rawError.includes('top up') ||
        rawError.includes('Internet connection') ||
        rawError.includes('Photo capture') ||
        rawError.includes('Camera permission') ||
        rawError.includes('No searches remaining') ||
        rawError.includes('temporarily unavailable')
    ) {
        return rawError;
    }

    // Mask PostgreSQL relational errors (e.g. relation "public.blocks" does not exist)
    if (/relation|does not exist|syntax error|column|table|violates|constraint|pg_|public\./i.test(rawError)) {
        return 'Campus search is temporarily unavailable. Please try again in a few moments.';
    }

    return rawError;
}

