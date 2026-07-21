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
    id?: string;
    app_user_id?: string;
    type?: string;
    product_id?: string;
    entitlement_id?: string;
    entitlement_ids?: string[] | null;
    expiration_at_ms?: number | null;
    grace_period_expiration_at_ms?: number | null;
    purchased_at_ms?: number | null;
    event_timestamp_ms?: number | null;
    transaction_id?: string;
    original_transaction_id?: string;
    store?: string;
    environment?: string;
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

function getRevenueCatEventId(event: RevenueCatEvent) {
    return event.id ||
        event.transaction_id ||
        event.original_transaction_id ||
        `${event.type ?? 'unknown'}:${event.app_user_id ?? 'unknown'}:${event.product_id ?? 'unknown'}:${event.event_timestamp_ms ?? event.expiration_at_ms ?? 'no-ts'}`;
}

function getRevenueCatSourceReference(event: RevenueCatEvent, fallbackEventId: string) {
    return event.transaction_id || event.original_transaction_id || fallbackEventId;
}

function getPurchaseStart(event: RevenueCatEvent) {
    return typeof event.purchased_at_ms === 'number' ? new Date(event.purchased_at_ms).toISOString() : new Date().toISOString();
}

async function sha256Hex(message: string) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
    return [...new Uint8Array(digest)]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('');
}

async function markWebhookEvent(
    supabase: any,
    id: string,
    status: 'ignored' | 'processed' | 'failed' | 'duplicate',
    failureReason?: string,
) {
    await supabase
        .from('provider_webhook_events')
        .update({
            processing_status: status,
            failure_reason: failureReason ?? null,
            processed_at: new Date().toISOString(),
        })
        .eq('id', id);
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
        const providerEventId = getRevenueCatEventId(event);
        const payloadHash = await sha256Hex(JSON.stringify(payload));
        const sourceReference = getRevenueCatSourceReference(event, providerEventId);

        const { data: webhookEvent, error: webhookEventError } = await supabase
            .from('provider_webhook_events')
            .insert({
                provider: 'revenuecat',
                provider_event_id: providerEventId,
                event_type: event.type ?? null,
                provider_reference: sourceReference,
                payload_hash: payloadHash,
                payload: {
                    api_version: payload.api_version ?? null,
                    event: {
                        id: event.id ?? null,
                        app_user_id: event.app_user_id,
                        type: event.type ?? null,
                        product_id: event.product_id ?? null,
                        entitlement_id: event.entitlement_id ?? null,
                        entitlement_ids: event.entitlement_ids ?? null,
                        expiration_at_ms: event.expiration_at_ms ?? null,
                        grace_period_expiration_at_ms: event.grace_period_expiration_at_ms ?? null,
                        purchased_at_ms: event.purchased_at_ms ?? null,
                        event_timestamp_ms: event.event_timestamp_ms ?? null,
                        transaction_id: event.transaction_id ?? null,
                        original_transaction_id: event.original_transaction_id ?? null,
                        store: event.store ?? null,
                        environment: event.environment ?? null,
                    },
                },
                processing_status: 'received',
            })
            .select('id')
            .single();

        if (webhookEventError) {
            if (webhookEventError.code === '23505') {
                return jsonResponse({ ok: true, duplicate: true, message: 'Duplicate RevenueCat event ignored' });
            }
            throw webhookEventError;
        }

        if (boostProduct) {
            const boostProductId = event.product_id as keyof typeof BOOST_PRODUCTS;

            if (!isPurchaseEvent(event)) {
                await markWebhookEvent(supabase, webhookEvent.id, 'ignored', 'Ignoring non-purchase boost event');
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
                    await markWebhookEvent(supabase, webhookEvent.id, 'duplicate', 'Duplicate RevenueCat boost transaction');
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
                await markWebhookEvent(supabase, webhookEvent.id, 'failed', 'Wallet not found for RevenueCat boost purchase');
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
                        environment: event.environment,
                        store: event.store,
                        is_sandbox: event.environment ? event.environment.toUpperCase() !== 'PRODUCTION' : null,
                        product_id: boostProductId,
                        transaction_id: event.transaction_id,
                        boost_id: boost.id,
                    },
                });

            if (txError) throw txError;

            await markWebhookEvent(supabase, webhookEvent.id, 'processed');
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
            await markWebhookEvent(supabase, webhookEvent.id, 'ignored', 'Non-premium RevenueCat event');
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

        if (deactivate) {
            const nextStatus = event.type === 'REFUND' || event.type === 'REVOKE'
                ? 'revoked'
                : 'expired';

            const { error: entitlementExpireError } = await supabase
                .from('entitlements')
                .update({
                    status: nextStatus,
                    expires_at: premiumExpiry ?? new Date().toISOString(),
                    revoked_at: nextStatus === 'revoked' ? new Date().toISOString() : null,
                    metadata: {
                        source: 'revenuecat',
                        event_type: event.type,
                        product_id: event.product_id,
                        transaction_id: event.transaction_id,
                        original_transaction_id: event.original_transaction_id,
                    },
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('source', 'revenuecat')
                .in('status', ['active', 'cancelled']);

            if (entitlementExpireError) throw entitlementExpireError;
        } else {
            const { data: entitlementResult, error: entitlementError } = await supabase.rpc('grant_paid_product_entitlements', {
                p_user_id: userId,
                p_product_id: 'premium_monthly',
                p_source: 'revenuecat',
                p_source_reference: sourceReference,
                p_starts_at: getPurchaseStart(event),
                p_expires_at: premiumExpiry,
                p_metadata: {
                    source: 'revenuecat',
                    event_type: event.type,
                    environment: event.environment,
                    store: event.store,
                    product_id: event.product_id,
                    transaction_id: event.transaction_id,
                    original_transaction_id: event.original_transaction_id,
                    webhook_event_id: webhookEvent.id,
                },
            });

            if (entitlementError) throw entitlementError;
            if (!entitlementResult?.success) {
                throw new Error(entitlementResult?.error || 'Failed to grant RevenueCat entitlement');
            }
        }

        // If purchase event (not expiration/refund/revoke), log a wallet transaction and update total_spent
        if (!deactivate && isPurchaseEvent(event)) {
            const { data: wallet, error: walletError } = await supabase
                .from('wallets')
                .select('id, total_spent')
                .eq('user_id', userId)
                .maybeSingle();

            if (!walletError && wallet?.id) {
                const currentSpent = Number(wallet.total_spent || 0);
                const subAmount = 2900; // Premium subscription price in NGN

                // Update total_spent
                await supabase
                    .from('wallets')
                    .update({
                        total_spent: currentSpent + subAmount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', wallet.id);

                // Insert transaction record
                await supabase
                    .from('wallet_transactions')
                    .insert({
                        user_id: userId,
                        wallet_id: wallet.id,
                        type: 'payment',
                        amount: subAmount,
                        status: 'completed',
                        description: 'College Date Premium Subscription (Google Play)',
                        payment_method: 'google_play',
                        reference_id: event.transaction_id || `rc-sub-${Date.now()}`,
                    metadata: {
                        source: 'revenuecat',
                        environment: event.environment,
                            store: event.store,
                            is_sandbox: event.environment ? event.environment.toUpperCase() !== 'PRODUCTION' : null,
                            type: 'subscription',
                            product_id: event.product_id,
                            transaction_id: event.transaction_id,
                        }
                    });
            }
        }

        await markWebhookEvent(supabase, webhookEvent.id, 'processed');
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
