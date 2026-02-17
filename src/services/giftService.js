import { supabase } from '../lib/supabase';

/**
 * Fetch available gifts
 */
export async function getGifts() {
    const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .order('price', { ascending: true });
    return { data, error };
}

/**
 * Send a gift (Process transaction)
 */
export async function sendGift(senderId, receiverId, giftId) {
    try {
        const { data, error } = await supabase.rpc('process_gift_purchase', {
            sender_id: senderId,
            receiver_id: receiverId,
            gift_id: giftId
        });

        if (error) throw error;

        // RPC returns JSONB with success/error
        if (!data.success) {
            throw new Error(data.error || 'Failed to send gift');
        }

        return { data, error: null };
    } catch (error) {
        console.error('Error sending gift:', error);
        return { data: null, error: error.message };
    }
}
