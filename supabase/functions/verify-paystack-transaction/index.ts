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

    try {
        const { transactionId, reference, metadata = {} } = await req.json();

        if (!transactionId || !reference) {
            return json({ success: false, message: 'transactionId and reference are required' }, 400);
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const paystackKey = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

        if (!supabaseUrl || !serviceRoleKey || !paystackKey) {
            return json({ success: false, message: 'Payment verification is not configured' }, 500);
        }

        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const authHeader = req.headers.get('Authorization') ?? '';
        const jwt = authHeader.replace(/^Bearer\s+/i, '');

        const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
        if (authError || !authData?.user) {
            return json({ success: false, message: 'Not authenticated' }, 401);
        }

        const user = authData.user;

        const { data: tx, error: txError } = await supabase
            .from('wallet_transactions')
            .select('id, user_id, wallet_id, type, amount, status')
            .eq('id', transactionId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (txError) throw txError;
        if (!tx) {
            return json({ success: false, message: 'Transaction not found' }, 404);
        }

        if (['completed', 'success'].includes(tx.status)) {
            return json({ success: true, transaction: tx, idempotent: true });
        }

        const verifyResponse = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
            {
                headers: {
                    Authorization: `Bearer ${paystackKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        const paystackData = await verifyResponse.json();

        if (!verifyResponse.ok || !paystackData.status || paystackData.data?.status !== 'success') {
            await supabase
                .from('wallet_transactions')
                .update({
                    status: 'failed',
                    reference_id: reference,
                    gateway_response: paystackData,
                })
                .eq('id', tx.id);

            return json({ success: false, message: 'Paystack did not confirm a successful payment' }, 402);
        }

        const paidAmount = Number(paystackData.data?.amount ?? 0) / 100;
        const expectedAmount = Number(tx.amount ?? 0);

        if (Math.round(paidAmount * 100) !== Math.round(expectedAmount * 100)) {
            return json({ success: false, message: 'Payment amount does not match transaction amount' }, 409);
        }

        const { data: updatedTx, error: updateError } = await supabase
            .from('wallet_transactions')
            .update({
                status: 'completed',
                reference_id: reference,
                gateway_response: { ...paystackData, client_metadata: metadata },
            })
            .eq('id', tx.id)
            .select()
            .single();

        if (updateError) throw updateError;

        if (tx.type === 'deposit') {
            const { error: creditError } = await supabase.rpc('increment_wallet_balance_admin', {
                p_user_id: user.id,
                p_amount: expectedAmount,
            });

            if (creditError) throw creditError;
        }

        if (tx.type === 'subscription') {
            const premiumExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ is_premium: true, premium_expires_at: premiumExpiry })
                .eq('id', user.id);
            if (profileError) throw profileError;

            const { error: subError } = await supabase
                .from('subscriptions')
                .upsert({
                    user_id: user.id,
                    plan_type: 'Premium',
                    status: 'active',
                    current_period_end: premiumExpiry,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });
            if (subError) throw subError;

            // Increment wallets total_spent for direct premium subscription
            const { data: walletData, error: walletQueryError } = await supabase
                .from('wallets')
                .select('id, total_spent')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!walletQueryError && walletData) {
                const currentSpent = Number(walletData.total_spent || 0);
                await supabase
                    .from('wallets')
                    .update({
                        total_spent: currentSpent + expectedAmount,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', walletData.id);
            }
        }

        return json({ success: true, transaction: updatedTx });
    } catch (err) {
        console.error('verify-paystack-transaction error:', err);
        return json({ success: false, message: err.message ?? 'Internal server error' }, 500);
    }
});

function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
}
