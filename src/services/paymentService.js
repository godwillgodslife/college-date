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
 * Update transaction status and update wallet balance if successful
 * (Primarily used for Flutterwave deposits)
 */
export async function completeTransaction(transactionId, status, reference) {
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
            .update({ status: status === 'success' ? 'completed' : status, reference_id: reference })
            .eq('id', transactionId)
            .select()
            .single();

        if (updateError) throw updateError;

        // 3. If successful deposit, update available_balance
        if (status === 'success' && tx.type === 'deposit') {
            const { error: walletError } = await supabase
                .from('wallets')
                .update({
                    available_balance: supabase.sql`available_balance + ${tx.amount}`,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tx.wallet_id);

            // Note: In production, this should be done via a secure RPC or Edge Function 
            // after Flutterwave webhook verification.
            if (walletError) throw walletError;
        }

        return { data: updatedTx, error: null };
    } catch (error) {
        console.error('Error completing transaction:', error);
        return { data: null, error: error.message };
    }
}

/**
 * Initialize Flutterwave Payment
 */
export function initializeFlutterwave({
    public_key,
    tx_ref,
    amount,
    currency,
    payment_options,
    customer,
    customizations,
    callback,
    onclose
}) {
    if (!window.FlutterwaveCheckout) {
        console.error('Flutterwave script not loaded');
        return;
    }

    window.FlutterwaveCheckout({
        public_key,
        tx_ref,
        amount,
        currency,
        payment_options: payment_options || 'card,ussd,banktransfer',
        customer,
        customizations: customizations || {
            title: 'College Date Wallet',
            description: 'Funding your account',
            logo: 'https://college-date.netlify.app/vite.svg',
        },
        callback,
        onclose,
    });
}
