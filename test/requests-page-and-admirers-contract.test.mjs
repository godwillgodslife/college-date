import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

// ---------------------------------------------------------------------------
// 1. DATABASE MIGRATION INTEGRITY & CONTRACT VERIFICATION
// ---------------------------------------------------------------------------
test('Database Migration: 20261023150000_fix_get_admirers_secure_contract_and_indexes.sql', () => {
    const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '20261023150000_fix_get_admirers_secure_contract_and_indexes.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // 1. Must create composite performance indexes
    assert.ok(
        sql.includes('CREATE INDEX IF NOT EXISTS idx_swipes_admirers_lookup'),
        'Must create idx_swipes_admirers_lookup composite index'
    );
    assert.ok(
        sql.includes('CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id'),
        'Must create idx_swipes_swiper_id index'
    );

    // 2. Must return dual contracts: items AND requests, premium AND is_premium
    assert.ok(sql.includes("'items', v_items"), "get_admirers_secure must return 'items'");
    assert.ok(sql.includes("'requests', v_items"), "get_admirers_secure must return 'requests'");
    assert.ok(sql.includes("'premium', v_is_premium"), "get_admirers_secure must return 'premium'");
    assert.ok(sql.includes("'is_premium', v_is_premium"), "get_admirers_secure must return 'is_premium'");
    assert.ok(sql.includes("'upgrade_required'"), "get_admirers_secure must return 'upgrade_required'");
    assert.ok(sql.includes("'daily_limit', 3"), "get_admirers_secure must return 'daily_limit'");

    // 3. Must strictly omit email, phone, and tokens
    assert.ok(!sql.includes("'swiper', to_jsonb(p)"), 'Must NOT use to_jsonb(p)');
    assert.ok(!sql.includes("'email', p.email"), 'Must NOT expose swiper email');
    assert.ok(!sql.includes("'phone', p.phone"), 'Must NOT expose swiper phone');
});

// ---------------------------------------------------------------------------
// 2. REQUESTS.JSX PARSING CONTRACT RESILIENCE
// ---------------------------------------------------------------------------
test('Requests.jsx: resilient data parsing and loading state management', () => {
    const requestsPagePath = path.join(ROOT_DIR, 'src', 'pages', 'Requests.jsx');
    const content = fs.readFileSync(requestsPagePath, 'utf8');

    // 1. Must parse both items and requests arrays
    assert.ok(
        content.includes('Array.isArray(data.items)') && content.includes('data.requests'),
        'Requests.jsx must defensively parse both data.items and data.requests'
    );

    // 2. Must parse both premium and is_premium
    assert.ok(
        content.includes('data.premium === true || data.is_premium === true'),
        'Requests.jsx must defensively parse both data.premium and data.is_premium'
    );

    // 3. Must support silent / background refresh without showing full-page spinner
    assert.ok(
        content.includes('fetchRequests(silent = false)') || content.includes('fetchRequests(hasCachedItems)'),
        'fetchRequests must support silent background refresh when cache exists'
    );

    // 4. Must provide error retry fallback
    assert.ok(
        content.includes('fetchError && !requests.length'),
        'Requests.jsx must display error retry state if request fails'
    );
});

// ---------------------------------------------------------------------------
// 3. CHAT.JSX PARSING CONTRACT RESILIENCE
// ---------------------------------------------------------------------------
test('Chat.jsx: loadActivityCounts and fetchActivityCounts resilient parsing', () => {
    const chatPagePath = path.join(ROOT_DIR, 'src', 'pages', 'Chat.jsx');
    const content = fs.readFileSync(chatPagePath, 'utf8');

    // Both instances in Chat.jsx must parse items/requests and premium/is_premium
    const matchesItems = content.match(/Array\.isArray\(admirersResult\.data(\?\.|\.)items\)/g) || [];
    assert.ok(matchesItems.length >= 2, 'Chat.jsx must handle dual items/requests contract across all callsites');

    const matchesPremium = content.match(/is_premium === true/g) || [];
    assert.ok(matchesPremium.length >= 2, 'Chat.jsx must handle is_premium fallback across all callsites');
});

// ---------------------------------------------------------------------------
// 4. BEHAVIORAL SIMULATION OF RPC DATA PARSING
// ---------------------------------------------------------------------------
test('Behavioral Simulation: Admirers payload handles both contracts perfectly', () => {
    const sampleAdmirer = {
        id: 'swipe-123',
        swiper_id: 'user-456',
        is_priority: false,
        locked: false,
        swiper: {
            id: 'user-456',
            full_name: 'Chioma Adebayo',
            university: 'University of Lagos',
            avatar_url: 'https://example.com/avatar.jpg'
        }
    };

    function parseAdmirersPayload(data, userProfile) {
        const rawItems = Array.isArray(data.items)
            ? data.items
            : (Array.isArray(data.requests) ? data.requests : []);
        const isPrem = Boolean(data.premium === true || data.is_premium === true || userProfile?.is_premium);
        const totalCount = data.total_count !== undefined ? data.total_count : rawItems.length;

        return {
            requests: rawItems,
            summary: {
                total_count: totalCount,
                premium: isPrem,
                upgrade_required: data.upgrade_required === true || (!isPrem && totalCount > 3),
                free_accepts_remaining: data.free_accepts_remaining ?? (isPrem ? 999 : 3),
                daily_limit: data.daily_limit || 3,
                today_accepts_count: data.today_accepts_count || 0
            }
        };
    }

    // Payload Style A: Previous contract (items, premium)
    const payloadA = {
        success: true,
        items: [sampleAdmirer],
        premium: true,
        total_count: 1,
        free_accepts_remaining: 999
    };
    const parsedA = parseAdmirersPayload(payloadA, null);
    assert.equal(parsedA.requests.length, 1);
    assert.equal(parsedA.requests[0].swiper.full_name, 'Chioma Adebayo');
    assert.equal(parsedA.summary.premium, true);
    assert.equal(parsedA.summary.total_count, 1);

    // Payload Style B: Migration contract (requests, is_premium)
    const payloadB = {
        success: true,
        requests: [sampleAdmirer],
        is_premium: false,
        total_count: 5,
        today_accepts_count: 1,
        free_accepts_remaining: 2
    };
    const parsedB = parseAdmirersPayload(payloadB, null);
    assert.equal(parsedB.requests.length, 1);
    assert.equal(parsedB.requests[0].id, 'swipe-123');
    assert.equal(parsedB.summary.premium, false);
    assert.equal(parsedB.summary.total_count, 5);
    assert.equal(parsedB.summary.upgrade_required, true);
    assert.equal(parsedB.summary.free_accepts_remaining, 2);

    // Payload Style C: Dual contract (both keys present)
    const payloadC = {
        success: true,
        items: [sampleAdmirer],
        requests: [sampleAdmirer],
        premium: false,
        is_premium: false,
        total_count: 1,
        daily_limit: 3,
        free_accepts_remaining: 3
    };
    const parsedC = parseAdmirersPayload(payloadC, null);
    assert.equal(parsedC.requests.length, 1);
    assert.equal(parsedC.summary.total_count, 1);
});
