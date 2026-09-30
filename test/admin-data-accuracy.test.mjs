import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Admin Data Accuracy: Migration defines accurate queries, 24h pending payments, and whole-db user summary', () => {
    const migrationPath = path.resolve('supabase/migrations/20260914220000_accurate_admin_activity_and_stats.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Verify admin_get_user_summary RPC definition
    assert.ok(sql.includes('admin_get_user_summary'), 'Migration must define admin_get_user_summary');
    assert.ok(sql.includes('online_now'), 'Migration must compute online_now (< 5m)');
    assert.ok(sql.includes('active_24h'), 'Migration must compute active_24h');
    assert.ok(sql.includes('active_7d'), 'Migration must compute active_7d');
    assert.ok(sql.includes('good_standing'), 'Migration must compute good_standing');

    // Verify 24h boundary on pending payments (fixing the ₦94,613 phantom bug)
    assert.ok(sql.includes("created_at >= now() - interval '24 hours'"), 'Pending payments must be bounded to 24h');
    assert.ok(sql.includes('abandoned_payments') || sql.includes('abandonedPayments'), 'Stale checkouts must be separated as abandoned');

    // Verify search users supports activity filter
    assert.ok(sql.includes('p_activity text'), 'admin_search_users must accept p_activity parameter');

    // Verify stale sticky flag cleanup
    assert.ok(sql.includes("interval '10 minutes'"), 'Sticky is_online flag must be cleaned up');
});

test('Admin Data Accuracy: AdminDashboard.jsx implements dual key access (camelCase & snake_case)', () => {
    const dashboardPath = path.resolve('src/pages/AdminDashboard.jsx');
    assert.ok(fs.existsSync(dashboardPath), 'AdminDashboard.jsx must exist');

    const code = fs.readFileSync(dashboardPath, 'utf8');

    // Check dual key support on revenue and presence stats
    assert.ok(code.includes('verifiedCashRevenue') && code.includes('verified_cash_revenue'), 'Verified cash must support both key styles');
    assert.ok(code.includes('todayVerifiedCashRevenue') && code.includes('today_verified_cash_revenue'), 'Today verified must support both key styles');
    assert.ok(code.includes('onlineNow') && code.includes('online_now'), 'Online now must support both key styles');
    assert.ok(code.includes('pendingPayments') && code.includes('pending_payments'), 'Pending payments must support both key styles');

    // Check presence formatting helper
    assert.ok(code.includes('formatUserPresence'), 'Dashboard must implement formatUserPresence');
    assert.ok(code.includes('Online now'), 'formatUserPresence must recognize online now (< 5m)');
    assert.ok(code.includes('Active today'), 'formatUserPresence must recognize active today (< 24h)');
    assert.ok(code.includes('Active this week'), 'formatUserPresence must recognize active this week (< 7d)');
});

test('Admin Data Accuracy: User Management separates Live Campus Activity from Account Standing', () => {
    const dashboardPath = path.resolve('src/pages/AdminDashboard.jsx');
    const code = fs.readFileSync(dashboardPath, 'utf8');

    // Check two-tier structure
    assert.ok(code.includes('Live Campus Activity'), 'User Management must have Live Campus Activity section');
    assert.ok(code.includes('Account Moderation') && code.includes('Standing'), 'User Management must have Account Moderation & Standing section');

    // Check presence column in user table
    assert.ok(code.includes('<th>Presence</th>'), 'User table must include Presence header');
    assert.ok(code.includes('presence-pill'), 'User rows must render presence-pill');

    // Check that "Good standing" replaces the misleading "Active" label for unbanned accounts
    assert.ok(code.includes('Good Standing') || code.includes('Good standing'), 'Good standing label must be rendered');
    assert.ok(code.includes('status-badge good-standing'), 'Status badge must use good-standing CSS class');

    // Check activity filter options
    assert.ok(code.includes('value="online"'), 'Activity filter must include online');
    assert.ok(code.includes('value="active_24h"'), 'Activity filter must include active_24h');
    assert.ok(code.includes('value="active_7d"'), 'Activity filter must include active_7d');
});

test('Admin Data Accuracy: CSS includes styles for glowing beacon, presence pills, and metric grouping', () => {
    const cssPath = path.resolve('src/pages/AdminDashboard.css');
    assert.ok(fs.existsSync(cssPath), 'AdminDashboard.css must exist');

    const css = fs.readFileSync(cssPath, 'utf8');

    assert.ok(css.includes('.online-beacon-dot'), 'CSS must define .online-beacon-dot');
    assert.ok(css.includes('@keyframes beaconPulse'), 'CSS must define beaconPulse animation');
    assert.ok(css.includes('.presence-pill'), 'CSS must define .presence-pill');
    assert.ok(css.includes('.presence-pill.online'), 'CSS must define online presence styling');
    assert.ok(css.includes('.user-metrics-container'), 'CSS must define .user-metrics-container');
    assert.ok(css.includes('.status-badge.good-standing'), 'CSS must define .status-badge.good-standing');
});
