// Lazy resolver for Supabase and platform tools to maintain Node.js unit-test portability, SSR safety, and offline resilience
let _supabaseClient = null;
async function getSupabase() {
    if (_supabaseClient) return _supabaseClient;
    if (typeof window !== 'undefined' && window.__supabase) {
        _supabaseClient = window.__supabase;
        return _supabaseClient;
    }
    try {
        const mod = await import('../lib/supabase.js');
        _supabaseClient = mod.supabase;
        return _supabaseClient;
    } catch {
        return null;
    }
}

async function getIsNativePlatform() {
    try {
        const mod = await import('../lib/secureAuthStorage.js');
        return mod.isNativePlatform ? mod.isNativePlatform() : false;
    } catch {
        return false;
    }
}

async function safeEnqueueOfflineOperation(userId, op) {
    try {
        const mod = await import('../lib/offlineQueue.js');
        if (mod.enqueueOfflineOperation) {
            mod.enqueueOfflineOperation(userId, op);
        }
    } catch (err) {
        console.warn('[PolicyService] Offline queue unavailable:', err);
    }
}

export const CURRENT_APP_VERSION = '2.2.61';

export const CURRENT_POLICY_VERSIONS = {
    terms: '2.0',
    privacy: '2.0',
    safety: '1.0',
    child_safety: '1.0',
    marketplace: '1.0'
};

const POLICY_CACHE_PREFIX = 'tcd_policy_acceptances:';

function getCacheKey(userId) {
    return `${POLICY_CACHE_PREFIX}${userId || 'anonymous'}`;
}

function getCachedPolicies(userId) {
    if (typeof window === 'undefined' || !window.localStorage || !userId) return {};
    try {
        const raw = window.localStorage.getItem(getCacheKey(userId));
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function savePolicyToCache(userId, policyId, version) {
    if (typeof window === 'undefined' || !window.localStorage || !userId) return;
    try {
        const current = getCachedPolicies(userId);
        current[policyId] = {
            version,
            accepted_at: new Date().toISOString()
        };
        window.localStorage.setItem(getCacheKey(userId), JSON.stringify(current));
    } catch (err) {
        console.warn('[PolicyService] Cache save skipped:', err);
    }
}

/**
 * Record acceptance of a specific policy version.
 * Works online and queues when offline.
 */
export async function recordPolicyAcceptance(policyId, version, metadata = {}) {
    try {
        const supabase = await getSupabase();
        if (!supabase) {
            return { success: false, error: 'Database client unavailable' };
        }

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        if (!userId) {
            return { success: false, error: 'User must be authenticated to record policy acceptance' };
        }

        const isNative = await getIsNativePlatform();
        const platform = isNative ? 'android' : 'web';
        const targetVersion = version || CURRENT_POLICY_VERSIONS[policyId] || '1.0';

        // Update local cache immediately for optimistic UI
        savePolicyToCache(userId, policyId, targetVersion);

        // Offline guard
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            await safeEnqueueOfflineOperation(userId, {
                id: `policy_acceptance:${userId}:${policyId}:${targetVersion}`,
                type: 'record_policy_acceptance',
                payload: {
                    policyId,
                    version: targetVersion,
                    platform,
                    appVersion: CURRENT_APP_VERSION,
                    metadata
                }
            });
            return { success: true, offlineQueued: true };
        }

        const { data, error } = await supabase.rpc('record_policy_acceptance', {
            p_policy_id: policyId,
            p_version: targetVersion,
            p_platform: platform,
            p_app_version: CURRENT_APP_VERSION,
            p_metadata: metadata
        });

        if (error) {
            console.warn('[PolicyService] RPC failed, enqueuing offline retry:', error);
            await safeEnqueueOfflineOperation(userId, {
                id: `policy_acceptance:${userId}:${policyId}:${targetVersion}`,
                type: 'record_policy_acceptance',
                payload: {
                    policyId,
                    version: targetVersion,
                    platform,
                    appVersion: CURRENT_APP_VERSION,
                    metadata
                },
                lastError: error.message
            });
            return { success: true, offlineQueued: true };
        }

        return { success: true, data };
    } catch (err) {
        console.error('[PolicyService] recordPolicyAcceptance error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Fetch all accepted policies for a user.
 * Reads local cache first, then synchronizes with backend.
 */
export async function getUserAcceptedPolicies(userId) {
    if (!userId) return { data: [], error: null };

    // 1. Instant cache return
    const cached = getCachedPolicies(userId);

    try {
        const supabase = await getSupabase();
        if (!supabase) {
            const cachedArray = Object.entries(cached).map(([policy_id, info]) => ({
                policy_id,
                version: info.version,
                accepted_at: info.accepted_at
            }));
            return { data: cachedArray, error: null };
        }

        const { data, error } = await supabase.rpc('get_user_accepted_policies', {
            p_user_id: userId
        });

        if (error) {
            console.warn('[PolicyService] get_user_accepted_policies fallback to cache:', error);
            const cachedArray = Object.entries(cached).map(([policy_id, info]) => ({
                policy_id,
                version: info.version,
                accepted_at: info.accepted_at
            }));
            return { data: cachedArray, error: null };
        }

        const acceptedList = data?.accepted_policies || [];
        // Update cache with fresh database records
        acceptedList.forEach((item) => {
            savePolicyToCache(userId, item.policy_id, item.version);
        });

        return { data: acceptedList, error: null };
    } catch (err) {
        console.error('[PolicyService] getUserAcceptedPolicies error:', err);
        return { data: [], error: err.message };
    }
}

/**
 * Fast synchronous check against cached policies.
 */
export function hasAcceptedPolicy(userId, policyId, minimumVersion = null) {
    if (!userId) return false;
    const cached = getCachedPolicies(userId);
    const policy = cached[policyId];
    if (!policy || !policy.version) return false;

    if (minimumVersion) {
        return parseFloat(policy.version) >= parseFloat(minimumVersion);
    }
    return true;
}

/**
 * Query whether the current user has any pending mandatory policy re-acceptances.
 */
export async function getPendingPolicyRequirements(userId) {
    if (!userId) return { hasPending: false, pendingPolicies: [] };

    try {
        const supabase = await getSupabase();
        if (!supabase) {
            return { hasPending: false, pendingPolicies: [], error: 'Supabase client unavailable' };
        }

        const { data, error } = await supabase.rpc('get_pending_policy_requirements', {
            p_user_id: userId
        });

        if (error) {
            return { hasPending: false, pendingPolicies: [], error: error.message };
        }

        return {
            hasPending: Boolean(data?.has_pending),
            pendingPolicies: data?.pending_policies || [],
            error: null
        };
    } catch (err) {
        console.error('[PolicyService] getPendingPolicyRequirements error:', err);
        return { hasPending: false, pendingPolicies: [], error: err.message };
    }
}
