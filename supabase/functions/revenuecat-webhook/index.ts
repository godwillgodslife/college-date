// Supabase Edge Function: revenuecat-webhook
// Deploy: supabase functions deploy revenuecat-webhook --no-verify-jwt
// Required secret: REVENUECAT_WEBHOOK_AUTH
// Set the same value as the Authorization header configured in RevenueCat.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RevenueCatEvent = {
    app_user_id?: string;
    type?: string;
    product_id?: string;
    entitlement_id?: string;
    entitlement_ids?: string[] | null;
    expiration_at_ms?: number | null;
    grace_period_expiration_at_ms?: number | null;
    transaction_id?: string;
    store?: string;
};

type RevenueCatPayload = {
    api_version?: string;
    event?: RevenueCatEvent;
};

const PREMIUM_ENTITLEMENT_ID = 'Premium';
const PREMIUM_PRODUCT_PREFIX = 'premium_monthly';
const BOOST_PRODUCTS: Record<string, {
    amount: number;
    description: string;
    expiresInHours: number;
    multiplier: number;
}> = {
    super_swipe: {
        amount: 500,
        description: 'Super Swipe Credit',
        expiresInHours: 24 * 30,
        multiplier: 1.0,
    },
    '24h_boost': {
        amount: 1000,
        description: '24h Visibility Boost',
        expiresInHours: 24,
        multiplier: 2.0,
    },
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}

function isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function hasPremiumEntitlement(event: RevenueCatEvent) {
    const entitlementIds = event.entitlement_ids ?? [];
    return entitlementIds.includes(PREMIUM_ENTITLEMENT_ID) ||
        event.entitlement_id === PREMIUM_ENTITLEMENT_ID ||
        event.product_id?.startsWith(PREMIUM_PRODUCT_PREFIX);
}

function getExpiry(event: RevenueCatEvent) {
    const expiryMs = event.expiration_at_ms ?? event.grace_period_expiration_at_ms;
    return typeof expiryMs === 'number' ? new Date(expiryMs).toISOString() : null;
}

function shouldDeactivate(event: RevenueCatEvent) {
    return ['EXPIRATION', 'REFUND', 'REVOKE', 'TRANSFER'].includes(event.type ?? '');
}

function isPurchaseEvent(event: RevenueCatEvent) {
    return [
        'INITIAL_PURCHASE',
        'NON_RENEWING_PURCHASE',
        'RENEWAL',
        'PRODUCT_CHANGE',
    ].includes(event.type ?? '');
}

function getBoostProduct(event: RevenueCatEvent) {
    const productId = event.product_id;
    return productId && BOOST_PRODUCTS[productId] ? BOOST_PRODUCTS[productId] : null;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return jsonResponse({ ok: false, message: 'Method not allowed' }, 405);
    }

    try {
        const expectedAuth = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
        const receivedAuth = req.headers.get('authorization');

        if (!expectedAuth) {
            console.error('REVENUECAT_WEBHOOK_AUTH secret is not configured');
            return jsonResponse({ ok: false, message: 'Webhook auth is not configured' }, 500);
        }

        if (receivedAuth !== expectedAuth) {
            return jsonResponse({ ok: false, message: 'Unauthorized' }, 401);
        }

        const payload = await req.json() as RevenueCatPayload;
        const event = payload.event;

        if (!event) {
            return jsonResponse({ ok: false, message: 'Missing RevenueCat event' }, 400);
        }

        if (!event.app_user_id || !isUuid(event.app_user_id)) {
            return jsonResponse({ ok: true, ignored: true, message: 'Ignoring event without Supabase UUID app_user_id' });
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const userId = event.app_user_id;
        const boostProduct = getBoostProduct(event);

        if (boostProduct) {
            const boostProductId = event.product_id as keyof typeof BOOST_PRODUCTS;

            if (!isPurchaseEvent(event)) {
                return jsonResponse({ ok: true, ignored: true, message: 'Ignoring non-purchase boost event' });
            }

            if (event.transaction_id) {
                const { data: existingTx, error: existingTxError } = await supabase
                    .from('wallet_transactions')
                    .select('id')
                    .eq('reference_id', event.transaction_id)
                    .maybeSingle();

                if (existingTxError) throw existingTxError;

                if (existingTx) {
                    return jsonResponse({ ok: true, ignored: true, message: 'Duplicate RevenueCat transaction ignored' });
                }
            }

            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

            if (walletError) throw walletError;
            if (!wallet?.id) {
                return jsonResponse({ ok: false, message: 'Wallet not found for RevenueCat boost purchase' }, 404);
            }

            const expiresAt = new Date(Date.now() + boostProduct.expiresInHours * 60 * 60 * 1000).toISOString();

            const { data: boost, error: boostError } = await supabase
                .from('boosts')
                .insert({
                    user_id: userId,
                    type: boostProductId,
                    expires_at: expiresAt,
                    multiplier: boostProduct.multiplier,
                })
                .select('id')
                .single();

            if (boostError) throw boostError;

            const { error: txError } = await supabase
                .from('wallet_transactions')
                .insert({
                    user_id: userId,
                    wallet_id: wallet.id,
                    type: 'payment',
                    amount: boostProduct.amount,
                    status: 'completed',
                    description: boostProduct.description,
                    payment_method: 'google_play',
                    reference_id: event.transaction_id,
                    metadata: {
                        source: 'revenuecat',
                        product_id: boostProductId,
                        transaction_id: event.transaction_id,
                        boost_id: boost.id,
                    },
                });

            if (txError) throw txError;

            return jsonResponse({
                ok: true,
                event_type: event.type,
                app_user_id: userId,
                product_id: boostProductId,
                boost_id: boost.id,
                expires_at: expiresAt,
            });
        }

        if (!hasPremiumEntitlement(event)) {
            return jsonResponse({ ok: true, ignored: true, message: 'Ignoring non-premium event' });
        }

        const premiumExpiry = getExpiry(event);
        const deactivate = shouldDeactivate(event);

        const subscriptionUpdate = deactivate
            ? {
                user_id: userId,
                plan_type: 'Free',
                status: 'expired',
                current_period_end: premiumExpiry,
                updated_at: new Date().toISOString(),
            }
            : {
                user_id: userId,
                plan_type: 'Premium',
                status: 'active',
                current_period_end: premiumExpiry,
                updated_at: new Date().toISOString(),
            };

        const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .upsert(subscriptionUpdate, { onConflict: 'user_id' });

        if (subscriptionError) throw subscriptionError;

        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                is_premium: !deactivate,
                premium_expires_at: deactivate ? null : premiumExpiry,
            })
            .eq('id', userId);

        if (profileError) throw profileError;

        return jsonResponse({
            ok: true,
            event_type: event.type,
            app_user_id: userId,
            premium_active: !deactivate,
            premium_expires_at: deactivate ? null : premiumExpiry,
        });
    } catch (err) {
        console.error('revenuecat-webhook error:', err);
        return jsonResponse({
            ok: false,
            message: 'Internal server error',
            error: err instanceof Error ? err.message : String(err),
        }, 500);
    }
});
