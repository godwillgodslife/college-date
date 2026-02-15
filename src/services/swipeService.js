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

        // 2. DISCOVERY BOOST: Find users who sent a PREMIUM swipe to this user
        // These should be shown first as they are high-value interactions
        const { data: premiumSentToMe } = await supabase
            .from('swipes')
            .select('swiper_id')
            .eq('swiped_id', userId)
            .eq('type', 'premium')
            .eq('status', 'pending');

        const priorityInboundIds = (premiumSentToMe || []).map(s => s.swiper_id);

        // 3. Fetch profiles with filters (Join with wallets for Top Seeker status)
        let query = supabase
            .from('profiles')
            .select(`
                *,
                wallets (total_spent)
            `);

        // Exclude swiped profiles and self
        if (swipedIds.length > 0) {
            // PostgREST "in" requires parentheses: in.(id1,id2)
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

        // Limit results
        query = query.limit(40); // Increased limit to allow more room for sorting

        const { data: profiles, error: profilesError } = await query;

        if (profilesError) throw profilesError;

        // 4. SORTING LOGIC: Prioritize those in priorityInboundIds
        const sortedProfiles = (profiles || []).sort((a, b) => {
            const aIsPriority = priorityInboundIds.includes(a.id);
            const bIsPriority = priorityInboundIds.includes(b.id);
            if (aIsPriority && !bIsPriority) return -1;
            if (!aIsPriority && bIsPriority) return 1;
            return 0;
        });

        // 5. Flatten wallet data and add Top Seeker flag
        const finalProfiles = sortedProfiles.map(p => {
            // wallets is an array when joining via inverse FK
            const wallet = Array.isArray(p.wallets) ? p.wallets[0] : p.wallets;
            const totalSpent = wallet?.total_spent || 0;
            return {
                ...p,
                total_spent: totalSpent,
                is_top_seeker: totalSpent >= 15000 // Elite spender badge
            };
        });

        return { data: finalProfiles, error: null };
    } catch (err) {
        console.error('getDiscoverProfiles exception:', err);
        return { data: [], error: err.message || 'Internal Service Error' };
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
