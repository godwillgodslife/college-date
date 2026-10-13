import { supabase } from '../lib/supabase';
import { getAvatarUrl } from '../utils/profileData';

export const SERVICE_CATEGORIES = [
    { id: 'tutoring', label: 'Academic Tutoring & Assignments', icon: '📚' },
    { id: 'photography', label: 'Photography & Content Creation', icon: '📸' },
    { id: 'event_escort', label: 'Event Companion / Social Plus-One', icon: '🥂' },
    { id: 'errands', label: 'Campus Errands & Delivery', icon: '🛵' },
    { id: 'fitness', label: 'Fitness Training & Coaching', icon: '🏋️‍♂️' },
    { id: 'styling', label: 'Hair, Makeup & Fashion Styling', icon: '💄' },
    { id: 'tech', label: 'Laptop, Phone & Coding Tech Help', icon: '💻' },
    { id: 'other', label: 'Other Legitimate Campus Services', icon: '🤝' }
];

export async function proposeDeal({ matchId, title, description, category, amount, proposedDate = null, location = null, providerId = null }) {
    try {
        const { data, error } = await supabase.rpc('propose_service_deal', {
            p_match_id: matchId,
            p_title: title,
            p_description: description,
            p_category: category,
            p_amount: Number(amount),
            p_proposed_date: proposedDate,
            p_location: location,
            p_provider_id: providerId
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to propose deal');

        return { success: true, dealId: data.deal_id, messageId: data.message_id, error: null };
    } catch (err) {
        console.error('proposeDeal error:', err);
        return { success: false, error: err.message || 'Error proposing deal' };
    }
}

export async function counterOfferDeal(dealId, newAmount, note = '') {
    try {
        const { data, error } = await supabase.rpc('counter_offer_service_deal', {
            p_deal_id: dealId,
            p_new_amount: Number(newAmount),
            p_note: note
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to counter-offer');

        return { success: true, newAmount: data.new_amount, error: null };
    } catch (err) {
        console.error('counterOfferDeal error:', err);
        return { success: false, error: err.message || 'Error counter-offering' };
    }
}

export async function acceptDeal(dealId) {
    try {
        const { data, error } = await supabase.rpc('accept_service_deal', {
            p_deal_id: dealId
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to accept deal');

        return { success: true, status: data.status, amount: data.amount, error: null };
    } catch (err) {
        console.error('acceptDeal error:', err);
        return { success: false, error: err.message || 'Error accepting deal' };
    }
}

export async function fundDealFromWallet(dealId) {
    try {
        const { data, error } = await supabase.rpc('fund_service_deal_from_wallet', {
            p_deal_id: dealId
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to fund deal');

        return {
            success: true,
            status: data.status,
            heldAmount: data.held_amount,
            remainingWalletBalance: data.remaining_wallet_balance,
            error: null
        };
    } catch (err) {
        console.error('fundDealFromWallet error:', err);
        return { success: false, error: err.message || 'Error funding deal' };
    }
}

export async function markServiceCompleted(dealId) {
    try {
        const { data, error } = await supabase.rpc('mark_service_completed', {
            p_deal_id: dealId
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to mark completed');

        return { success: true, status: data.status, error: null };
    } catch (err) {
        console.error('markServiceCompleted error:', err);
        return { success: false, error: err.message || 'Error marking completed' };
    }
}

export async function confirmServiceRelease(dealId) {
    try {
        const { data, error } = await supabase.rpc('confirm_service_release', {
            p_deal_id: dealId
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to release escrow');

        return {
            success: true,
            status: data.status,
            payoutAmount: data.payout_amount,
            fee: data.fee,
            error: null
        };
    } catch (err) {
        console.error('confirmServiceRelease error:', err);
        return { success: false, error: err.message || 'Error releasing escrow' };
    }
}

export async function disputeDeal(dealId, reason) {
    try {
        const { data, error } = await supabase.rpc('dispute_service_deal', {
            p_deal_id: dealId,
            p_reason: reason
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to file dispute');

        return { success: true, status: data.status, error: null };
    } catch (err) {
        console.error('disputeDeal error:', err);
        return { success: false, error: err.message || 'Error disputing deal' };
    }
}

export async function cancelDeal(dealId, reason = '') {
    try {
        const { data, error } = await supabase.rpc('cancel_service_deal', {
            p_deal_id: dealId,
            p_reason: reason
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to cancel deal');

        return {
            success: true,
            status: data.status,
            refundedAmount: data.refunded_amount,
            error: null
        };
    } catch (err) {
        console.error('cancelDeal error:', err);
        return { success: false, error: err.message || 'Error cancelling deal' };
    }
}

export async function getDeal(dealId) {
    try {
        const { data, error } = await supabase
            .from('service_deals')
            .select(`
                *,
                client:profiles!client_id(id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at),
                provider:profiles!provider_id(id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at)
            `)
            .eq('id', dealId)
            .single();

        if (error) throw error;
        if (data?.client) data.client.avatar_url = getAvatarUrl(data.client) || data.client.avatar_url;
        if (data?.provider) data.provider.avatar_url = getAvatarUrl(data.provider) || data.provider.avatar_url;
        return { deal: data, error: null };
    } catch (err) {
        console.error('getDeal error:', err);
        return { deal: null, error: err.message };
    }
}

export async function getDealsForMatch(matchId) {
    try {
        const { data, error } = await supabase
            .from('service_deals')
            .select(`
                *,
                client:profiles!client_id(id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at),
                provider:profiles!provider_id(id, full_name, avatar_url, profile_photos, photo_updated_at, updated_at)
            `)
            .eq('match_id', matchId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        const mapped = (data || []).map(d => {
            if (d.client) d.client.avatar_url = getAvatarUrl(d.client) || d.client.avatar_url;
            if (d.provider) d.provider.avatar_url = getAvatarUrl(d.provider) || d.provider.avatar_url;
            return d;
        });
        return { deals: mapped, error: null };
    } catch (err) {
        console.error('getDealsForMatch error:', err);
        return { deals: [], error: err.message };
    }
}
