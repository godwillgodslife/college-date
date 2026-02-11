import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
    try {
        const payload = await request.json();
        const secretHash = process.env.FLUTTERWAVE_WEBHOOK_HASH;

        // Verify webhook hash
        const signature = request.headers.get('verif-hash');
        if (secretHash && signature !== secretHash) {
            return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
        }

        if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
            const txRef = payload.data.tx_ref;
            const parts = txRef.split('_');

            if (parts[0] === 'CD' && parts.length >= 4) {
                const swiperId = parts[1];
                const swipedId = parts[2];

                const supabaseAdmin = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );

                // Check if transaction already exists
                const { data: existing } = await supabaseAdmin
                    .from('transactions')
                    .select('id')
                    .eq('flutterwave_ref', txRef)
                    .single();

                if (!existing) {
                    // Record transaction
                    await supabaseAdmin.from('transactions').insert({
                        payer_id: swiperId,
                        recipient_id: swipedId,
                        amount: 500,
                        platform_fee: 250,
                        recipient_earning: 250,
                        type: 'swipe_payment',
                        status: 'completed',
                        flutterwave_ref: txRef,
                        flutterwave_tx_id: String(payload.data.id),
                    });

                    // Credit wallet
                    const { data: wallet } = await supabaseAdmin
                        .from('wallets')
                        .select('*')
                        .eq('user_id', swipedId)
                        .single();

                    if (wallet) {
                        await supabaseAdmin
                            .from('wallets')
                            .update({
                                balance: wallet.balance + 250,
                                total_earned: wallet.total_earned + 250,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('user_id', swipedId);
                    }
                }
            }
        }

        return NextResponse.json({ status: 'success' });
    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json({ status: 'error' }, { status: 500 });
    }
}
