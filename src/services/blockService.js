import { supabase } from '../lib/supabase';

/**
 * Block a user server-side.
 */
export async function blockUser(blockedId) {
    try {
        const { data, error } = await supabase.rpc('block_user', {
            p_blocked_id: blockedId
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to block user');
        return { success: true, error: null };
    } catch (err) {
        console.error('blockUser error:', err);
        return { success: false, error: err.message || 'Error blocking user' };
    }
}

/**
 * Unblock a user server-side.
 */
export async function unblockUser(blockedId) {
    try {
        const { data, error } = await supabase.rpc('unblock_user', {
            p_blocked_id: blockedId
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to unblock user');
        return { success: true, error: null };
    } catch (err) {
        console.error('unblockUser error:', err);
        return { success: false, error: err.message || 'Error unblocking user' };
    }
}

/**
 * Fetch list of blocked users for the current authenticated user.
 */
export async function getBlockedUsers() {
    try {
        const { data, error } = await supabase.rpc('get_blocked_users');
        if (error) throw error;
        return { data: data?.data || [], error: null };
    } catch (err) {
        console.error('getBlockedUsers error:', err);
        return { data: [], error: err.message || 'Error loading blocked users' };
    }
}
