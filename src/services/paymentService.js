import { supabase } from '../lib/supabase';
import { createNotification } from './notificationService';

/**
 * Get the current user's wallet
 */
export async function getWallet(userId) {
    try {
        const { data, error } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        // If no wallet exists yet, return a default empty wallet object
        // (The wallet row should be created by the database trigger on signup)
        if (!data) {
            return {
                data: {
                    id: null,
                    user_id: userId,
                    available_balance: 0,
                    pending_balance: 0,
                    total_earned: 0,
                },
                error: null
            };
        }

        return { data, error: null };
    } catch (error) {
        console.error('getWallet Exception:', error);
        return { data: null, error: error.message || 'Error connecting to wallet service' };
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
        if (status !== 'success') {
            throw new Error('Only successful payments can be completed.');
        }

        const { data: verifiedPayment, error: verificationError } = await supabase.functions.invoke('verify-paystack-transaction', {
            body: { transactionId, reference, metadata }
        });

        if (verificationError) throw verificationError;
        if (!verifiedPayment?.success) {
            throw new Error(verifiedPayment?.message || 'Payment could not be verified.');
        }

        const verifiedTx = verifiedPayment.transaction;

        if (verifiedTx?.type === 'deposit') {
            createNotification({
                userId: verifiedTx.user_id,
                type: 'payment',
                title: 'Deposit Successful!',
                content: `NGN ${Number(verifiedTx.amount).toLocaleString()} has been added to your wallet.`,
                metadata: { tx_id: verifiedTx.id, url: '/wallet' }
            }).catch(e => console.warn('Silent deposit notification fail:', e));
        } else if (verifiedTx?.type === 'subscription') {
            createNotification({
                userId: verifiedTx.user_id,
                type: 'payment',
                title: 'Premium Activated!',
                content: 'Your account has been upgraded to Premium. Enjoy your new features!',
                metadata: { tx_id: verifiedTx.id, url: '/settings' }
            }).catch(e => console.warn('Silent payment notification fail:', e));
        }

        return { data: verifiedTx, error: null };
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
            p_user_id: userId,
            p_amount: amount
        });

        if (rpcError) throw rpcError;

        // 4. Activate the service
        if (type === 'subscription') {
            const premiumExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            const { error: subError } = await supabase
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    plan_type: 'Premium',
                    status: 'active',
                    current_period_end: premiumExpiry,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });
            if (subError) throw subError;

            const { error: profilePremiumError } = await supabase
                .from('profiles')
                .update({
                    is_premium: true,
                    premium_expires_at: premiumExpiry
                })
                .eq('id', userId);
            if (profilePremiumError) throw profilePremiumError;
        }

        // Notify user about Wallet Payment
        createNotification({
            userId: userId,
            type: 'payment',
            title: '💸 Payment Successful',
            content: `₦${amount.toLocaleString()} paid for ${description}`,
            metadata: { tx_id: tx.id, url: '/wallet' }
        }).catch(e => console.warn('Silent wallet payment notification error:', e));

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
            .maybeSingle();
        return { data: data || null, error };
    } catch (error) {
        return { data: null, error: error.message };
    }
}

/**
 * Initialize Paystack Payment
 */
function loadPaystackScript() {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('Paystack is only available in the browser.'));
    }

    if (window.PaystackPop) {
        return Promise.resolve(window.PaystackPop);
    }

    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[data-paystack-inline="true"]');
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.PaystackPop), { once: true });
            existingScript.addEventListener('error', () => reject(new Error('Paystack script failed to load.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        script.dataset.paystackInline = 'true';
        script.onload = () => {
            if (window.PaystackPop) {
                resolve(window.PaystackPop);
            } else {
                reject(new Error('Paystack script loaded without PaystackPop.'));
            }
        };
        script.onerror = () => reject(new Error('Paystack script failed to load.'));
        document.body.appendChild(script);
    });
}

