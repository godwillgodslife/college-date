// Safe Paystack restore/status check.
// This function never grants a fresh entitlement from an old completed payment.
// It only reports active server-owned entitlements and recent payment attempts.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return json({ restored: false, message: 'Method not allowed' }, 405);
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !serviceRoleKey) {
            return json({ restored: false, message: 'Restore check is not configured' }, 500);
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
        const { data: authData, error: authError } = await supabase.auth.getUser(jwt);

        if (authError || !authData?.user) {
            return json({ restored: false, message: 'Not authenticated' }, 401);
        }

        const userId = authData.user.id;
        const now = new Date().toISOString();

        const { data: activeEntitlements, error: entitlementError } = await supabase
            .from('entitlements')
            .select('entitlement_key, product_id, source, source_reference, starts_at, expires_at')
            .eq('user_id', userId)
            .eq('status', 'active')
            .lte('starts_at', now)
            .or(`expires_at.is.null,expires_at.gt.${now}`);

        if (entitlementError) throw entitlementError;

        const hasPremiumEntitlement = (activeEntitlements ?? []).some((entitlement) =>
            ['premium', 'see_admirers', 'see_profile_viewers'].includes(entitlement.entitlement_key),
        );

        if (hasPremiumEntitlement) {
            const premium = activeEntitlements?.find((entitlement) => entitlement.entitlement_key === 'premium');
            return json({
                restored: true,
                message: 'Premium is already active on the server.',
                premium_expires_at: premium?.expires_at ?? null,
                entitlements: activeEntitlements ?? [],
            });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_premium, premium_expires_at')
            .eq('id', userId)
            .maybeSingle();

        if (profileError) throw profileError;

        if (profile?.is_premium && (!profile.premium_expires_at || profile.premium_expires_at > now)) {
            return json({
                restored: true,
                message: 'Premium is active from your profile record.',
                premium_expires_at: profile.premium_expires_at ?? null,
            });
        }

        const { data: latestAttempt, error: attemptError } = await supabase
            .from('payment_attempts')
            .select('product_id, provider_reference, status, expected_amount, currency, created_at, processed_at')
            .eq('user_id', userId)
            .eq('provider', 'paystack')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (attemptError) throw attemptError;

        return json({
            restored: false,
            message: latestAttempt
                ? `No active Premium entitlement found. Latest Paystack attempt is ${latestAttempt.status}.`
                : 'No server-created Paystack payment attempt was found for this account.',
            latest_attempt: latestAttempt ?? null,
        });
    } catch (err) {
        console.error('verify-paystack-status error:', err);
        return json({ restored: false, message: err instanceof Error ? err.message : 'Internal server error' }, 500);
    }
});

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
