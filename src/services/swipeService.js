import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';

// Helper to get profiles for discovery with filters
export async function getDiscoverProfiles(userId, filters = {}, currentUserGender = null) {
    try {
        // 1. Get IDs to EXCLUDE:
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

        const { data: swipedData, error: swipesError } = await supabase
            .from('swipes')
            .select('swiped_id')
            .eq('swiper_id', userId)
            .or(`direction.eq.right,and(direction.eq.left,created_at.gt.${fortyEightHoursAgo})`);

        if (swipesError) throw swipesError;

        const excludeIds = swipedData.map(swipe => swipe.swiped_id).filter(Boolean);
        if (userId) excludeIds.push(userId);

        // 2. Fetch profiles from the new discovery view (v3)
        let query = supabase
            .from('discovery_feed_v3')
            .select('*');

        // Exclude swiped profiles and self
        if (excludeIds.length > 0) {
            query = query.not('id', 'in', `(${excludeIds.join(',')})`);
        }

        // Apply Gender Filter (or default 90/10 ratio bias)
        if (filters.gender && filters.gender !== 'All') {
            // User manually set a filter — respect it exactly
            query = query.eq('gender', filters.gender.toLowerCase());
        } else if (currentUserGender) {
            // Default: show opposite gender 90% by ordering opposite gender first
            const oppositeGender = currentUserGender === 'male' ? 'female' : 'male';
            query = query.order('gender', { ascending: currentUserGender === 'female' }); // female=false means males first for female users
            // We pull more results then sort client-side for true 90/10 mix
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

        // LIVE MODE FILTERING (New)
        if (filters.liveOnly) {
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
            query = query.or(`is_live.eq.true,last_seen_at.gt.${oneHourAgo}`);
        }

        if (filters.liveOnly) {
            query = query.order('is_live', { ascending: false });
        }

        query = query
            .order('completion_score', { ascending: false });

        query = query.limit(60); // Fetch more so ratio mixing works

        const { data: profiles, error: profilesError } = await query;

        if (profilesError) throw profilesError;

        let results = profiles || [];

        // Client-side 90/10 gender ratio mixing (when no manual filter set)
        if ((!filters.gender || filters.gender === 'All') && currentUserGender) {
            const oppositeGender = currentUserGender === 'male' ? 'female' : 'male';
            const preferred = results.filter(p => (p.gender || '').toLowerCase() === oppositeGender);
            const others = results.filter(p => (p.gender || '').toLowerCase() !== oppositeGender);

            // Interleave: 9 preferred + 1 other per 10 results
            const mixed = [];
            let pi = 0, oi = 0;
            while (pi < preferred.length || oi < others.length) {
                for (let i = 0; i < 9 && pi < preferred.length; i++) mixed.push(preferred[pi++]);
                if (oi < others.length) mixed.push(others[oi++]);
            }
            results = mixed.slice(0, 40);
        } else {
            results = results.slice(0, 40);
        }

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

        return {
            canSwipe: result.can_swipe,
            used: result.used_count,
            max: result.max_count
        };
    } catch (err) {
        console.error('checkSwipeLimit error:', err);
        return { canSwipe: true, used: 0, max: 20 }; // Fallback to allow if error
    }
}

// Record a swipe (like/pass)
export async function recordSwipe(swiperId, swipedId, direction, swipeType = 'standard', messageTeaser = null) {
    try {
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

        // 2. Update Streak (Atomic RPC)
        const { data: streakResult } = await supabase.rpc('update_swipe_streak', { p_user_id: swiperId });

        // 3. Monetization: If it's a LIKE ('right')
        let paymentResult = null;
        if (direction === 'right') {
            console.log(`Processing ${swipeType.toUpperCase()} swipe...`);

            const { data, error: paymentError } = await supabase.rpc('process_swipe_payment', {
                swiper_id: swiperId,
                swiped_id: swipedId,
                swipe_type: swipeType
            });

            paymentResult = data;

            if (paymentError) throw paymentError;

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
            .single();

        if (mutualLike) {
            // IT'S A MATCH! Return info for UI celebration
            return {
                data: swipeRecord,
                isMatch: true,
                streak: streakResult?.streak,
                type: (paymentResult && paymentResult.type) || (direction === 'right' ? 'standard' : 'pass'),
                error: null
            };
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
