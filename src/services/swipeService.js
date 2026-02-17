import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';

// Helper to get profiles for discovery with filters
export async function getDiscoverProfiles(userId, filters = {}) {
    try {
        // 1. Get IDs of users already swiped by current user
        const { data: swipedData, error: swipesError } = await supabase
            .from('swipes')
            .select('swiped_id')
            .eq('swiper_id', userId);

        if (swipesError) throw swipesError;

        const swipedIds = swipedData.map(swipe => swipe.swiped_id).filter(Boolean);
        // Also exclude self
        if (userId) swipedIds.push(userId);

        // 2. Fetch profiles from the new discovery view (v3)
        let query = supabase
            .from('discovery_feed_v3')
            .select('*');

        // Exclude swiped profiles and self
        if (swipedIds.length > 0) {
            query = query.not('id', 'in', `(${swipedIds.join(',')})`);
        }

        // Apply Gender Filter
        if (filters.gender && filters.gender !== 'All') {
            query = query.eq('gender', filters.gender);
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

        // Sort by Visibility Score (Dynamic Rotation)
        query = query.order('visibility_score', { ascending: false });

        // Limit results
        query = query.limit(40);

        const { data: profiles, error: profilesError } = await query;

        if (profilesError) throw profilesError;

        return { data: profiles || [], error: null };
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
        // 1. Get subscription and limit
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan_type')
            .eq('user_id', userId)
            .single();

        if (sub?.plan_type === 'Premium') return { canSwipe: true };

        // 2. Get current limit
        const { data: limit, error } = await supabase
            .from('swipe_limits')
            .select('swipes_used')
            .eq('user_id', userId)
            .single();

        if (error) throw error;

        if (limit.swipes_used >= 10) {
            return { canSwipe: false, used: limit.swipes_used, max: 10 };
        }

        // 3. Increment limit
        await supabase
            .from('swipe_limits')
            .update({ swipes_used: limit.swipes_used + 1 })
            .eq('user_id', userId);

        return { canSwipe: true, used: limit.swipes_used + 1, max: 10 };
    } catch (err) {
        console.error('checkSwipeLimit error:', err);
        return { canSwipe: true }; // Fallback to allow swiping if error
    }
}

// Record a swipe (like/pass)
export async function recordSwipe(swiperId, swipedId, direction, swipeType = 'standard', messageTeaser = null) {
    try {
        // 1. Record the swipe in the database (Initially PENDING)
        const { data: swipeRecord, error } = await supabase
            .from('swipes')
            .insert({
                swiper_id: swiperId,
                swiped_id: swipedId,
                direction: direction, // 'right' or 'left'
                type: swipeType,
                status: direction === 'right' ? 'pending' : 'declined', // If left, it's basically a decline
                is_priority: swipeType === 'premium',
                message_teaser: messageTeaser
            })
            .select()
            .single();

        if (error) throw error;

        // 2. Monetization (Phase 3 Upgrade): If it's a LIKE ('right')
        if (direction === 'right') {
            console.log(`Processing ${swipeType.toUpperCase()} swipe...`);

            const { data: result, error: rpcError } = await supabase.rpc('process_swipe_payment', {
                swiper_id: swiperId,
                swiped_id: swipedId,
                swipe_type: swipeType
            });

            if (rpcError) {
                console.error('Monetization Error:', rpcError.message);
            } else if (!result.success) {
                console.warn('Monetization Failed:', result.error);
                // In production, we might want to flag this swipe for review or revert
            }
        }

        return { data: swipeRecord, error: null };
    } catch (err) {
        console.error('recordSwipe error:', err.message);
        return { data: null, error: err.message };
    }
}

/**
 * Accept a connection request (Female action)
 */
export async function acceptRequest(swipeId) {
    try {
        const { data, error } = await supabase.rpc('accept_swipe_request', {
            swipe_id: swipeId
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
 * Track a profile view in Discovery
 */
export async function trackProfileView(viewerId, ownerId, source = 'discovery') {
    try {
        if (!viewerId || !ownerId || viewerId === ownerId) return { success: true };

        const { error } = await supabase
            .from('profile_views')
            .insert({
                viewer_id: viewerId,
                profile_owner_id: ownerId,
                source: source
            });

        if (error) throw error;
        return { success: true };
    } catch (err) {
        console.error('trackProfileView error:', err.message);
        return { success: false, error: err.message };
    }
}


// Check if a match exists (mutual like) and create an entry in 'matches' table
export async function checkMatch(userId, targetId) {
    try {
        // 1. Check if target user has liked current user
        const { data: mutualLike, error: swipeError } = await supabase
            .from('swipes')
            .select('*')
            .eq('swiper_id', targetId)
            .eq('swiped_id', userId)
            .eq('direction', 'right')
            .single();

        if (swipeError && swipeError.code !== 'PGRST116') throw swipeError;

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
 * Super Swipe: Consume a credit, record the swipe, and notify the target
 */
export async function superSwipe(swiperId, swipedProfile) {
    try {
        // 1. Consume a super swipe credit
        const { data: useResult, error: rpcError } = await supabase.rpc('use_super_swipe', {
            p_user_id: swiperId
        });

        if (rpcError) throw rpcError;
        if (!useResult.success) {
            return { data: null, error: useResult.error };
        }

        // 2. Record the swipe as a right swipe with 'super_swipe' type
        const { data: swipeRecord, error: swipeError } = await supabase
            .from('swipes')
            .insert({
                swiper_id: swiperId,
                swiped_id: swipedProfile.id,
                direction: 'right',
                type: 'super_swipe',
                status: 'pending',
                is_priority: true
            })
            .select()
            .single();

        if (swipeError) throw swipeError;

        // 3. Send immediate notification to the swiped user
        await createNotification({
            userId: swipedProfile.id,
            actorId: swiperId,
            type: 'super_swipe',
            title: '⭐ Super Swipe!',
            content: 'Someone sent you a Super Swipe! They really want to connect with you.',
            metadata: { swipe_id: swipeRecord.id, swiper_id: swiperId }
        });

        return { data: swipeRecord, error: null };
    } catch (err) {
        console.error('superSwipe error:', err.message);
        return { data: null, error: err.message };
    }
}
