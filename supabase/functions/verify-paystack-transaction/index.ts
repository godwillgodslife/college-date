import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PaymentAttempt = {
    id: string;
    user_id: string;
    product_id: string;
    provider: string;
    provider_reference: string;
    expected_amount: number;
    currency: string;
    status: string;
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return json({ success: false, message: 'Method not allowed' }, 405);
    }

    try {
        const { reference } = await req.json();

        if (!reference || typeof reference !== 'string') {
            return json({ success: false, message: 'reference is required' }, 400);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

        if (!supabaseUrl || !serviceRoleKey || !paystackKey) {
            return json({ success: false, message: 'Payment verification is not configured' }, 500);
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
        const { data: authData, error: authError } = await supabase.auth.getUser(jwt);

        if (authError || !authData?.user) {
            return json({ success: false, message: 'Not authenticated' }, 401);
        }

        const user = authData.user;

        const { data: attempt, error: attemptError } = await supabase
            .from('payment_attempts')
            .select('id, user_id, product_id, provider, provider_reference, expected_amount, currency, status')
            .eq('provider', 'paystack')
            .eq('provider_reference', reference)
            .eq('user_id', user.id)
            .maybeSingle<PaymentAttempt>();

        if (attemptError) throw attemptError;
        if (!attempt) {
            return json({ success: false, message: 'Payment attempt not found' }, 404);
        }

        if (attempt.status === 'processed') {
            return json({
                success: true,
                idempotent: true,
                paymentAttemptId: attempt.id,
                productId: attempt.product_id,
                message: 'Payment already processed',
            });
        }

        if (['failed', 'mismatch', 'abandoned'].includes(attempt.status)) {
            return json({
                success: false,
                message: `Payment attempt cannot be verified from status ${attempt.status}`,
            }, 409);
        }

        const verifyResponse = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                headers: {
                    Authorization: `Bearer ${paystackKey}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        const paystackData = await verifyResponse.json();
        const sanitizedPaystackData = sanitizePaystackVerify(paystackData);

        if (!verifyResponse.ok || !paystackData?.status || paystackData?.data?.status !== 'success') {
            await supabase
                .from('payment_attempts')
                .update({
                    status: 'failed',
                    provider_status: paystackData?.data?.status ?? paystackData?.message ?? 'verify_failed',
                    provider_response: sanitizedPaystackData,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', attempt.id);

            return json({ success: false, message: 'Paystack did not confirm a successful payment' }, 402);
        }

        const paystackReference = String(paystackData.data?.reference ?? '');
        const paidAmount = Number(paystackData.data?.amount ?? 0) / 100;
        const paidCurrency = String(paystackData.data?.currency ?? '').toUpperCase();
        const expectedAmount = Number(attempt.expected_amount ?? 0);
        const expectedCurrency = String(attempt.currency ?? 'NGN').toUpperCase();

        const amountMatches = Math.round(paidAmount * 100) === Math.round(expectedAmount * 100);
        const currencyMatches = paidCurrency === expectedCurrency;
        const referenceMatches = paystackReference === attempt.provider_reference;

        if (!amountMatches || !currencyMatches || !referenceMatches) {
            await supabase
                .from('payment_attempts')
                .update({
                    status: 'mismatch',
                    provider_status: 'mismatch',
                    provider_response: sanitizedPaystackData,
                    updated_at: new Date().toISOString(),
                    metadata: {
                        mismatch: {
                            amountMatches,
                            currencyMatches,
                            referenceMatches,
                            paidAmount,
                            expectedAmount,
                            paidCurrency,
                            expectedCurrency,
                            paystackReference,
                        },
                    },
                })
                .eq('id', attempt.id);

            return json({ success: false, message: 'Payment details did not match the server-created attempt' }, 409);
        }

        await supabase
            .from('payment_attempts')
            .update({
                status: 'verified',
                provider_status: 'success',
                provider_response: sanitizedPaystackData,
                verified_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', attempt.id);

        const { data: processed, error: processError } = await supabase.rpc('process_verified_payment', {
            p_provider: 'paystack',
            p_provider_reference: reference,
            p_provider_status: 'success',
            p_provider_payload: sanitizedPaystackData,
        });

        if (processError) throw processError;
        if (!processed?.success) {
            return json({
                success: false,
                message: processed?.error || 'Payment was verified but could not be processed',
                paymentAttemptId: attempt.id,
            }, 500);
        }

        return json({
            success: true,
            paymentAttemptId: attempt.id,
            productId: attempt.product_id,
            result: processed,
        });
    } catch (err) {
        console.error('verify-paystack-transaction error:', err);
        return json({ success: false, message: err instanceof Error ? err.message : 'Internal server error' }, 500);
    }
});

function sanitizePaystackVerify(payload: Record<string, unknown>) {
    const data = payload?.data as Record<string, unknown> | undefined;

    return {
        status: payload?.status ?? null,
        message: payload?.message ?? null,
        data: data
            ? {
                id: data.id ?? null,
                status: data.status ?? null,
                reference: data.reference ?? null,
                amount: data.amount ?? null,
                currency: data.currency ?? null,
                paid_at: data.paid_at ?? null,
                channel: data.channel ?? null,
                gateway_response: data.gateway_response ?? null,
            }
            : null,
    };
}

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
