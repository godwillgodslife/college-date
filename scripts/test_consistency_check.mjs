import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Sign in failed: ${JSON.stringify(data)}`);
    return createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${data.access_token}` } }
    });
}

async function runCheck() {
    console.log('--- 1. Authenticating test client ---');
    const client = await signIn('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    console.log('Authenticated successfully.');

    console.log('--- 2. Checking RPC Signatures & Existence ---');
    const rpcs = [
        { name: 'get_blocked_users', args: {} },
        { name: 'check_and_reset_swipe_limit', args: { p_user_id: '1e618bba-9d24-4262-b3c0-1b24b4ff40ff' } },
        { name: 'get_admirers_secure', args: { p_limit: 1 } },
        { name: 'get_profile_viewers_secure', args: { p_limit: 1 } },
        { name: 'process_pending_referral_funds', args: { p_user_id: '1e618bba-9d24-4262-b3c0-1b24b4ff40ff' } }
    ];

    for (const rpc of rpcs) {
        const { data, error } = await client.rpc(rpc.name, rpc.args);
        if (error && !error.message.includes('Could not find the function')) {
            console.log(`  RPC ${rpc.name}: EXISTS (executed with response or expected error: ${error.message.slice(0, 50)})`);
        } else if (error) {
            console.error(`  RPC ${rpc.name}: MISSING! (${error.message})`);
        } else {
            console.log(`  RPC ${rpc.name}: OK (result type: ${typeof data})`);
        }
    }

    console.log('--- 3. Checking Core Tables & RLS Access ---');
    const tables = [
        'profiles', 'matches', 'messages', 'swipes', 'notifications',
        'wallets', 'wallet_transactions', 'user_blocks', 'reports',
        'live_location_shares', 'coin_transactions', 'service_deals',
        'feed_impressions', 'profile_views'
    ];

    for (const tbl of tables) {
        const { count, error } = await client.from(tbl).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`  Table ${tbl}: Access constrained by RLS (${error.message})`);
        } else {
            console.log(`  Table ${tbl}: OK (Row count accessible: ${count})`);
        }
    }

    console.log('--- 4. Checking Views ---');
    const views = ['discovery_feed_v3', 'leaderboard_unified', 'optimized_confessions'];
    for (const v of views) {
        const { data, error } = await client.from(v).select('*').limit(1);
        if (error) {
            console.error(`  View ${v}: ERROR (${error.message})`);
        } else {
            console.log(`  View ${v}: OK (Returned ${data?.length} row)`);
        }
    }
}

runCheck().then(() => {
    console.log('\nConsistency check completed successfully.');
    process.exit(0);
}).catch(err => {
    console.error('Consistency check failed:', err);
    process.exit(1);
});
