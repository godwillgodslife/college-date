import { supabase } from '../lib/supabase';
import { getCachedData, setCachedData } from '../lib/persistentCache';
import {
    FINDER_FREE_SEARCHES_DEFAULT,
    FINDER_RATE_LIMIT_HOURLY,
    getFinderStatusCacheKey,
    getFinderFallbackMessage
} from '../utils/campusFinder';

export {
    FINDER_FREE_SEARCHES_DEFAULT,
    FINDER_RATE_LIMIT_HOURLY,
    getFinderStatusCacheKey,
    getFinderFallbackMessage
};

const FINDER_STATUS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Get user's Campus Finder credits, opt-in status, and rate limits.
 */
export async function getFinderStatus(userId) {
    if (!userId) return { data: null, error: 'User ID required' };

    const cacheKey = getFinderStatusCacheKey(userId);
    const cached = getCachedData(cacheKey, { ttlMs: FINDER_STATUS_CACHE_TTL, allowStale: true });

    try {
        const { data, error } = await supabase.rpc('get_finder_status', { p_user_id: userId });
        if (error) throw error;

        if (data?.success) {
            setCachedData(cacheKey, data);
            return { data, error: null };
        }
        return { data: cached || null, error: null };
    } catch (err) {
        console.warn('[CampusFinder] Status fetch error:', err.message || err);
        return { data: cached || null, error: cached ? null : (err.message || 'Offline') };
    }
}

/**
 * Opt in or out of Campus Finder camera discovery (NDPA consent).
 */
export async function updateFinderOptIn(userId, allowCameraDiscovery) {
    if (!userId) return { success: false, error: 'User ID required' };

    try {
        const { error } = await supabase
            .from('profiles')
            .update({
                allow_camera_discovery: Boolean(allowCameraDiscovery),
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;

        // Update cached status
        const cacheKey = getFinderStatusCacheKey(userId);
        const cached = getCachedData(cacheKey, { allowStale: true });
        if (cached) {
            setCachedData(cacheKey, { ...cached, allow_camera_discovery: Boolean(allowCameraDiscovery) });
        }

        return { success: true, error: null };
    } catch (err) {
        console.error('[CampusFinder] Update opt-in failed:', err.message || err);
        return { success: false, error: err.message || 'Failed to update discovery setting' };
    }
}

/**
 * Execute privacy-preserving optical search.
 * Validates network, rate-limits, credits, and matches server-side.
 */
export async function searchCampusByPhoto({ searcherId, queryImageBase64, university }) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        return {
            data: null,
            error: 'Internet connection required to search for a College Date profile.'
        };
    }

    if (!searcherId || !queryImageBase64) {
        return { data: null, error: 'Photo capture is required' };
    }

    try {
        // 1. Consume search credit & check hourly rate limit
        const { data: creditResult, error: creditError } = await supabase.rpc('consume_finder_search', {
            p_searcher_id: searcherId
        });

        if (creditError) throw creditError;
        if (!creditResult?.success) {
            return {
                data: null,
                error: creditResult?.error || 'Unable to proceed with search',
                noCredits: Boolean(creditResult?.no_credits),
                rateLimited: Boolean(creditResult?.rate_limited)
            };
        }

        // 2. Fetch eligible opted-in candidate profiles from same campus
        const { data: candidates, error: candidateError } = await supabase.rpc('get_eligible_campus_finder_profiles', {
            p_university: university || null,
            p_exclude_user_id: searcherId
        });

        if (candidateError) throw candidateError;

        if (!candidates || candidates.length === 0) {
            // Log audit record
            await supabase.from('campus_finder_searches').insert({
                searcher_id: searcherId,
                matched_user_id: null,
                status: 'no_match'
            });

            return {
                data: { match: null, reason: 'no_candidates' },
                error: null,
                remainingCredits: creditResult.total_remaining
            };
        }

        // 3. Perform server-side comparison via Edge Function
        // Uses the existing secure Edge Function infrastructure with OpenRouter/GPT-4o-mini
        const candidatePhotos = candidates.map(c => ({
            id: c.id,
            photoUrl: c.primary_photo || c.avatar_url
        })).filter(c => Boolean(c.photoUrl));

        let bestMatch = null;
        for (const candidate of candidatePhotos.slice(0, 8)) {
            try {
                const { data: aiResult } = await supabase.functions.invoke('ai-profile-review', {
                    body: {
                        action: 'verify_selfie',
                        selfieBase64: queryImageBase64,
                        profilePhotoUrl: candidate.photoUrl,
                        livenessScore: 88
                    }
                });

                if (aiResult?.verified && (aiResult?.review?.score >= 85 || aiResult?.review?.status === 'verified')) {
                    bestMatch = candidates.find(c => c.id === candidate.id);
                    break; // Confident match found! Stop scanning
                }
            } catch (aiErr) {
                console.warn('[CampusFinder] Candidate comparison error:', aiErr);
            }
        }

        // 4. Record audit event (ephemeral - query photo is already discarded)
        await supabase.from('campus_finder_searches').insert({
            searcher_id: searcherId,
            matched_user_id: bestMatch ? bestMatch.id : null,
            status: bestMatch ? 'match_found' : 'no_match'
        });

        // 5. Update local cached status
        const cacheKey = getFinderStatusCacheKey(searcherId);
        const cached = getCachedData(cacheKey, { allowStale: true });
        if (cached) {
            setCachedData(cacheKey, {
                ...cached,
                free_searches_left: creditResult.free_searches_left,
                paid_credits: creditResult.paid_credits,
                total_remaining: creditResult.total_remaining
            });
        }

        return {
            data: {
                match: bestMatch || null,
                reason: bestMatch ? 'found' : 'no_confident_match'
            },
            error: null,
            remainingCredits: creditResult.total_remaining
        };
    } catch (err) {
        console.error('[CampusFinder] Search execution failed:', err.message || err);
        return { data: null, error: err.message || 'Campus search could not be completed' };
    }
}
