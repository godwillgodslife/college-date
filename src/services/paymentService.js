import { supabase } from '../lib/supabase';

/**
 * Get the current user's wallet
 */
export async function getWallet(userId) {
    try {
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            // If wallet doesn't exist, create it (fallback for existing users)
            if (error.code === 'PGRST116') {
                const { data: newWallet, error: createError } = await supabase
                    .from('wallets')
                    .insert({ user_id: userId })
                    .select()
                    .single();

                if (createError) throw createError;
                return { data: newWallet, error: null };
            }
            throw error;
        }
        return { data, error: null };
    } catch (error) {
        console.error('Error fetching wallet:', error);
        return { data: null, error: error.message };
    }
}

/**
 * Get transaction history for a wallet
 */
export async function getTransactions(walletId) {
    try {
        const { data, error } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('wallet_id', walletId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return { data: [], error: error.message };
    }
}

/**
 * Create a pending transaction record
 */
export async function createTransaction(transactionData) {
    try {
        const { data, error } = await supabase
            .from('wallet_transactions')
            .insert(transactionData)
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Error creating transaction:', error);
        return { data: null, error: error.message };
    }
}

/**
 * Update transaction status and update wallet balance/subscription if successful
 */
export async function completeTransaction(transactionId, status, reference, metadata = {}) {
    try {
        // 1. Get the transaction
        const { data: tx, error: fetchError } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('id', transactionId)
            .single();

        if (fetchError) throw fetchError;
        if (tx.status === 'success' || tx.status === 'completed') return { data: tx, error: null };

        // 2. Update transaction status
        const { data: updatedTx, error: updateError } = await supabase
            .from('wallet_transactions')
            .update({
                status: status === 'success' ? 'completed' : status,
                reference_id: reference,
                gateway_response: metadata
            })
            .eq('id', transactionId)
            .select()
            .single();

        if (updateError) throw updateError;

        // 3. Handle Business Logic based on transaction type
        if (status === 'success') {
            if (tx.type === 'deposit') {
                const { error: walletError } = await supabase
                    .from('wallets')
                    .update({
                        available_balance: supabase.sql`available_balance + ${tx.amount}`,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', tx.wallet_id);
                if (walletError) throw walletError;
            }
            else if (tx.type === 'subscription') {
                // Update subscription level to Premium
                const { error: subError } = await supabase
                    .from('subscriptions')
                    .update({
                        plan_type: 'Premium',
                        status: 'active',
                        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', tx.user_id);
                if (subError) throw subError;
            }
        }

        return { data: updatedTx, error: null };
    } catch (error) {
        console.error('Error completing transaction:', error);
        return { data: null, error: error.message };
    }
}

/**
 * Pay for a service (subscription/boost) using wallet balance
 */
export async function payWithWallet(userId, amount, type, description) {
    try {
        // 1. Get wallet
        const { data: wallet, error: walletError } = await getWallet(userId);
        if (walletError) throw walletError;

        if (wallet.available_balance < amount) {
            throw new Error('Insufficient wallet balance');
        }

        // 2. Create a completed transaction record
        const { data: tx, error: txError } = await supabase
            .from('wallet_transactions')
            .insert({
                user_id: userId,
                wallet_id: wallet.id,
                type: 'payment',
                amount: amount,
                status: 'completed',
                description: description,
                payment_method: 'wallet',
                metadata: { type: type }
            })
            .select()
            .single();

        if (txError) throw txError;

        // 3. Deduct from wallet using RPC
        const { error: rpcError } = await supabase.rpc('decrement_wallet_balance', {
            wallet_uuid: wallet.id,
            amount_val: amount
        });

        if (rpcError) throw rpcError;

        // 4. Activate the service
        if (type === 'subscription') {
            const { error: subError } = await supabase
                .from('subscriptions')
                .update({
                    plan_type: 'Premium',
                    status: 'active',
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);
            if (subError) throw subError;
        }

        return { data: tx, error: null };
    } catch (error) {
        console.error('Wallet payment error:', error);
        return { data: null, error: error.message };
    }
}

/**
 * Payout Details Management
 */
export async function getPayoutDetails(userId) {
    return await supabase
        .from('payout_details')
        .select('*')
        .eq('user_id', userId)
        .single();
}

export async function updatePayoutDetails(userId, details) {
    return await supabase
        .from('payout_details')
        .upsert({ user_id: userId, ...details, updated_at: new Date().toISOString() })
        .select()
        .single();
}

/**
 * Get user subscription status
 */
export async function getSubscription(userId) {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();
        return { data, error };
    } catch (error) {
        return { data: null, error: error.message };
    }
}

/**
 * Initialize Paystack Payment
 */
export function initializePaystack({
    public_key,
    reference,
    amount, // in Naira (will be converted to Kobo)
    email,
    metadata,
    onSuccess,
    onCancel
}) {
    if (!window.PaystackPop) {
        console.error('Paystack script not loaded');
        return;
    }

    const handler = window.PaystackPop.setup({
        key: public_key,
        email: email,
        amount: Math.round(amount * 100), // Convert to Kobo
        currency: 'NGN',
        ref: reference,
        metadata: metadata || {},
        callback: (response) => {
            if (onSuccess) onSuccess(response);
        },
        onClose: () => {
            if (onCancel) onCancel();
        }
    });

    handler.openIframe();
}

/**
 * Purchase a boost (24h_boost or super_swipe)
 */
export async function purchaseBoost(userId, boostType) {
    try {
        const { data, error } = await supabase.rpc('purchase_boost', {
            p_user_id: userId,
            p_boost_type: boostType
        });

        if (error) throw error;

        // The RPC returns a JSONB object with success/error
        if (!data.success) {
            return { data: null, error: data.error };
        }

        return { data, error: null };
    } catch (error) {
        console.error('Error purchasing boost:', error);
        return { data: null, error: error.message };
    }
}

/**
 * Get active (non-expired) boosts for a user
 */
export async function getActiveBoosts(userId) {
    try {
        const { data, error } = await supabase
            .from('boosts')
            .select('*')
            .eq('user_id', userId)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        const activeBoost = data?.find(b => b.type === '24h_boost');
        const superSwipes = data?.filter(b => b.type === 'super_swipe') || [];

        return {
            data: {
                all: data || [],
                activeBoost,
                superSwipeCount: superSwipes.length,
                hasBoosted: !!activeBoost
            },
            error: null
        };
    } catch (error) {
        console.error('Error fetching boosts:', error);
        return {
            data: { all: [], activeBoost: null, superSwipeCount: 0, hasBoosted: false },
            error: error.message
        };
    }
}
