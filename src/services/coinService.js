import { supabase } from '../lib/supabase';

export const COIN_PACKAGES = [
    {
        id: 'coins_starter',
        coins: 100,
        bonus: 0,
        totalCoins: 100,
        priceNgn: 900,
        badge: 'Starter',
        popular: false
    },
    {
        id: 'coins_popular',
        coins: 350,
        bonus: 50,
        totalCoins: 400,
        priceNgn: 2500,
        badge: 'Most Popular',
        popular: true
    },
    {
        id: 'coins_elite',
        coins: 800,
        bonus: 150,
        totalCoins: 950,
        priceNgn: 5000,
        badge: 'Best Value',
        popular: false
    },
    {
        id: 'coins_vip',
        coins: 2000,
        bonus: 500,
        totalCoins: 2500,
        priceNgn: 10000,
        badge: 'VIP Whale',
        popular: false
    },
    {
        id: 'coins_lion',
        coins: 20000,
        bonus: 5000,
        totalCoins: 25000,
        priceNgn: 100000,
        badge: 'Campus Lion 🦁',
        popular: false
    }
];

export const VIRTUAL_GIFTS = [
    { id: 'rose', name: 'Digital Rose', emoji: '🌹', coins: 20, color: '#f43f5e', desc: 'A classic romantic gesture' },
    { id: 'zobo', name: 'Cold Zobo', emoji: '🍷', coins: 20, color: '#9d174d', desc: 'Chilled campus refreshment' },
    { id: 'suya', name: 'Hot Suya', emoji: '🍢', coins: 50, color: '#ea580c', desc: 'Spicy peppered night snack' },
    { id: 'airtime', name: 'Airtime Charm', emoji: '📱', coins: 100, color: '#2563eb', desc: 'Keep the conversations buzzing' },
    { id: 'bouquet', name: 'Campus Bouquet', emoji: '💐', coins: 200, color: '#10b981', desc: 'Delightful arrangement of blossoms' },
    { id: 'crown', name: 'Royal Crown', emoji: '👑', coins: 500, color: '#ffd700', desc: 'Ultimate symbol of campus royalty' },
    { id: 'lion', name: 'Campus Lion', emoji: '🦁', coins: 10000, color: '#f59e0b', desc: 'The legendary ₦100k Campus Lion gift', earningCreditNgn: 80000 }
];

/**
 * Fetch current user coin balance from profile.
 */
export async function getCoinBalance(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('coins')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return { coins: data?.coins ?? 0, error: null };
    } catch (err) {
        console.error('getCoinBalance error:', err);
        return { coins: 0, error: err.message };
    }
}

/**
 * Purchase coins using available wallet balance.
 */
export async function purchaseCoinsWithWallet(packageId) {
    try {
        const { data, error } = await supabase.rpc('purchase_coins_with_wallet', {
            p_package_id: packageId
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to purchase coins');

        return {
            success: true,
            newCoinBalance: data.new_coin_balance,
            newWalletBalance: data.new_wallet_balance,
            coinsAdded: data.coins_added,
            error: null
        };
    } catch (err) {
        console.error('purchaseCoinsWithWallet error:', err);
        return { success: false, error: err.message || 'Error processing purchase' };
    }
}

/**
 * Fetch authoritative coin ledger history.
 */
export async function getCoinTransactions(userId, limit = 50) {
    try {
        const { data, error } = await supabase
            .from('coin_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return { transactions: data || [], error: null };
    } catch (err) {
        console.error('getCoinTransactions error:', err);
        return { transactions: [], error: err.message };
    }
}

/**
 * Send a gift to another user using CD Coins.
 */
export async function sendCoinGift(receiverId, giftId, matchId) {
    try {
        const { data, error } = await supabase.rpc('send_coin_gift', {
            p_receiver_id: receiverId,
            p_gift_id: giftId,
            p_match_id: matchId
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to send gift');

        return {
            success: true,
            newCoinBalance: data.new_coin_balance,
            messageId: data.message_id,
            giftName: data.gift_name,
            error: null
        };
    } catch (err) {
        console.error('sendCoinGift error:', err);
        return { success: false, error: err.message || 'Error sending gift' };
    }
}
