import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';
import { recordFeedImpression } from './feedImpressionService';
import { getProfilePhotos, normalizeProfile } from '../utils/profileData';
import { getUltraAllowance, consumeUltraSuperSwipe } from './ultraAllowanceService';

const PROFILE_IMPRESSION_LOOKBACK_DAYS = 14;

function hoursSince(value) {
    if (!value) return Infinity;
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) return Infinity;
    return (Date.now() - timestamp) / (1000 * 60 * 60);
}

function stableJitter(seed) {
    const text = String(seed || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash |= 0;
    }
    return (Math.abs(hash) % 1000) / 1000;
}

export async function fetchExcludedConnectionIds(userId) {
    if (!userId) return [];
    try {
        const [matchesRes, pendingSwipesRes] = await Promise.all([
            supabase
                .from('matches')
                .select('user1_id,user2_id')
                .or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
            supabase
                .from('swipes')
                .select('swiper_id,swiped_id')
                .or(`swiper_id.eq.${userId},swiped_id.eq.${userId}`)
                .eq('status', 'pending')
        ]);

        const matchedIds = (matchesRes.data || [])
            .flatMap(m => [m.user1_id, m.user2_id]);

        const pendingIds = (pendingSwipesRes.data || [])
            .flatMap(s => [s.swiper_id, s.swiped_id]);

        return [...new Set([...matchedIds, ...pendingIds])]
            .filter(id => id && id !== userId);
    } catch (err) {
        console.warn('fetchExcludedConnectionIds skipped:', err.message);
        return [];
    }
}

async function fetchMatchedProfileIds(userId) {
    return fetchExcludedConnectionIds(userId);
}

async function fetchFeedImpressionMap(userId, entityType) {
    if (!userId) return new Map();
    const since = new Date(Date.now() - PROFILE_IMPRESSION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

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
        console.warn('fetchFeedImpressionMap skipped:', err.message);
        return new Map();
    }
}

function getDiscoveryScore(profile, impression, userId, filters, userProfile) {
    const currentGender = (userProfile?.gender || '').toLowerCase();
    const profileGender = (profile.gender || '').toLowerCase();
    const oppositeGender = currentGender === 'male' ? 'female' : currentGender === 'female' ? 'male' : '';
    const sameUniversity = userProfile?.university && profile.university === userProfile.university;

    let score = 0;

    if (filters.gender && filters.gender !== 'All') {
        score += 60;
    } else if (oppositeGender && profileGender === oppositeGender) {
        score += 160;
    } else if (oppositeGender) {
        score -= 35;
    }

    if (sameUniversity) score += 45;
    score += Math.min(100, Number(profile.completion_score || 0)) * 0.7;

    const lastSeenHours = hoursSince(profile.last_seen_at || profile.last_active);
    if (lastSeenHours <= 1) score += 40;
    else if (lastSeenHours <= 24) score += 28;
    else if (lastSeenHours <= 24 * 7) score += 16;

    const createdHours = hoursSince(profile.created_at);
    if (createdHours <= 24 * 7) score += 24;

    const photoUpdatedHours = hoursSince(profile.photo_updated_at);
    if (photoUpdatedHours <= 24 * 14) score += 18;

    if (filters.category === 'Live' || filters.liveOnly) {
        score += Math.max(0, 50 - lastSeenHours);
    }

    if (impression) {
        const impressionHours = hoursSince(impression.last_seen_at);
        if (impressionHours <= 1) score -= 500;
        else if (impressionHours <= 6) score -= 350;
        else if (impressionHours <= 24) score -= 220;
        else if (impressionHours <= 72) score -= 120;
        else if (impressionHours <= 24 * 7) score -= 60;
        else score -= 20;

        score -= Math.min(90, Number(impression.seen_count || 0) * 12);
    }

    score += stableJitter(`${userId}:${profile.id}`) * 28;
    return score;
}

function applyDiscoveryFreshness(results, impressionMap, userId, filters, userProfile) {
    return [...results].sort((a, b) => {
        const bScore = getDiscoveryScore(b, impressionMap.get(b.id), userId, filters, userProfile);
        const aScore = getDiscoveryScore(a, impressionMap.get(a.id), userId, filters, userProfile);
        return bScore - aScore;
    });
}

// Minimum profile count required for single-campus pool before expanding cross-campus
export const CAMPUS_LIQUIDITY_MIN_THRESHOLD = 15;

