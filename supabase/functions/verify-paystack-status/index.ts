// Supabase Edge Function: verify-paystack-status
// Deploy: supabase functions deploy verify-paystack-status
// Required secret: PAYSTACK_SECRET_KEY (set via supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...)
// Required secret: SUPABASE_SERVICE_ROLE_KEY (auto-available in Edge Functions)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { userId } = await req.json();

        if (!userId) {
            return new Response(
                JSON.stringify({ restored: false, message: 'userId is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Initialize Supabase admin client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 1. Get the latest completed subscription transaction for this user
        const { data: txData, error: txError } = await supabase
            .from('wallet_transactions')
            .select('reference_id, amount, created_at')
            .eq('user_id', userId)
            .eq('type', 'subscription')
            .in('status', ['completed', 'success'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (txError) throw txError;

        if (!txData?.reference_id) {
            return new Response(
                JSON.stringify({ restored: false, message: 'No completed subscription transaction found.' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Verify the transaction with Paystack API
        const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY');
        const paystackRes = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(txData.reference_id)}`,
            {
                headers: {
                    Authorization: `Bearer ${paystackKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const paystackData = await paystackRes.json();

        if (!paystackData.status || paystackData.data?.status !== 'success') {
            return new Response(
                JSON.stringify({
                    restored: false,
                    message: 'Paystack could not confirm this transaction. Please contact support.'
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 3. Paystack confirms the payment — grant Premium
        const premiumExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Update profiles table
        await supabase
            .from('profiles')
            .update({ is_premium: true, premium_expires_at: premiumExpiry })
            .eq('id', userId);

        // Update subscriptions table
        await supabase
            .from('subscriptions')
            .update({
                plan_type: 'Premium',
                status: 'active',
                current_period_end: premiumExpiry,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        return new Response(
            JSON.stringify({
                restored: true,
                message: 'Premium subscription restored successfully!'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('verify-paystack-status error:', err);
        return new Response(
            JSON.stringify({ restored: false, message: 'Internal server error', error: err.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
