/**
 * Explore Filter Utilities
 * 
 * Centralizes filter calculation and normalization logic for Explore discovery.
 */

export const DEFAULT_EXPLORE_FILTERS = Object.freeze({
    gender: 'All',
    university: 'All',
    ageRange: Object.freeze([18, 50])
});

/**
 * Creates a fresh, mutable default filter state for Explore
 * @returns {{ gender: string, university: string, ageRange: [number, number] }}
 */
export function createDefaultExploreFilters() {
    return {
        gender: 'All',
        university: 'All',
        ageRange: [18, 50]
    };
}

/**
 * Calculates the number of non-default filters actively applied in Explore
 * 
 * Default criteria:
 * - gender: 'All'
 * - university / school: 'All' or 'All Universities'
 * - ageRange: [18, 50]
 * - liveOnly: false
 * 
 * @param {Object} [filters] - Filter state object
 * @returns {number} Active filter count
 */
export function calculateActiveFilterCount(filters) {
    if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
        return 0;
    }

    let count = 0;

    // 1. Gender Filter: active if defined and not 'all'
    if (typeof filters.gender === 'string') {
        const trimmed = filters.gender.trim().toLowerCase();
        if (trimmed !== '' && trimmed !== 'all') {
            count += 1;
        }
    }

    // 2. University / School Filter: active if defined and not 'all' / 'all universities'
    const uniVal = typeof filters.university === 'string' ? filters.university : (typeof filters.school === 'string' ? filters.school : null);
    if (uniVal) {
        const trimmed = uniVal.trim().toLowerCase();
        if (trimmed !== '' && trimmed !== 'all' && trimmed !== 'all universities') {
            count += 1;
        }
    }

    // 3. Age Range Filter: active if valid numbers and non-standard range [18, 50]
    if (Array.isArray(filters.ageRange) && filters.ageRange.length >= 2) {
        const minAge = Number(filters.ageRange[0]);
        const maxAge = Number(filters.ageRange[1]);
        if (!Number.isNaN(minAge) && !Number.isNaN(maxAge)) {
            if (minAge !== 18 || maxAge !== 50) {
                count += 1;
            }
        }
    }

    // 4. Live Only Filter (if present)
    if (filters.liveOnly === true) {
        count += 1;
    }

    return count;
}