// Helper to get profiles for discovery with filters
export async function getDiscoverProfiles(userId, filters = {}, userProfile = null) {
    try {
        const currentUserGender = userProfile?.gender;
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const cooldownHours = isLocal ? 0.16 : 48; // 10 mins for local dev, 48h for prod
        const resetBuffer = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();

        const { data: swipedData, error: swipesError } = await supabase
            .from('swipes')
            .select('swiped_id')
            .eq('swiper_id', userId)
            .or(`direction.eq.right,and(direction.eq.left,created_at.gt.${resetBuffer})`);

        if (swipesError) throw swipesError;

        const [matchedProfileIds, profileImpressions] = await Promise.all([
            fetchMatchedProfileIds(userId),
            fetchFeedImpressionMap(userId, 'profile')
        ]);

        const excludeIds = filters.includeSwiped
            ? []
            : (swipedData || []).map(swipe => swipe.swiped_id).filter(Boolean);

        // ALWAYS exclude matched connections and pending requests from both Match and Explore
        matchedProfileIds.forEach(id => excludeIds.push(id));
        if (userId) excludeIds.push(userId);
        const uniqueExcludeIds = [...new Set(excludeIds)];

        // 2. Fetch profiles from the new discovery view (v3)
        let query = supabase
            .from('discovery_feed_v3')
            .select('*')
            // GATEKEEPING: Only show profiles that have at least one photo
            .or('avatar_url.not.is.null,profile_photos.not.eq.{}');

        // Exclude swiped profiles and self
        if (uniqueExcludeIds.length > 0) {
            // Standard PostgREST 'in' syntax for UUIDs: (uuid1,uuid2,...)
            query = query.not('id', 'in', `(${uniqueExcludeIds.join(',')})`);
        }

        // Apply Gender Filter
        if (filters.gender && filters.gender !== 'All') {
            const targetGender = filters.gender.toLowerCase() === 'men' ? 'male' : filters.gender.toLowerCase() === 'women' ? 'female' : filters.gender.toLowerCase();
            query = query.eq('gender', targetGender);
        } else if (!filters.gender && currentUserGender) {
            // Default swipe deck discovery (when no explicit filter is set): opposite gender
            const norm = currentUserGender.toLowerCase();
            const oppositeGender = norm === 'male' ? 'female' : norm === 'female' ? 'male' : null;
            if (oppositeGender) {
                query = query.eq('gender', oppositeGender);
            }
        }

        // Apply University Filter
        if (filters.university && filters.university !== 'All') {
            query = query.eq('university', filters.university);
        }

        // Apply Age Filter
        if (filters.ageRange) {
            const [min, max] = filters.ageRange;
            if (min) query = query.gte('age', min);
            if (max) query = query.lte('age', max);
        }

        // CATEGORY FILTERING (New)
        if (filters.category === 'Serious') {
            query = query.in('attraction_goal', ['Serious', 'Serious Relationship']);
        } else if (filters.category === 'Casual') {
            query = query.in('attraction_goal', ['Casual', 'Just Vibes']);
        } else if (filters.category === 'Newest') {
            query = query.order('created_at', { ascending: false });
        } else if (filters.category === 'Trending') {
            query = query.order('completion_score', { ascending: false });
        } else if (filters.category === 'Near Me') {
            // Near Me defaults to same university
            if (userProfile?.university) {
                query = query.eq('university', userProfile.university);
            }
        }

        // Live Mode (preserved as a capability)
        if (filters.category === 'Live' || filters.liveOnly) {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            query = query
                .or(`is_online.eq.true,is_live.eq.true,last_seen.gte.${fiveMinutesAgo}`);
        }

        query = query
            .order('completion_score', { ascending: false });

        query = query.limit(60);

        const { data: profiles, error: profilesError } = await query;

        if (profilesError) throw profilesError;

        let results = (profiles || [])
            .filter(profile => !profile.is_shadow_banned && !profile.is_banned)
            .map(profile => {
                const normalizedProfile = normalizeProfile(profile);
                delete normalizedProfile.email;
                delete normalizedProfile.phone;
                delete normalizedProfile.onesignal_id;
                return {
                    ...normalizedProfile,
                    profile_photos: getProfilePhotos(normalizedProfile)
                };
            })
            .filter(profile => profile.profile_photos && profile.profile_photos.length > 0);

        // ── GENDER GATEKEEPING: Authoritative opposite-gender matching ──────────
        if (currentUserGender) {
            const norm = (currentUserGender || '').toLowerCase();
            const oppositeGender = norm === 'male' ? 'female' : 'male';
            if (!filters.gender) {
                results = results.filter(p => (p.gender || '').toLowerCase() === oppositeGender);
            } else if (filters.gender !== 'All') {
                const targetGender = filters.gender.toLowerCase() === 'men' ? 'male' : filters.gender.toLowerCase() === 'women' ? 'female' : filters.gender.toLowerCase();
                results = results.filter(p => (p.gender || '').toLowerCase() === targetGender);
            }
        }

        // ── CAMPUS LIQUIDITY & COLD-START EXPANSION ─────────────────────────
        // If the user's selected campus has fewer than 15 profiles, expand discovery
        // across other campuses so students never encounter a ghost-town deck.
        const CAMPUS_LIQUIDITY_MIN_THRESHOLD = 15;
        if (filters.university && filters.university !== 'All' && results.length < CAMPUS_LIQUIDITY_MIN_THRESHOLD) {
            try {
                const existingIds = new Set(results.map(p => p.id));
                const combinedExcludeIds = [...new Set([...uniqueExcludeIds, ...Array.from(existingIds)])];

                let fallbackQuery = supabase
                    .from('discovery_feed_v3')
                    .select('*')
                    .or('avatar_url.not.is.null,profile_photos.not.eq.{}')
                    .neq('university', filters.university);

                if (combinedExcludeIds.length > 0) {
                    fallbackQuery = fallbackQuery.not('id', 'in', `(${combinedExcludeIds.join(',')})`);
                }

                if (filters.gender && filters.gender !== 'All') {
                    const targetGender = filters.gender.toLowerCase() === 'men' ? 'male' : filters.gender.toLowerCase() === 'women' ? 'female' : filters.gender.toLowerCase();
                    fallbackQuery = fallbackQuery.eq('gender', targetGender);
                } else if (!filters.gender && currentUserGender) {
                    const norm = currentUserGender.toLowerCase();
                    const oppositeGender = norm === 'male' ? 'female' : norm === 'female' ? 'male' : null;
                    if (oppositeGender) {
                        fallbackQuery = fallbackQuery.eq('gender', oppositeGender);
                    }
                }

                if (filters.ageRange) {
                    const [min, max] = filters.ageRange;
                    if (min) fallbackQuery = fallbackQuery.gte('age', min);
                    if (max) fallbackQuery = fallbackQuery.lte('age', max);
                }

                fallbackQuery = fallbackQuery.order('completion_score', { ascending: false }).limit(60 - results.length);

                const { data: fallbackProfiles, error: fallbackError } = await fallbackQuery;
                if (!fallbackError && Array.isArray(fallbackProfiles) && fallbackProfiles.length > 0) {
                    let filteredFallback = fallbackProfiles
                        .filter(p => !p.is_shadow_banned && !p.is_banned && !existingIds.has(p.id))
                        .map(p => {
                            const normalized = normalizeProfile(p);
                            return {
                                ...normalized,
                                profile_photos: getProfilePhotos(normalized),
                                isExpandedCampus: true,
                                is_expanded_campus: true
                            };
                        })
                        .filter(p => p.profile_photos && p.profile_photos.length > 0);

                    // Strictly preserve gender gatekeeping on fallback profiles
                    if (currentUserGender) {
                        const norm = (currentUserGender || '').toLowerCase();
                        const oppositeGender = norm === 'male' ? 'female' : 'male';
                        if (!filters.gender) {
                            filteredFallback = filteredFallback.filter(p => (p.gender || '').toLowerCase() === oppositeGender);
                        } else if (filters.gender !== 'All') {
                            const targetGender = filters.gender.toLowerCase() === 'men' ? 'male' : filters.gender.toLowerCase() === 'women' ? 'female' : filters.gender.toLowerCase();
                            filteredFallback = filteredFallback.filter(p => (p.gender || '').toLowerCase() === targetGender);
                        }
                    }

                    results = [...results, ...filteredFallback];
                }
            } catch (fallbackErr) {
                console.warn('Campus liquidity expansion fallback error (non-fatal):', fallbackErr);
            }
        }

        // ── Geo Proximity: Live Near Me ───────────────────────────────────
        if (filters.liveOnly && userProfile?.university) {
            // Stability check: Only reorder within the already mixed results if it doesn't break top priority too much
            // Actually, keep it simple: push university matches slightly higher but don't break the first row
            const topRow = results.slice(0, 4);
            const remaining = results.slice(4);
            remaining.sort((a, b) => {
                if (a.university === userProfile.university && b.university !== userProfile.university) return -1;
                if (b.university === userProfile.university && a.university !== userProfile.university) return 1;
                return 0;
            });
            results = [...topRow, ...remaining];
        }

        // ── PRIORITIZATION: same University ───────────────────────
        if (!filters.liveOnly && userProfile?.university) {
            // Instead of a hard sort that kills gender mixing, we promote university matches
            // but ONLY within the existing gender groups or with a small boost.
            // For now, let's keep the first 8 opposite-gender profiles as "True North"
            const topGuard = results.slice(0, 8);
            const rest = results.slice(8);
            
            // Re-sort the rest stably by university
            rest.sort((a, b) => {
                if (a.university === userProfile.university && b.university !== userProfile.university) return -1;
                if (b.university === userProfile.university && a.university !== userProfile.university) return 1;
                return 0;
            });

            results = [...topGuard, ...rest];
        }

        // ── SPOTLIGHT ROTATION: First 3 cards = hottest/newest ───────────
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        
        // Ensure Spotlight only takes opposite gender for the top slots
        const oppositeGender = (currentUserGender || '').toLowerCase() === 'male' ? 'female' : 'male';
        
        const spotlightPool = results.filter(p =>
            ((p.photo_updated_at && new Date(p.photo_updated_at).getTime() > sevenDaysAgo) ||
            (p.completion_score >= 80)) && 
            (currentUserGender ? (p.gender || '').toLowerCase() === oppositeGender : true)
        );
        
        const regularPool = results.filter(p => !spotlightPool.find(s => s.id === p.id));

        const spotlightSlots = spotlightPool.slice(0, 3);
        results = [
            ...spotlightSlots,
            ...regularPool,
            ...spotlightPool.slice(3) 
        ];

        if (filters.category === 'Newest') {
            results.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        } else if (filters.category === 'Trending') {
            results.sort((a, b) => (b.completion_score || 0) - (a.completion_score || 0));
        } else {
            results = applyDiscoveryFreshness(results, profileImpressions, userId, filters, userProfile);
        }
        results = results.slice(0, 40);

        return { data: results, error: null };
    } catch (err) {
        console.error('getDiscoverProfiles exception:', err);
        return { data: [], error: err.message || 'Internal Service Error' };
    }
}


