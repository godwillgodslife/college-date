import { supabase } from '../lib/supabase';

const recordedThisSession = new Set();

function cacheKey(entityType, entityId, source) {
    return `${entityType}:${entityId}:${source || 'unknown'}`;
}

export async function recordFeedImpression(entityType, entityId, source = 'feed', options = {}) {
    if (!entityType || !entityId) return { success: true };

    const key = cacheKey(entityType, entityId, source);
    if (!options.force && recordedThisSession.has(key)) {
        return { success: true, skipped: true };
    }

    recordedThisSession.add(key);

    try {
        const { data, error } = await supabase.rpc('record_feed_impression', {
            p_entity_type: entityType,
            p_entity_id: entityId,
            p_source: source,
            p_engaged: options.engaged === true
        });

        if (error) {
            recordedThisSession.delete(key);
            console.warn('recordFeedImpression skipped:', error.message);
            return { success: false, error: error.message };
        }

        return data || { success: true };
    } catch (err) {
        recordedThisSession.delete(key);
        console.warn('recordFeedImpression failed silently:', err.message);
        return { success: false, error: err.message };
    }
}

export async function recordFeedImpressions(entityType, entityIds = [], source = 'feed', options = {}) {
    const uniqueIds = [...new Set((entityIds || []).filter(Boolean))];
    if (uniqueIds.length === 0) return { success: true };

    const limit = options.limit || 16;
    const idsToRecord = uniqueIds.slice(0, limit);

    await Promise.allSettled(
        idsToRecord.map((entityId) => recordFeedImpression(entityType, entityId, source, options))
    );

    return { success: true };
}

export async function getFeedImpressionMap(userId, entityType, lookbackDays = 14) {
    if (!userId || !entityType) return new Map();

    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    try {
        const { data, error } = await supabase
            .from('feed_impressions')
            .select('entity_id,last_seen_at,seen_count,last_engaged_at')
            .eq('user_id', userId)
            .eq('entity_type', entityType)
            .gte('last_seen_at', since);

        if (error) throw error;
        return new Map((data || []).map(row => [row.entity_id, row]));
    } catch (err) {
        console.warn('getFeedImpressionMap skipped:', err.message);
        return new Map();
    }
}
