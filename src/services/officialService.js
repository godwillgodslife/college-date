// Lazy Supabase client resolver to maintain unit-test portability and SSR safety
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
    } catch (e) {
        return null;
    }
}

// ============================================================================
// OFFICIAL THE COLLEGE DATE - SERVICE LAYER
// ============================================================================

export const OFFICIAL_CATEGORIES = [
    { id: 'all', label: 'All Guides', icon: '🌟' },
    { id: 'getting_started', label: 'Getting Started', icon: '🚀' },
    { id: 'swiping', label: 'Swiping & Quota', icon: '👆' },
    { id: 'requests', label: 'Requests & Admirers', icon: '💌' },
    { id: 'chat', label: 'Chat & Audio Notes', icon: '💬' },
    { id: 'premium', label: '11 Premium Benefits', icon: '👑' },
    { id: 'wallet', label: 'Student Wallet & Friday Payouts', icon: '💰' },
    { id: 'confessions', label: 'Campus Confessions & Ask', icon: '🎭' },
];

export const VALID_ACTION_DEEP_LINKS = [
    '/match',
    '/requests',
    '/chat',
    '/premium',
    '/wallet',
    '/confessions',
    '/settings',
    '/profile',
    '/status',
    '/snap',
];

// Offline & resilient fallback tutorials mirroring database seed
export const FALLBACK_OFFICIAL_POSTS = [
    {
        id: '10000000-0000-0000-0000-000000000001',
        post_type: 'tutorial',
        category: 'getting_started',
        title: 'How Matching Works on Campus',
        caption: 'Swipe right when you feel the campus vibe ❤️. When there is mutual interest, it is an instant match! No awkward pressure, no ghost accounts.',
        video_url: '/tutorials/tut_matching.webm',
        thumbnail_url: '/tutorials/tut_matching_thumb.webp',
        aspect_ratio: '9:16',
        duration_seconds: 18,
        action_label: 'Start Swiping Now',
        action_deep_link: '/match',
        is_pinned: true,
        display_order: 1,
        min_app_version: '2.2.58',
        view_count: 342,
        is_published: true,
        published_at: '2026-09-19T00:00:00Z',
    },
    {
        id: '10000000-0000-0000-0000-000000000002',
        post_type: 'tutorial',
        category: 'swiping',
        title: 'Direct Card Swiping & Daily Quota',
        caption: 'Feel the fluid 1:1 direct finger tracking! Free accounts get 20 daily campus swipes that reset daily. Keep discovery authentic and high-quality.',
        video_url: '/tutorials/tut_swiping.webm',
        thumbnail_url: '/tutorials/tut_swiping_thumb.webp',
        aspect_ratio: '9:16',
        duration_seconds: 20,
        action_label: 'Explore Campus Cards',
        action_deep_link: '/match',
        is_pinned: true,
        display_order: 2,
        min_app_version: '2.2.58',
        view_count: 528,
        is_published: true,
        published_at: '2026-09-19T00:00:00Z',
    },
    {
        id: '10000000-0000-0000-0000-000000000003',
        post_type: 'tutorial',
        category: 'requests',
        title: 'Connection Requests & Secret Admirers',
        caption: 'Right-swipes appear in your Requests tab. Free students can accept up to 3 admirers every day for free. Additional admirers are locked safely until you upgrade.',
        video_url: '/tutorials/tut_requests.webm',
        thumbnail_url: '/tutorials/tut_requests_thumb.webp',
        aspect_ratio: '9:16',
        duration_seconds: 22,
        action_label: 'Check My Requests',
        action_deep_link: '/requests',
        is_pinned: false,
        display_order: 3,
        min_app_version: '2.2.58',
        view_count: 219,
        is_published: true,
        published_at: '2026-09-19T00:00:00Z',
    },
    {
        id: '10000000-0000-0000-0000-000000000004',
        post_type: 'tutorial',
        category: 'chat',
        title: 'WhatsApp-Grade Chat & Voice Notes',
        caption: 'Break the ice with high-clarity WebM voice notes, 10s chat video snippets, quick emoji reactions, live campus location pins, and safe meetup spots.',
        video_url: '/tutorials/tut_chat.webm',
        thumbnail_url: '/tutorials/tut_chat_thumb.webp',
        aspect_ratio: '9:16',
        duration_seconds: 24,
        action_label: 'Open Messages',
        action_deep_link: '/chat',
        is_pinned: false,
        display_order: 4,
        min_app_version: '2.2.58',
        view_count: 412,
        is_published: true,
        published_at: '2026-09-19T00:00:00Z',
    },
    {
        id: '10000000-0000-0000-0000-000000000005',
        post_type: 'tutorial',
        category: 'premium',
        title: '11 Elite Benefits of Premium',
        caption: 'Unlock unlimited right-swipes, unlimited campus finder scans, unlimited admirer accepts, 10s video messages in chat, profile viewers, and instant visibility boosts.',
        video_url: '/tutorials/tut_premium.webm',
        thumbnail_url: '/tutorials/tut_premium_thumb.webp',
        aspect_ratio: '9:16',
        duration_seconds: 25,
        action_label: 'View Premium Benefits',
        action_deep_link: '/premium',
        is_pinned: false,
        display_order: 5,
        min_app_version: '2.2.58',
        view_count: 673,
        is_published: true,
        published_at: '2026-09-19T00:00:00Z',
    },
    {
        id: '10000000-0000-0000-0000-000000000006',
        post_type: 'tutorial',
        category: 'wallet',
        title: 'Student Earnings & Friday Bank Payouts',
        caption: 'Earn from campus gift tips and student referrals. Track your pending balance and withdraw directly to your Nigerian bank account every Friday!',
        video_url: '/tutorials/tut_wallet.webm',
        thumbnail_url: '/tutorials/tut_wallet_thumb.webp',
        aspect_ratio: '9:16',
        duration_seconds: 20,
        action_label: 'Open Student Wallet',
        action_deep_link: '/wallet',
        is_pinned: false,
        display_order: 6,
        min_app_version: '2.2.58',
        view_count: 388,
        is_published: true,
        published_at: '2026-09-19T00:00:00Z',
    }
];