/**
 * Check and increment swipe limit for free users
 */
export async function checkSwipeLimit(userId) {
    try {
        // Use the new RPC to check and handle reset automatically
        const { data, error } = await supabase.rpc('check_and_reset_swipe_limit', {
            p_user_id: userId
        });

        if (error) throw error;

        // data is an array of one row [ { can_swipe, used_count, max_count } ]
        const result = Array.isArray(data) ? data[0] : data;

        // CRITICAL BUG FIX: If user has used 0 swipes, they MUST be able to swipe.
        // This handles cases where brand new accounts might trigger the limit RPC incorrectly.
        const usedCount = result.used_count || 0;
        const maxCount = result.max_count || 20;
        const canSwipe = usedCount === 0 ? true : result.can_swipe;

        return {
            canSwipe: canSwipe,
            used: usedCount,
            max: maxCount
        };
    } catch (err) {
        console.error('checkSwipeLimit error:', err);
        return { canSwipe: true, used: 0, max: 20 }; // Fallback to allow if error
    }
}

// Record a swipe (like/pass)
export async function recordSwipe(swiperId, swipedId, direction, swipeType = 'standard', messageTeaser = null, options = {}) {
    try {
        const isPremiumStandardSwipe = direction === 'right' && swipeType === 'standard' && options.isPremium === true;

        // 1. Record the swipe in the database (Initially PENDING)
        // Use UPSERT to allow profile recycling (Infinite Discovery)
        const { data: swipeRecord, error } = await supabase
            .from('swipes')
            .upsert({
                swiper_id: swiperId,
                swiped_id: swipedId,
                direction: direction, // 'right' or 'left'
                type: swipeType,
                status: direction === 'right' ? 'pending' : 'declined',
                is_priority: swipeType === 'premium',
                is_free: isPremiumStandardSwipe,
                message_teaser: messageTeaser,
                created_at: new Date().toISOString() // Refresh timestamp for recycling logic
            }, {
                onConflict: 'swiper_id,swiped_id' // NO SPACE
            })
            .select()
            .single();

        if (error) {
            console.error('Upsert failed:', error.message);
            throw error;
        }

        recordFeedImpression('profile', swipedId, 'swipe', { engaged: true }).catch(() => {});

        // 2. Update Streak (Atomic RPC)
        const { data: streakResult } = await supabase.rpc('update_swipe_streak', { p_user_id: swiperId });

        // 3. Monetization: If it's a LIKE ('right')
        let paymentResult = null;
        if (direction === 'right') {
            console.log(`Processing ${swipeType.toUpperCase()} swipe...`);

            if (isPremiumStandardSwipe) {
                paymentResult = { success: true, type: 'premium_free' };
            } else {
                const paymentArgs = {
                    p_swiper_id: swiperId,
                    p_swiped_id: swipedId,
                    p_swipe_type: swipeType
                };
                const clientOperationId = options.clientOperationId || options.client_operation_id;
                const paymentWithOperationArgs = clientOperationId
                    ? { ...paymentArgs, p_client_operation_id: clientOperationId }
                    : paymentArgs;

                let { data, error: paymentError } = await supabase.rpc('process_swipe_payment', paymentWithOperationArgs);

                const signatureMismatch = paymentError?.message?.includes('Could not find the function')
                    || paymentError?.message?.includes('schema cache');
                if (signatureMismatch && clientOperationId) {
                    if (options.requireIdempotentPayment === true) {
                        throw new Error('Offline paid swipe sync requires the idempotent payment RPC migration.');
                    }
                    ({ data, error: paymentError } = await supabase.rpc('process_swipe_payment', paymentArgs));
                }

                paymentResult = data;

                if (paymentError) throw paymentError;
            }

            // Check if payment actually succeeded
            if (paymentResult && paymentResult.success === false) {
                // If payment failed, we actually want to undo the swipe status or just report it
                // To keep it simple, we throw a specific error the UI can catch
                throw new Error(paymentResult.error || 'Insufficient balance');
            }
        }

        // 4. CHECK FOR MATCH (Mutual Like)
        const { data: mutualLike } = await supabase
            .from('swipes')
            .select('id')
            .eq('swiper_id', swipedId)
            .eq('swiped_id', swiperId)
            .eq('direction', 'right')
            .maybeSingle();

        const isMatch = !!mutualLike;
        if (isMatch) {
            // IT'S A MATCH! 
            // 1. Create persistent match record if it doesn't exist
            const participants = [swiperId, swipedId].sort();
            const { data: newMatch, error: matchError } = await supabase
                .from('matches')
                .upsert({
                    user_ids: participants,
                    user1_id: participants[0],
                    user2_id: participants[1],
                    created_at: new Date().toISOString()
                }, { onConflict: 'user1_id,user2_id' })
                .select('id')
                .single();

            if (matchError) {
                console.warn('Persistent match creation error:', matchError.message);
            }
            
            const matchId = newMatch?.id;

            // 2. Notify both users about the match
            await Promise.allSettled([
                createNotification({
                    userId: swipedId,
                    actorId: swiperId,
                    type: 'match',
                    title: '🔥 It\'s a Match!',
                    content: 'You have a new connection! Say hello.',
                    category: 'matches',
                    entityType: 'match',
                    entityId: matchId,
                    conversationId: matchId,
                    matchId,
                    deepLink: matchId ? `/chat?chatId=${matchId}` : '/chat',
                    priority: 'high',
                    groupKey: `match:${matchId || participants.join(':')}`,
                    dedupeKey: `match:${matchId || participants.join(':')}:${swipedId}`,
                    metadata: { match_id: matchId, url: '/chat' }
                }),
                createNotification({
                    userId: swiperId,
                    actorId: swipedId,
                    type: 'match',
                    title: '🔥 It\'s a Match!',
                    content: 'You have a new connection! Say hello.',
                    category: 'matches',
                    entityType: 'match',
                    entityId: matchId,
                    conversationId: matchId,
                    matchId,
                    deepLink: matchId ? `/chat?chatId=${matchId}` : '/chat',
                    priority: 'high',
                    groupKey: `match:${matchId || participants.join(':')}`,
                    dedupeKey: `match:${matchId || participants.join(':')}:${swiperId}`,
                    metadata: { match_id: matchId, url: '/chat' }
                })
            ]);

            return {
                data: swipeRecord,
                isMatch: true,
                match_id: matchId, // Confirmed ID from DB
                streak: streakResult?.streak,
                type: (paymentResult && paymentResult.type) || (direction === 'right' ? 'standard' : 'pass'),
                error: null
            };
        }

        // 5. If it's a LIKE but NOT a Match, notify User B (Standard/Premium request sent)
        if (direction === 'right' && !isMatch) {
            // It's a fire-and-forget notification
            createNotification({
                userId: swipedId,
                actorId: swiperId,
                type: 'like',
                title: 'New Like! 👀',
                content: swipeType === 'premium' ? 'Someone sent you a premium request!' : 'Someone just right-swiped you. Check your requests!',
                category: 'requests',
                entityType: 'swipe',
                entityId: swipeRecord.id,
                deepLink: '/requests',
                priority: swipeType === 'premium' ? 'high' : 'normal',
                groupKey: `requests:${swipedId}`,
                dedupeKey: `like:${swipeRecord.id}`,
                metadata: { swipe_id: swipeRecord.id, url: '/requests' }
            }).catch(e => console.warn('Notification failed silently:', e));
        }

        return {
            data: swipeRecord,
            isMatch: false,
            streak: streakResult?.streak,
            type: (paymentResult && paymentResult.type) || (direction === 'right' ? 'standard' : 'pass'),
            error: null
        };
    } catch (err) {
        console.error('recordSwipe Critical Error:', err);
        return { data: null, isMatch: false, error: err.message || 'Payment or Database constraint failed' };
    }
}


