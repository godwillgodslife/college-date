import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PaidProduct = {
    product_id: string;
    display_name: string;
    product_type: string;
    provider: string;
    amount: number;
    currency: string;
    platforms: string[];
    metadata?: Record<string, unknown>;
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return json({ success: false, message: 'Method not allowed' }, 405);
    }

    try {
        const { productId } = await req.json();
        if (!productId || typeof productId !== 'string') {
            return json({ success: false, message: 'productId is required' }, 400);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

        if (!supabaseUrl || !serviceRoleKey || !paystackKey) {
            return json({ success: false, message: 'Payment initialization is not configured' }, 500);
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
        const { data: authData, error: authError } = await supabase.auth.getUser(jwt);

        if (authError || !authData?.user) {
            return json({ success: false, message: 'Not authenticated' }, 401);
        }

        const user = authData.user;
        if (!user.email) {
            return json({ success: false, message: 'A verified email address is required for Paystack checkout' }, 400);
        }

        const { data: product, error: productError } = await supabase
            .from('paid_products')
            .select('product_id, display_name, product_type, provider, amount, currency, platforms, metadata')
            .eq('product_id', productId)
            .eq('is_active', true)
            .eq('provider', 'paystack')
            .contains('platforms', ['web'])
            .maybeSingle<PaidProduct>();

        if (productError) throw productError;
        if (!product) {
            return json({ success: false, message: 'Paid product is not available' }, 404);
        }

        const reference = `CD-${product.product_id.replace(/[^a-z0-9]/gi, '').toUpperCase()}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        const amount = Number(product.amount);
        const currency = product.currency || 'NGN';

        const { data: attempt, error: attemptError } = await supabase
            .from('payment_attempts')
            .insert({
                user_id: user.id,
                product_id: product.product_id,
                provider: 'paystack',
                provider_reference: reference,
                expected_amount: amount,
                currency,
                status: 'pending',
                metadata: {
                    user_agent: req.headers.get('user-agent') ?? null,
                    origin: req.headers.get('origin') ?? null,
                },
            })
            .select('id')
            .single();

        if (attemptError) throw attemptError;

        const siteUrl = getSiteUrl(req);
        const callbackUrl = `${siteUrl}/payment/callback?reference=${encodeURIComponent(reference)}`;

        const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${paystackKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: user.email,
                amount: Math.round(amount * 100),
                currency,
                reference,
                callback_url: callbackUrl,
                metadata: {
                    payment_attempt_id: attempt.id,
                    product_id: product.product_id,
                    product_type: product.product_type,
                    user_id: user.id,
                },
            }),
        });

        const paystackData = await paystackRes.json();

        if (!paystackRes.ok || !paystackData?.status || !paystackData?.data?.authorization_url) {
            await supabase
                .from('payment_attempts')
                .update({
                    status: 'failed',
                    provider_status: paystackData?.message ?? 'initialize_failed',
                    provider_response: sanitizePaystackInitialize(paystackData),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', attempt.id);

            return json({ success: false, message: paystackData?.message || 'Paystack initialization failed' }, 502);
        }

        const authorizationUrl = paystackData.data.authorization_url;

        await supabase
            .from('payment_attempts')
            .update({
                status: 'initialized',
                provider_authorization_url: authorizationUrl,
                provider_response: sanitizePaystackInitialize(paystackData),
                updated_at: new Date().toISOString(),
            })
            .eq('id', attempt.id);

        return json({
            success: true,
            paymentAttemptId: attempt.id,
            reference,
            authorizationUrl,
            product: {
                productId: product.product_id,
                displayName: product.display_name,
                productType: product.product_type,
                amount,
                currency,
            },
        });
    } catch (err) {
        console.error('initialize-paystack-payment error:', err);
        return json({ success: false, message: err instanceof Error ? err.message : 'Internal server error' }, 500);
    }
});

function getSiteUrl(req: Request) {
    const configured = Deno.env.get('PUBLIC_SITE_URL') || Deno.env.get('SITE_URL');
    if (configured) return configured.replace(/\/+$/, '');

    const origin = req.headers.get('origin');
    if (origin && /^https?:\/\//i.test(origin)) {
        return origin.replace(/\/+$/, '');
    }

    return 'https://www.thecollegedate.com';
}

function sanitizePaystackInitialize(payload: Record<string, unknown>) {
    const data = payload?.data as Record<string, unknown> | undefined;
    return {
        status: payload?.status ?? null,
        message: payload?.message ?? null,
        data: data
            ? {
                reference: data.reference ?? null,
                access_code: data.access_code ? '[redacted]' : null,
                authorization_url: data.authorization_url ?? null,
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