export async function initializePaystack({
    public_key,
    reference,
    amount, // in Naira (will be converted to Kobo)
    email,
    metadata,
    onSuccess,
    onCancel
}) {
    const PaystackPop = await loadPaystackScript();

    const handler = PaystackPop.setup({
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

/**
 * Restore Purchase / Manually verify Paystack subscription status.
 * Calls a Supabase Edge Function that re-checks the user's last transaction
 * against the Paystack API and updates is_premium if it is confirmed.
 * @param {string} userId
 */
export async function verifyAndRestorePremium(userId) {
    try {
        const { data, error } = await supabase.functions.invoke('verify-paystack-status', {
            body: { userId }
        });

        if (error) throw error;

        // The edge function returns { restored: bool, message: string }
        return { data, error: null };
} catch (err) {
        console.error('verifyAndRestorePremium error:', err);
        return { data: null, error: err.message };
    }
}

// ─────────────────────────────────────────────
// REVENUECAT (GOOGLE PLAY BILLING FOR NATIVE)
// ─────────────────────────────────────────────

/**
 * Detect if running natively (Android/iOS)
 */
const isNative = () => {
    return typeof window !== 'undefined' &&
        window.Capacitor !== undefined &&
        window.Capacitor.isNativePlatform();
};

const getNativePlatform = () => {
    if (!isNative()) return 'web';
    return typeof window.Capacitor.getPlatform === 'function'
        ? window.Capacitor.getPlatform()
        : 'native';
};

const getRevenueCatApiKey = () => {
    const platform = getNativePlatform();
    const androidKey = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';
    const iosKey = import.meta.env.VITE_REVENUECAT_IOS_KEY || '';

    if (platform === 'android') {
        if (!androidKey) {
            throw new Error('Missing Android RevenueCat public key.');
        }
        if (androidKey.startsWith('test_')) {
            throw new Error('Android RevenueCat key is using a Test Store key. Use the Google Play public key that starts with goog_.');
        }
        return androidKey;
    }

    if (platform === 'ios') {
        if (!iosKey) {
            throw new Error('Missing iOS RevenueCat public key. Add VITE_REVENUECAT_IOS_KEY before shipping the App Store build.');
        }
        if (iosKey.startsWith('test_') || iosKey.startsWith('goog_')) {
            throw new Error('iOS RevenueCat key must be the App Store public key from the RevenueCat iOS app.');
        }
        return iosKey;
    }

    throw new Error(`Unsupported native platform for RevenueCat: ${platform}`);
};

/**
 * Initialize RevenueCat SDK
 * @param {string} userId - Supabase User ID to map purchases
 */
export async function initializeRevenueCat(userId) {
    if (!isNative()) return;
    
    try {
        const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
        await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

        const revenueCatApiKey = getRevenueCatApiKey();
        
        await Purchases.configure({ 
            apiKey: revenueCatApiKey,
            appUserID: userId // Links purchase to Supabase user
        });
        
        console.log('[RevenueCat] Initialized for user:', userId);
    } catch (error) {
        console.error('[RevenueCat] Initialization error:', error);
    }
}

/**
 * Fetch available premium packages from RevenueCat
 */
export async function getRevenueCatPackages() {
    if (!isNative()) return null;
    
    try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const offerings = await Purchases.getOfferings();
        if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
            return offerings.current.availablePackages;
        }
        return [];
    } catch (error) {
        console.error('[RevenueCat] Error fetching packages:', error);
        return [];
    }
}

/**
 * Purchase a RevenueCat package (Google Play / App Store)
 */
export async function purchaseRevenueCatPackage(pkg, options = {}) {
    if (!isNative()) throw new Error('In-app purchases are only available in the mobile app.');
    
    try {
        const {
            requiredEntitlement = 'Premium',
            requireEntitlement = true
        } = options;
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });

        if (!requireEntitlement) {
            return { success: true, customerInfo };
        }

        if (typeof customerInfo.entitlements.active[requiredEntitlement] !== "undefined") {
            return { success: true, customerInfo };
        }

        return { success: false, error: `Purchase completed but ${requiredEntitlement} entitlement is not active.` };
    } catch (error) {
        console.error('[RevenueCat] Purchase failed:', error);
        throw error;
    }
}

/**
 * Restore previous purchases (e.g., if user reinstalled the app)
 */
export async function restoreRevenueCatPurchases() {
    if (!isNative()) return { success: false, error: 'Not on native platform' };
    
    try {
        const { Purchases } = await import('@revenuecat/purchases-capacitor');
        const customerInfo = await Purchases.restorePurchases();
        
        if (typeof customerInfo.entitlements.active['Premium'] !== "undefined") {
            return { success: true, customerInfo };
        }
        return { success: false, error: 'No active subscription found.' };
    } catch (error) {
        console.error('[RevenueCat] Restore failed:', error);
        throw error;
    }
}