const CACHE_KEY_OFFICIAL_POSTS = 'cd_official_posts_cache_v1';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const VIEW_DEDUPE_PREFIX = 'cd_viewed_official_post_';

/**
 * Fetch official posts with cache-first and resilient fallback strategy.
 * @param {string} [category] - Optional category filter ('all' or specific category)
 * @param {Object} [options] - Options like limit, forceRefresh
 * @returns {Promise<{posts: Array, fromCache: boolean, isFallback: boolean}>}
 */
export async function getOfficialPosts(category = 'all', options = {}) {
    const { limit = 50, forceRefresh = false } = options;

    // Check localStorage cache if not forcing refresh
    if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
        try {
            const cached = window.localStorage.getItem(`${CACHE_KEY_OFFICIAL_POSTS}_${category}`);
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(data) && data.length > 0) {
                    return { posts: data, fromCache: true, isFallback: false };
                }
            }
        } catch (e) {
            console.warn('[OfficialService] Cache read error:', e);
        }
    }

    try {
        const sb = await getSupabase();
        if (sb) {
            const { data, error } = await sb.rpc('get_official_posts', {
                p_category: category === 'all' ? null : category,
                p_limit: limit,
            });

            if (!error && Array.isArray(data) && data.length > 0) {
                // Write to cache
                if (typeof window !== 'undefined' && window.localStorage) {
                    try {
                        window.localStorage.setItem(
                            `${CACHE_KEY_OFFICIAL_POSTS}_${category}`,
                            JSON.stringify({ data, timestamp: Date.now() })
                        );
                    } catch (e) {
                        console.warn('[OfficialService] Cache write error:', e);
                    }
                }
                return { posts: data, fromCache: false, isFallback: false };
            }

            // If RPC failed or returned empty, query directly from official_posts table
            let query = sb
                .from('official_posts')
                .select('*')
                .eq('is_published', true)
                .order('is_pinned', { ascending: false })
                .order('display_order', { ascending: true })
                .order('published_at', { ascending: false })
                .limit(limit);

            if (category && category !== 'all') {
                query = query.eq('category', category);
            }

            const { data: directData, error: directError } = await query;
            if (!directError && Array.isArray(directData) && directData.length > 0) {
                return { posts: directData, fromCache: false, isFallback: false };
            }
        }
    } catch (err) {
        console.warn('[OfficialService] Remote fetch failed, using fallback:', err);
    }

    // Resilient fallback filtering
    let fallbackData = FALLBACK_OFFICIAL_POSTS;
    if (category && category !== 'all') {
        fallbackData = fallbackData.filter(p => p.category === category);
    }
    return { posts: fallbackData, fromCache: false, isFallback: true };
}

/**
 * Increment view count for an official post with client-side deduplication (1 view per 10 mins).
 * @param {string} postId - UUID of the official post
 */
export async function incrementOfficialPostView(postId) {
    if (!postId) return;

    // Deduplicate in sessionStorage / localStorage
    const dedupeKey = `${VIEW_DEDUPE_PREFIX}${postId}`;
    if (typeof window !== 'undefined' && window.sessionStorage) {
        if (window.sessionStorage.getItem(dedupeKey)) {
            return; // Already viewed this session
        }
        window.sessionStorage.setItem(dedupeKey, '1');
    }

    try {
        const sb = await getSupabase();
        if (sb) {
            await sb.rpc('increment_official_post_view', { p_post_id: postId });
        }
    } catch (err) {
        // Non-blocking fire-and-forget
        console.debug('[OfficialService] View count increment skipped:', err);
    }
}

/**
 * Validate whether a deep link is an accepted internal app destination.
 * @param {string} link - Proposed route
 * @returns {boolean}
 */
export function isValidDeepLink(link) {
    if (!link || typeof link !== 'string') return false;
    const cleanPath = link.split('?')[0].split('#')[0];
    return VALID_ACTION_DEEP_LINKS.some(allowed => cleanPath.startsWith(allowed));
}

// ============================================================================
// ADMIN CRUD METHODS
// ============================================================================

export async function adminCreateOfficialPost(postData) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database client unavailable');
    const { data: { user } } = await sb.auth.getUser();
    const payload = {
        ...postData,
        created_by: user?.id || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await sb
        .from('official_posts')
        .insert([payload])
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function adminUpdateOfficialPost(postId, updates) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database client unavailable');
    const { data, error } = await sb
        .from('official_posts')
        .update({
            ...updates,
            updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function adminDeleteOfficialPost(postId) {
    const sb = await getSupabase();
    if (!sb) throw new Error('Database client unavailable');
    const { error } = await sb
        .from('official_posts')
        .delete()
        .eq('id', postId);

    if (error) throw error;
    return true;
}

export async function adminTogglePublish(postId, isPublished) {
    return adminUpdateOfficialPost(postId, { is_published: isPublished });
}

export async function adminTogglePin(postId, isPinned) {
    return adminUpdateOfficialPost(postId, { is_pinned: isPinned });
}
