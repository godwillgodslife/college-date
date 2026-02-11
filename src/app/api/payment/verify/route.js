import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { transaction_ref } = await request.json();

        if (!transaction_ref) {
            return NextResponse.json({ success: false, error: 'No transaction reference' }, { status: 400 });
        }

        // Verify with Flutterwave
        const response = await fetch(
            `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${transaction_ref}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                },
            }
        );

        const result = await response.json();

        if (result.status === 'success' && result.data.status === 'successful' && result.data.amount >= 500) {
            // Parse tx_ref to get swiper and swiped IDs: CD_{swiperId}_{swipedId}_{timestamp}
            const parts = transaction_ref.split('_');
            const swiperId = parts[1];
            const swipedId = parts[2];

            // Use service role to update wallets
            const { createClient } = await import('@supabase/supabase-js');
            const supabaseAdmin = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            // Record transaction
            const { data: txn } = await supabaseAdmin.from('transactions').insert({
                payer_id: swiperId,
                recipient_id: swipedId,
                amount: 500,
                platform_fee: 250,
                recipient_earning: 250,
                type: 'swipe_payment',
                status: 'completed',
                flutterwave_ref: transaction_ref,
                flutterwave_tx_id: String(result.data.id),
            }).select().single();

            // Credit female user's wallet
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

            return NextResponse.json({
                success: true,
                transaction_id: txn?.id,
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Payment verification failed',
        }, { status: 400 });
    } catch (error) {
        console.error('Payment verify error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
        }, { status: 500 });
    }
}