/**
 * Accept a connection request (Female action)
 */
export async function acceptRequest(swipeId) {
    try {
        const { data, error } = await supabase.rpc('accept_swipe_request', {
            p_swipe_id: swipeId
        });
        if (error) throw error;
        return { data, error: null };
    } catch (err) {
        console.error('acceptRequest error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Decline a request
 */
export async function declineRequest(swipeId) {
    try {
        const { error } = await supabase
            .from('swipes')
            .update({ status: 'declined' })
            .eq('id', swipeId);
        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('declineRequest error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Track a profile view in Discovery.
 * This is a best-effort, fire-and-forget operation — it NEVER throws or blocks the UI.
 */
export async function trackProfileView(viewerId, ownerId, source = 'discovery') {
    if (!viewerId || !ownerId || viewerId === ownerId) return { success: true };
    try {
        const { error } = await supabase
            .from('profile_views')
            .insert({
                viewer_id: viewerId,
                profile_owner_id: ownerId,
                source: source
            });

        if (error) {
            console.warn('trackProfileView (non-critical):', error.message);
        }
    } catch (err) {
        console.warn('trackProfileView (silent):', err.message);
    }
    return { success: true };
}


// Check if a match exists (mutual like) and create an entry in 'matches' table
export async function checkMatch(userId, targetId) {
    try {
        // 1. Check if target user has liked current user
        // .maybeSingle() returns null (not an error) when no row is found
        const { data: mutualLike, error: swipeError } = await supabase
            .from('swipes')
            .select('id')
            .eq('swiper_id', targetId)
            .eq('swiped_id', userId)
            .eq('direction', 'right')
            .maybeSingle();

        if (swipeError) throw swipeError;

        const isMatch = !!mutualLike;

        // 2. If it's a match, create a persistent record in the 'matches' table
        if (isMatch) {
            console.log('Mutual like found! Creating persistent match record...');

            // We use a sorted array of IDs to ensure uniqueness (e.g., [A, B] is same as [B, A])
            const participants = [userId, targetId].sort();

            const { error: matchError } = await supabase
                .from('matches')
                .upsert({
                    user_ids: participants,
                    user1_id: participants[0],
                    user2_id: participants[1],
                    created_at: new Date().toISOString()
                }, { onConflict: 'user1_id,user2_id' });

            if (matchError) {
                console.warn('Could not create persistent match record (table might not exist):', matchError.message);
                // We still return isMatch: true because the mutual like happened!
            }
        }

        return { isMatch, error: null };
    } catch (err) {
        console.error('checkMatch error:', err.message);
        return { isMatch: false, error: err.message };
    }
}

/**
 * Super Swipe: Consume an allowance or credit, record the swipe, and notify the target
 */
export async function superSwipe(swiperId, swipedProfile, options = {}) {
    try {
        const subscription = options.subscription || null;
        let swipeId = null;
        let consumedFromUltra = false;

        // 1. Check if swiper has an active Elite Ultra allowance with remaining Super Swipes
        const ultraStatus = getUltraAllowance(swiperId, subscription);
        if (ultraStatus.isUltra && ultraStatus.superSwipes.remaining > 0) {
            const ultraResult = await consumeUltraSuperSwipe(swiperId, subscription);
            if (ultraResult.success) {
                consumedFromUltra = true;
                // Record the swipe as an authoritative right swipe with super_swipe metadata
                const { data: recordResult, error: recordError } = await recordSwipe(
                    swiperId,
                    swipedProfile.id,
                    'right',
                    { isSuperSwipe: true, source: 'ultra_allowance' }
                );
                if (recordError) throw new Error(recordError);
                swipeId = recordResult?.id || `ultra-ss-${Date.now()}`;
            }
        }

        // 2. If not consumed from Ultra allowance, consume from purchased boost credits via database RPC
        if (!consumedFromUltra) {
            const { data: useResult, error: rpcError } = await supabase.rpc('send_super_swipe', {
                p_target_id: swipedProfile.id
            });

            if (rpcError) throw rpcError;
            if (!useResult.success) {
                return { data: null, error: useResult.error };
            }
            swipeId = useResult.swipe_id;
        }

        recordFeedImpression('profile', swipedProfile.id, 'super_swipe', { engaged: true }).catch(() => {});

        // Send immediate notification to the swiped user
        await createNotification({
            userId: swipedProfile.id,
            actorId: swiperId,
            type: 'super_swipe',
            title: '⭐ Super Swipe!',
            content: 'Someone sent you a Super Swipe! They really want to connect with you.',
            category: 'requests',
            entityType: 'swipe',
            entityId: swipeId,
            deepLink: '/requests',
            priority: 'high',
            groupKey: `requests:${swipedProfile.id}`,
            dedupeKey: `super_swipe:${swipeId}`,
            metadata: {
                swipe_id: swipeId,
                swiper_id: swiperId,
                url: '/requests',
                source: consumedFromUltra ? 'ultra_allowance' : 'purchased_credit'
            }
        });

        return {
            data: {
                id: swipeId,
                source: consumedFromUltra ? 'ultra_allowance' : 'purchased_credit'
            },
            error: null
        };
    } catch (err) {
        console.error('superSwipe error:', err.message);
        return { data: null, error: err.message };
    }
}


/**
 * Reset all swipes for a user (Dev/Test only)
 */
export async function resetDiscovery(userId) {
    try {
        const { error } = await supabase
            .from('swipes')
            .delete()
            .eq('swiper_id', userId);

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('resetDiscovery error:', err.message);
        return { success: false, error: err.message };
    }
}

/**
 * Search profiles by name, username, university, faculty, or department across the entire campus.
 * Automatically excludes the current user and blocked accounts.
 */
export async function searchProfilesByName(searchQuery, currentUserId = null, userProfile = null, options = {}) {
    if (!searchQuery || !searchQuery.trim()) return [];
    
    // 1. Sanitize term for PostgREST .or() filter (strip special characters that break syntax)
    const rawTerm = searchQuery.trim();
    const cleanTerm = rawTerm.replace(/[,()"'[\]\\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanTerm) return [];

    try {
        let blockedIds = [];
        if (currentUserId) {
            try {
                const { data: blocks } = await supabase
                    .from('user_blocks')
                    .select('blocked_id, blocker_id')
                    .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);
                if (blocks) {
                    blockedIds = blocks.map(b => b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id);
                }
            } catch (blockErr) {
                console.warn('[SwipeService] Error fetching blocks for search:', blockErr);
            }
        }
        
        // Exclude only self and blocked users (do NOT exclude matches or admirers)
        const excludeList = [currentUserId, ...blockedIds].filter(Boolean);

        const buildColumnFilters = (keyword) => [
            `full_name.ilike.%${keyword}%`,
            `username.ilike.%${keyword}%`,
            `university.ilike.%${keyword}%`,
            `faculty.ilike.%${keyword}%`,
            `department.ilike.%${keyword}%`
        ].join(',');

        const executeSearchQuery = async (filterString) => {
            let q = supabase
                .from('profiles')
                .select('id, full_name, username, gender, age, university, faculty, department, level, bio, avatar_url, photos, profile_photos, interests, intro_prompt, voice_intro_url, anthem, attraction_goal, is_verified, photo_verified, completion_score, photo_updated_at, updated_at, created_at, video_url, is_ultra, is_live, last_seen, last_seen_at, last_active, location_status, current_badge')
                .eq('is_shadow_banned', false)
                .eq('is_banned', false)
                .or(filterString)
                .limit(50);

            if (excludeList.length > 0) {
                q = q.not('id', 'in', `(${excludeList.join(',')})`);
            }

            // Apply explicit gender filter if provided by caller (e.g. from Explore filter drawer)
            const genderFilter = options?.gender;
            if (genderFilter && genderFilter !== 'All') {
                const targetGender = genderFilter.toLowerCase() === 'men' ? 'male' : genderFilter.toLowerCase() === 'women' ? 'female' : genderFilter.toLowerCase();
                q = q.eq('gender', targetGender);
            }

            return await q;
        };

        // Phase 1: Try clean full-phrase search
        let { data, error } = await executeSearchQuery(buildColumnFilters(cleanTerm));
        if (error) throw error;

        // Phase 2: If no matches (or compound query), execute multi-token fallback
        const tokens = cleanTerm.split(' ').filter(w => w.length >= 2);
        if ((!data || data.length === 0) && tokens.length > 1) {
            const multiFilter = tokens.map(t => buildColumnFilters(t)).join(',');
            const multiRes = await executeSearchQuery(multiFilter);
            if (multiRes.data && multiRes.data.length > 0) {
                // Prioritize profiles matching all tokens across profile fields
                const allTokenMatches = multiRes.data.filter(row => {
                    const rowText = `${row.full_name || ''} ${row.username || ''} ${row.university || ''} ${row.faculty || ''} ${row.department || ''}`.toLowerCase();
                    return tokens.every(token => rowText.includes(token.toLowerCase()));
                });
                data = allTokenMatches.length > 0 ? allTokenMatches : multiRes.data;
            }
        }

        return (data || [])
            .filter(row => !row.is_shadow_banned && !row.is_banned)
            .map(row => {
                const normalized = normalizeProfile(row);
                delete normalized.email;
                delete normalized.phone;
                delete normalized.onesignal_id;
                return {
                    ...normalized,
                    profile_photos: getProfilePhotos(normalized)
                };
            })
            // Accept profiles that have avatar_url OR photos OR profile_photos
            .filter(row => {
                const hasProfilePhotos = Array.isArray(row.profile_photos) && row.profile_photos.length > 0;
                const hasPhotos = Array.isArray(row.photos) && row.photos.length > 0;
                const hasAvatar = Boolean(row.avatar_url && row.avatar_url.trim());
                return hasProfilePhotos || hasPhotos || hasAvatar;
            })
            .sort((a, b) => (hasActivePremium(b) ? 1 : 0) - (hasActivePremium(a) ? 1 : 0));
    } catch (err) {
        console.error('[SwipeService] searchProfilesByName error:', err);
        return [];
    }
}

/**
 * Send a Paid Chat Vibe (₦500) to another student
 * Deducts exactly ₦500 from sender wallet, activates conversation, and records transaction.
 */
export async function sendChatVibe(recipientId) {
    try {
        const { data, error } = await supabase.rpc('send_chat_vibe', {
            p_recipient_id: recipientId
        });
        if (error) throw error;
        if (!data?.success) {
            throw new Error(data?.error || 'Failed to send Chat Vibe');
        }
        return { data, error: null };
    } catch (err) {
        console.error('[SwipeService] sendChatVibe error:', err);
        return { data: null, error: err.message || 'Failed to send Chat Vibe' };
    }
}

/**
 * Check if an active match already exists between two users
 */
export async function getExistingMatchWithUser(currentUserId, otherUserId) {
    if (!currentUserId || !otherUserId) return null;
    try {
        const { data, error } = await supabase
            .from('matches')
            .select('id')
            .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUserId})`)

            .maybeSingle();
        if (error || !data) return null;
        return data;
    } catch (err) {
        console.warn('[SwipeService] getExistingMatchWithUser error:', err);
        return null;
    }
}

