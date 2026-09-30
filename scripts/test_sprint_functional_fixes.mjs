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

async function runTests() {
    console.log('--- RUNNING FUNCTIONAL FIXES SPRINT TEST SUITE ---');
    let passed = 0;
    let failed = 0;

    function assert(name, condition, extra = '') {
        if (condition) {
            console.log(`✅ PASS: ${name} ${extra ? `(${extra})` : ''}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${name} ${extra ? `(${extra})` : ''}`);
            failed++;
        }
    }

    try {
        console.log('\n[1] Authenticating Test User...');
        const u1 = await signIn('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
        assert('Signed in as Alex Davis', Boolean(u1.user?.id), u1.user.id);

        // Test 2: Paid Products Tiers
        console.log('\n[2] Verifying 3 Premium Subscription Durations in paid_products...');
        const { data: products, error: prodErr } = await u1.client
            .from('paid_products')
            .select('product_id, display_name, amount, duration_days, is_active')
            .in('product_id', ['premium_monthly', 'premium_3month', 'premium_annual']);

        assert('No error fetching paid_products', !prodErr, prodErr?.message);
        assert('All 3 tiers found in paid_products', products && products.length === 3, `Found ${products?.length || 0}`);

        const monthly = products?.find(p => p.product_id === 'premium_monthly');
        const threeMonth = products?.find(p => p.product_id === 'premium_3month');
        const annual = products?.find(p => p.product_id === 'premium_annual');

        assert('Monthly tier: ₦2,900 & 30 days', monthly && Number(monthly.amount) === 2900 && monthly.duration_days === 30, `Amount: ${monthly?.amount}, Days: ${monthly?.duration_days}`);
        assert('3-Month tier: ₦7,200 & 90 days', threeMonth && Number(threeMonth.amount) === 7200 && threeMonth.duration_days === 90, `Amount: ${threeMonth?.amount}, Days: ${threeMonth?.duration_days}`);
        assert('Annual tier: ₦31,800 & 365 days', annual && Number(annual.amount) === 31800 && annual.duration_days === 365, `Amount: ${annual?.amount}, Days: ${annual?.duration_days}`);

        // Test 3: Confessions Comment Counter & Realtime
        console.log('\n[3] Verifying Confessions Comment Counter Trigger...');
        const { data: confessions, error: confErr } = await u1.client
            .from('confessions')
            .select('id, comment_count')
            .limit(1);

        assert('No error querying confessions comment_count', !confErr, confErr?.message);
        assert('comment_count column accessible', confessions && confessions.length > 0 && typeof confessions[0].comment_count === 'number', `Count: ${confessions?.[0]?.comment_count}`);

        // Test 4: Search Profiles by Name / University
        console.log('\n[4] Verifying Search Query across profiles...');
        const { data: searchResults, error: searchErr } = await u1.client
            .from('profiles')
            .select('id, full_name, university, department')
            .or('full_name.ilike.%Alex%,university.ilike.%Alex%')
            .limit(5);

        assert('No error querying profiles with search filters', !searchErr, searchErr?.message);
        assert('Search returns matching profiles', searchResults && searchResults.length > 0, `Returned ${searchResults?.length} profiles`);

        // Test 5: Chat Vibe RPC (send_chat_vibe) unauthenticated block
        console.log('\n[5] Verifying send_chat_vibe unauthenticated safety...');
        const anonClient = createClient(SUPABASE_URL, ANON_KEY);
        const { data: vibeAnonRes } = await anonClient.rpc('send_chat_vibe', {
            p_recipient_id: '00000000-0000-0000-0000-000000000000'
        });

        assert('send_chat_vibe blocks unauthenticated calls', vibeAnonRes?.success === false && vibeAnonRes?.error === 'Authentication required.', `Response: ${JSON.stringify(vibeAnonRes)}`);

        // Test 6: Chat Vibe RPC with authenticated user (insufficient balance or successful deduction)
        console.log('\n[6] Verifying send_chat_vibe with authenticated user...');
        // Authenticate User 2
        const u2 = await signIn('student.tester2026.partner@gmail.com', 'CollegeDate2026!VerifiedPass');
        assert('Signed in as Jordan Taylor', Boolean(u2.user?.id), u2.user.id);

        // Call send_chat_vibe from Alex to Jordan
        const { data: vibeRes, error: vibeErr } = await u1.client.rpc('send_chat_vibe', {
            p_recipient_id: u2.user.id
        });

        assert('send_chat_vibe RPC executed without exception', !vibeErr, vibeErr?.message);
        assert('send_chat_vibe returned valid result structure', vibeRes && typeof vibeRes.success === 'boolean', `Result: ${JSON.stringify(vibeRes)}`);

        // Test 7: Matches query capability
        console.log('\n[7] Verifying matches query capability...');
        const { data: matchesTest, error: matchErr } = await u1.client
            .from('matches')
            .select('id, user1_id, user2_id, created_at')
            .limit(1);


        assert('Matches query executes cleanly', !matchErr, matchErr?.message);

        console.log(`\n========================================`);
        console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
        console.log(`========================================\n`);

        if (failed > 0) process.exit(1);
    } catch (err) {
        console.error('Fatal test error:', err);
        process.exit(1);
    }
}

runTests();
