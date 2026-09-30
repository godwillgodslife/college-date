import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': ANON_KEY
        },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(`Sign in failed for ${email}: ${JSON.stringify(data)}`);
    }
    const client = createClient(SUPABASE_URL, ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${data.access_token}`
            }
        }
    });
    return { token: data.access_token, user: data.user, client };
}

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ ASSERTION FAILED: ${message}`);
        throw new Error(`Assertion failed: ${message}`);
    }
    console.log(`  ✅ ${message}`);
}

async function runTestSuite() {
    console.log('===============================================================');
    console.log('  COLLEGE DATE: COMPREHENSIVE BACKEND & RPC EXPANSION TEST SUITE');
    console.log('===============================================================\n');

    // 1. AUTHENTICATE BOTH USERS
    console.log('--- 1. Authenticating Users ---');
    const u1 = await signIn('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    console.log(`User 1 (Alex Davis): ${u1.user.id} (${u1.user.email})`);

    const u2 = await signIn('student.tester2026.partner@gmail.com', 'CollegeDate2026!VerifiedPass');
    console.log(`User 2 (Jordan Taylor): ${u2.user.id} (${u2.user.email})`);
    assert(u1.user.id !== u2.user.id, 'Users are distinct accounts');

    // 2. VERIFY OR CREATE MUTUAL MATCH
    console.log('\n--- 2. Setting Up Mutual Match ---');
    let { data: match } = await u1.client
        .from('matches')
        .select('*')
        .or(`and(user1_id.eq.${u1.user.id},user2_id.eq.${u2.user.id}),and(user1_id.eq.${u2.user.id},user2_id.eq.${u1.user.id})`)
        .maybeSingle();

    if (!match) {
        console.log('Creating match between User 1 and User 2...');
        const p1 = u1.user.id < u2.user.id ? u1.user.id : u2.user.id;
        const p2 = u1.user.id < u2.user.id ? u2.user.id : u1.user.id;
        const { data: newMatch, error: matchErr } = await u1.client
            .from('matches')
            .insert({
                user1_id: p1,
                user2_id: p2,
                user_ids: [p1, p2],
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        if (matchErr) throw matchErr;
        match = newMatch;
    }
    console.log(`Match ID: ${match.id}`);
    assert(!!match.id, 'Active mutual match established');

    // 3. VIRTUAL GIFT SENDING (User 1 -> User 2)
    console.log('\n--- 3. Testing Virtual Gift Sending (send_coin_gift) ---');
    // Ensure User 1 has coins
    const { data: u1Profile } = await u1.client.from('profiles').select('coins').eq('id', u1.user.id).single();
    console.log(`User 1 coins before gift: ${u1Profile.coins}`);

    const { data: giftRes, error: giftErr } = await u1.client.rpc('send_coin_gift', {
        p_receiver_id: u2.user.id,
        p_gift_id: 'bouquet', // 200 coins -> credits User 2 with ₦1,600
        p_match_id: match.id
    });
    if (giftErr) console.error('Gift error:', giftErr);
    assert(!giftErr && giftRes?.success, 'send_coin_gift executed successfully');
    console.log(`Gift sent: ${giftRes.gift_name}, sender new coin balance: ${giftRes.new_coin_balance}`);

    // Verify gift message recorded in messages table
    const { data: giftMsg } = await u1.client
        .from('messages')
        .select('*')
        .eq('id', giftRes.message_id)
        .single();
    assert(giftMsg && giftMsg.type === 'gift', 'Gift message saved with type=gift');
    assert(giftMsg.metadata.gift_id === 'bouquet', 'Message metadata contains correct gift_id');

    // Verify coin ledger in coin_transactions for sender
    const { data: senderTx } = await u1.client
        .from('coin_transactions')
        .select('*')
        .eq('user_id', u1.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    assert(senderTx && senderTx.transaction_type === 'gift_sent', 'coin_transactions records gift_sent');

    // Verify recipient wallet received credit
    const { data: u2Wallet } = await u2.client
        .from('wallets')
        .select('available_balance, total_earned')
        .eq('user_id', u2.user.id)
        .single();
    console.log(`User 2 wallet available balance: ₦${u2Wallet.available_balance}`);
    assert(u2Wallet.available_balance >= 1600, 'Recipient wallet received gift credit earnings');

    // 4. COINS PURCHASE VIA WALLET (User 2 converts wallet earnings to coins)
    console.log('\n--- 4. Testing Coin Purchase via Wallet (purchase_coins_with_wallet) ---');
    const { data: u2ProfileBefore } = await u2.client.from('profiles').select('coins').eq('id', u2.user.id).single();
    const coinsBefore = u2ProfileBefore.coins || 0;

    const { data: coinPurchaseRes, error: coinPurchaseErr } = await u2.client.rpc('purchase_coins_with_wallet', {
        p_package_id: 'coins_starter' // 100 coins for ₦900
    });
    if (coinPurchaseErr) console.error('Coin purchase error:', coinPurchaseErr);
    assert(!coinPurchaseErr && coinPurchaseRes?.success, 'purchase_coins_with_wallet executed successfully');
    console.log(`User 2 purchased coins: +${coinPurchaseRes.coins_added}, new balance: ${coinPurchaseRes.new_coin_balance}, remaining wallet: ₦${coinPurchaseRes.new_wallet_balance}`);
    assert(coinPurchaseRes.new_coin_balance === coinsBefore + 100, 'Coins accurately added to profile');

    // Verify coin ledger record for purchase
    const { data: buyerCoinTx } = await u2.client
        .from('coin_transactions')
        .select('*')
        .eq('user_id', u2.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    assert(buyerCoinTx && buyerCoinTx.transaction_type === 'purchase', 'coin_transactions records wallet purchase');

    // 5. VIEW ONCE MEDIA LIFECYCLE & SINGLE-USE TOKEN AUDIT (open_view_once_media)
    console.log('\n--- 5. Testing View-Once Media Lifecycle & Invalidation ---');
    const { data: voMsg, error: voSendErr } = await u1.client
        .from('messages')
        .insert({
            match_id: match.id,
            sender_id: u1.user.id,
            type: 'view_once',
            content: 'Photo (View Once)',
            metadata: {
                media_type: 'image',
                storage_path: 'view_once/test_secure_image.jpg',
                is_viewed: false
            },
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    assert(!voSendErr && voMsg, 'View-once message created with type=view_once');
    console.log(`View-once message ID: ${voMsg.id}`);

    // Recipient opens view-once media for the first time
    const { data: openRes1, error: openErr1 } = await u2.client.rpc('open_view_once_media', {
        p_message_id: voMsg.id
    });
    if (openErr1) console.error('Open view once error:', openErr1);
    assert(!openErr1 && openRes1?.success, 'Recipient opens view-once media successfully');
    assert(openRes1.storage_path === 'view_once/test_secure_image.jpg', 'Storage path returned on first view');
    console.log('First view granted:', openRes1.storage_path);

    // Recipient attempts to open second time
    const { data: openRes2 } = await u2.client.rpc('open_view_once_media', {
        p_message_id: voMsg.id
    });
    assert(openRes2?.success === false, 'Second open attempt rejected by database RPC');
    assert(openRes2?.error.includes('expired') || openRes2?.error.includes('already'), 'Correct error returned: Media expired');
    console.log('Second view correctly blocked:', openRes2.error);

    // 6. LIVE LOCATION SHARING (update_live_location & stop_live_location)
    console.log('\n--- 6. Testing Live Location Sharing ---');
    const { data: locRes, error: locErr } = await u1.client.rpc('update_live_location', {
        p_match_id: match.id,
        p_latitude: 6.5181,
        p_longitude: 3.3985,
        p_accuracy: 10.0,
        p_duration_minutes: 30
    });
    if (locErr) console.error('Location share error:', locErr);
    assert(!locErr && locRes?.success, 'update_live_location starts active session');
    console.log(`Live location active: session ID ${locRes.session_id}, expires at ${locRes.expires_at}`);

    // Verify recipient can read active location share
    const { data: activeLoc } = await u2.client
        .from('live_location_shares')
        .select('*')
        .eq('match_id', match.id)
        .eq('sender_id', u1.user.id)
        .eq('is_active', true)
        .single();
    assert(activeLoc && activeLoc.is_active === true, 'Recipient can read active location share');
    assert(Math.abs(activeLoc.latitude - 6.5181) < 0.001, 'Latitude matches accurately');

    // Stop location sharing
    const { data: stopRes, error: stopErr } = await u1.client.rpc('stop_live_location', {
        p_match_id: match.id
    });
    assert(!stopErr && stopRes?.success, 'stop_live_location executed successfully');

    const { data: stoppedLoc } = await u2.client
        .from('live_location_shares')
        .select('is_active')
        .eq('id', locRes.session_id)
        .single();
    assert(stoppedLoc && stoppedLoc.is_active === false, 'Location share is_active set to false');
    console.log('Live location stopped and verified inactive');

    // 7. USER REPORT & 24H DEDUPLICATION (submit_user_report)
    console.log('\n--- 7. Testing User Report & Deduplication ---');
    const { data: repRes1, error: repErr1 } = await u1.client.rpc('submit_user_report', {
        p_reported_id: u2.user.id,
        p_reason: 'harassment',
        p_description: 'Automated verification test report.',
        p_context_type: 'chat',
        p_context_id: match.id
    });
    if (repErr1) console.error('Report error 1:', repErr1);
    assert(!repErr1 && repRes1?.success, 'submit_user_report recorded first report');
    console.log(`Report filed: ID ${repRes1.report_id}`);

    // Second report within 24h
    const { data: repRes2 } = await u1.client.rpc('submit_user_report', {
        p_reported_id: u2.user.id,
        p_reason: 'harassment',
        p_description: 'Duplicate report within 24 hours.'
    });
    assert(repRes2?.success === true && repRes2?.message.includes('already been logged'), 'Deduplication caught second report');
    console.log('24h anti-spam deduplication confirmed:', repRes2.message);

    // 8. BLOCK USER & MESSAGE SUPPRESSION TRIGGER (block_user, trg_check_message_block, unblock_user)
    console.log('\n--- 8. Testing User Block & Database Trigger Suppression ---');
    const { data: blkRes, error: blkErr } = await u1.client.rpc('block_user', {
        p_blocked_id: u2.user.id
    });
    assert(!blkErr && blkRes?.success, 'block_user RPC executed successfully');
    console.log('User 1 blocked User 2');

    // Verify blocked accounts list query
    const { data: blockedListRes } = await u1.client.rpc('get_blocked_users');
    assert(blockedListRes?.success && blockedListRes.data.some(b => b.id === u2.user.id), 'get_blocked_users includes User 2');
    console.log('Blocked accounts retrieved:', blockedListRes.data.length);

    // Verify database trigger blocks message from User 2 to User 1
    console.log('Testing trigger rejection on message from blocked user...');
    const { data: blockedSend, error: blockTriggerErr } = await u2.client
        .from('messages')
        .insert({
            match_id: match.id,
            sender_id: u2.user.id,
            type: 'text',
            content: 'This message should be rejected by PostgreSQL trigger',
            created_at: new Date().toISOString()
        })
        .select();
    assert(blockTriggerErr !== null, 'Database trigger successfully rejected message from blocked user');
    console.log(`Trigger rejected with error: ${blockTriggerErr?.message}`);
    assert(blockTriggerErr?.message.includes('blocked'), 'Error confirms communication is blocked');

    // Unblock User 2
    const { data: unblkRes, error: unblkErr } = await u1.client.rpc('unblock_user', {
        p_blocked_id: u2.user.id
    });
    assert(!unblkErr && unblkRes?.success, 'unblock_user RPC executed successfully');
    console.log('User 1 unblocked User 2');

    // Message should now succeed
    const { data: unblockedSend, error: unblockSendErr } = await u2.client
        .from('messages')
        .insert({
            match_id: match.id,
            sender_id: u2.user.id,
            type: 'text',
            content: 'Hello after unblock! Communication restored.',
            created_at: new Date().toISOString()
        })
        .select()
        .single();
    assert(!unblockSendErr && unblockedSend, 'Message delivered successfully after unblock');
    console.log('Post-unblock message delivered cleanly');

    // 9. SERVICE DEALS / ESCROW COMPLETE LIFECYCLE
    console.log('\n--- 9. Testing Service Deals / Escrow Lifecycle ---');

    // Safety filter check (prohibited terms)
    console.log('Testing prohibited term protection ("exam runz")...');
    const { data: badDeal } = await u1.client.rpc('propose_service_deal', {
        p_match_id: match.id,
        p_title: 'Pay for exam runz online',
        p_description: 'Need help with expo on exam day',
        p_category: 'academics',
        p_amount: 5000
    });
    assert(badDeal?.success === false, 'Prohibited deal rejected by safety filter');
    console.log('Safety filter correctly caught prohibited request:', badDeal.error);

    // Legitimate proposal: User 1 offers tutoring service to User 2 (User 2 is client, has available balance)
    console.log('Proposing legitimate assignment tutoring deal...');
    const { data: dealRes, error: dealErr } = await u1.client.rpc('propose_service_deal', {
        p_match_id: match.id,
        p_title: 'Calculus 101 Study Session',
        p_description: '2 hours in-person tutorial covering differentiation and integration',
        p_category: 'academics',
        p_amount: 600.00,
        p_provider_id: u1.user.id // User 1 is provider, User 2 is client
    });
    if (dealErr) console.error('Deal proposal error:', dealErr);
    assert(!dealErr && dealRes?.success, 'propose_service_deal executed successfully');
    const dealId = dealRes.deal_id;
    console.log(`Deal created: ${dealId}`);

    // Counter offer by User 2 (Client offers ₦700)
    console.log('User 2 counter-offering ₦700...');
    const { data: counterRes, error: counterErr } = await u2.client.rpc('counter_offer_service_deal', {
        p_deal_id: dealId,
        p_new_amount: 700.00,
        p_note: 'Include practice worksheet solutions'
    });
    assert(!counterErr && counterRes?.success, 'counter_offer_service_deal executed successfully');
    assert(counterRes.new_amount === 700.00, 'Deal amount updated to counter-offer ₦700');

    // User 1 accepts the counter-offer
    console.log('User 1 accepting deal...');
    const { data: acceptRes, error: acceptErr } = await u1.client.rpc('accept_service_deal', {
        p_deal_id: dealId
    });
    assert(!acceptErr && acceptRes?.success, 'accept_service_deal executed successfully');
    assert(acceptRes.status === 'accepted', 'Deal status updated to accepted');

    // User 2 (Client) funds the deal into Escrow
    console.log('User 2 funding deal into escrow from wallet...');
    const { data: fundRes, error: fundErr } = await u2.client.rpc('fund_service_deal_from_wallet', {
        p_deal_id: dealId
    });
    if (fundErr) console.error('Funding error:', fundErr);
    assert(!fundErr && fundRes?.success, 'fund_service_deal_from_wallet locked funds in escrow');
    assert(fundRes.status === 'funded', 'Deal status is now funded');
    console.log(`Escrow funded: ₦${fundRes.held_amount} secured, client remaining wallet: ₦${fundRes.remaining_wallet_balance}`);

    // User 1 (Provider) marks service as completed
    console.log('User 1 (Provider) marking service completed...');
    const { data: compRes, error: compErr } = await u1.client.rpc('mark_service_completed', {
        p_deal_id: dealId
    });
    assert(!compErr && compRes?.success, 'mark_service_completed executed successfully');
    assert(compRes.status === 'completed_by_provider', 'Deal status is now completed_by_provider');

    // User 2 (Client) confirms satisfaction and releases escrow payment to User 1
    console.log('User 2 releasing escrow payment to User 1...');
    const { data: releaseRes, error: releaseErr } = await u2.client.rpc('confirm_service_release', {
        p_deal_id: dealId
    });
    if (releaseErr) console.error('Release error:', releaseErr);
    assert(!releaseErr && releaseRes?.success, 'confirm_service_release executed successfully');
    assert(releaseRes.status === 'released', 'Deal status is now released');
    console.log(`Escrow released! Payout: ₦${releaseRes.payout_amount}, platform fee: ₦${releaseRes.platform_fee}`);

    // Verify audit trail in service_deal_events
    const { data: events } = await u1.client
        .from('service_deal_events')
        .select('event_type, amount, note, created_at')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: true });
    console.log('Audit trail events:');
    events.forEach(e => console.log(`  - [${e.event_type}] ₦${e.amount || 0} (${e.note})`));
    assert(events.length >= 5, 'Full audit trail logged in service_deal_events');

    console.log('\n========================================================================');
    console.log('  🎉 ALL 8 EXPANSION FEATURE GROUPS VERIFIED WITH 100% SUCCESSFUL PASS!');
    console.log('========================================================================');
}

runTestSuite().catch(err => {
    console.error('\n❌ TEST SUITE RUNTIME EXCEPTION:', err);
    process.exit(1);
});
