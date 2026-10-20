import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const read = (p) => fs.readFileSync(path.join(rootDir, p), 'utf-8');

// =============================================================================
// SUITE 1: REVENUECAT WEBHOOK & ULTRA ENTITLEMENT ARCHITECTURE
// =============================================================================

test('Suite 1: RevenueCat Webhook supports Ultra entitlement, 15k pricing, and authoritative RPC', () => {
    const webhookCode = read('supabase/functions/revenuecat-webhook/index.ts');

    // Entitlement & product ID detection
    assert.ok(webhookCode.includes("const ULTRA_ENTITLEMENT_ID = 'Ultra'"), 'Must define ULTRA_ENTITLEMENT_ID');
    assert.ok(webhookCode.includes("const ULTRA_PRODUCT_PREFIX = 'ultra_'"), 'Must define ULTRA_PRODUCT_PREFIX');
    assert.ok(webhookCode.includes('hasUltraEntitlement'), 'Must define hasUltraEntitlement helper');
    assert.ok(webhookCode.includes("plan_type: isUltra ? 'Elite Ultra' : 'Premium'"), 'Must record plan_type as Elite Ultra');

    // Profile is_ultra flag updates
    assert.ok(webhookCode.includes('profileUpdate.is_ultra = true'), 'Must set is_ultra to true for active Ultra purchases');
    assert.ok(webhookCode.includes('profileUpdate.is_ultra = false'), 'Must reset is_ultra to false on deactivation');

    // Authoritative RPC dispatch
    assert.ok(webhookCode.includes("p_product_id: resolvedProductId"), 'Must pass resolved Ultra product ID to grant_paid_product_entitlements');
    assert.ok(webhookCode.includes("event.product_id || 'ultra_monthly'"), 'Must fallback to ultra_monthly for Ultra events');

    // 15,000 NGN wallet transaction accounting
    assert.ok(webhookCode.includes('const subAmount = isUltra ? 15000 : 2900'), 'Must charge ₦15,000 for Ultra and ₦2,900 for Premium');
    assert.ok(webhookCode.includes("'College Date Elite Ultra Subscription (Google Play)'"), 'Must use Elite Ultra Google Play description');
});

// =============================================================================
// SUITE 2: PAYMENT SERVICE & CAPACITOR ANDROID NATIVE ISOLATION
// =============================================================================

test('Suite 2: paymentService guards isLocal with !isNative() to prevent Android false positive', () => {
    const paymentServiceCode = read('src/services/paymentService.js');

    // Native platform guard prevents localhost origin on Android Capacitor from triggering mock test bypass
    assert.ok(
        paymentServiceCode.includes('!isNative()') &&
        paymentServiceCode.includes("window.location.hostname === 'localhost'"),
        'paymentService must guard isLocal with !isNative()'
    );

    // RevenueCat package resolution supports Ultra tier
    assert.ok(paymentServiceCode.includes("requiredEntitlement = 'Premium'"), 'purchaseRevenueCatPackage must support requiredEntitlement options');
    assert.ok(paymentServiceCode.includes("activeEntitlements['Ultra']"), 'Must recognize Ultra entitlement from RevenueCat customer info');
});

// =============================================================================
// SUITE 3: ADMIN DASHBOARD SIGNALING & DISPLAY
// =============================================================================

test('Suite 3: AdminDashboard renders Ultra badges and operator attention flags', () => {
    const adminJsx = read('src/pages/AdminDashboard.jsx');
    const adminCss = read('src/pages/AdminDashboard.css');

    // User table status column renders Ultra badge
    assert.ok(adminJsx.includes('<span className="status-badge ultra">👑⭐ Ultra</span>'), 'User table must render Ultra status badge');

    // User drawer renders Elite Ultra badge
    assert.ok(adminJsx.includes('<span className="status-badge ultra">👑⭐ Elite Ultra</span>'), 'User drawer must render Elite Ultra status badge');
    assert.ok(adminJsx.includes("tone: 'luxury', label: 'Elite Ultra VIP'"), 'User drawer flags must display Elite Ultra VIP');

    // CSS provides radiant gold and pink-gold gradient styling
    assert.ok(adminCss.includes('.status-badge.ultra'), 'AdminDashboard.css must define .status-badge.ultra');
    assert.ok(adminCss.includes('.user-attention-card.luxury'), 'AdminDashboard.css must define .user-attention-card.luxury');
});

// =============================================================================
// SUITE 4: DATABASE MIGRATION & POSTGRESQL SECURITY HARDENING
// =============================================================================

test('Suite 4: Migration registers Ultra paid products, entitlements, and eliminates metadata bypass', () => {
    const migration = read('supabase/migrations/20261019120000_ultra_premium_billing_and_security_hardening.sql');

    // Profile column safety check
    assert.ok(migration.includes('column_name = \'is_ultra\''), 'Migration must check for is_ultra column');

    // Registration of all 3 Ultra plans in paid_products
    assert.ok(migration.includes("'ultra_monthly'"), 'Must register ultra_monthly');
    assert.ok(migration.includes("'ultra_2month'"), 'Must register ultra_2month');
    assert.ok(migration.includes("'ultra_3month'"), 'Must register ultra_3month');
    assert.ok(migration.includes('15000'), 'Must record 15,000 NGN for monthly');
    assert.ok(migration.includes('30000'), 'Must record 30,000 NGN for 2-month');
    assert.ok(migration.includes('35000'), 'Must record 35,000 NGN for 3-month');

    // Grant paid product entitlements logic
    assert.ok(migration.includes("v_is_ultra := (v_product.entitlements ? 'ultra') OR (p_product_id LIKE 'ultra_%')"), 'grant_paid_product_entitlements must detect ultra');
    assert.ok(migration.includes("plan_type = 'Elite Ultra'"), 'Must record plan_type = Elite Ultra in subscriptions');
    assert.ok(migration.includes("is_ultra = CASE WHEN v_is_ultra THEN true"), 'Must update profiles.is_ultra');

    // Contact guard security hardening: confirms REMOVAL of client metadata bypass
    assert.ok(
        !migration.includes("NEW.metadata->>'isUltraSender'"),
        'Insecure client isUltraSender metadata bypass must NOT be present in migration trigger'
    );

    // Confirms authoritative check on profiles and active subscriptions
    assert.ok(
        migration.includes("s.plan_type ILIKE '%ultra%'"),
        'Trigger must check authoritative database subscriptions and profiles'
    );

    // admin_get_user_detail upgrade
    assert.ok(migration.includes('admin_get_user_detail'), 'Migration must upgrade admin_get_user_detail');
    assert.ok(migration.includes('is_ultra,'), 'admin_get_user_detail must select is_ultra');
});

// =============================================================================
// SUITE 5: PROMOTIONAL COPY & BENEFIT COMPLETENESS
// =============================================================================

test('Suite 5: EliteUltraDetailsModal and PremiumUpgrade showcase all 10 benefits and 25k valuation', () => {
    const modalJsx = read('src/components/EliteUltraDetailsModal.jsx');
    const premiumUpgradeJsx = read('src/pages/PremiumUpgrade.jsx');

    // EliteUltraDetailsModal benefits
    assert.ok(modalJsx.includes('Unrestricted Contact Sharing'), 'Modal must feature contact sharing');
    assert.ok(modalJsx.includes('WhatsApp, phone numbers & social handles'), 'Modal must explain contact sharing');
    assert.ok(modalJsx.includes('Public Bio Contact Display'), 'Modal must feature bio contact display');
    assert.ok(modalJsx.includes('Extended 30s HD Video Profile'), 'Modal must feature 30s video');
    assert.ok(modalJsx.includes('VIP Spotlight Placement'), 'Modal must feature confessions/explore spotlight');
    assert.ok(modalJsx.includes('₦25,000 MONTHLY VALUE'), 'Modal must feature ₦25,000 valuation badge');

    // PremiumUpgrade.jsx benefits & video duration fix
    assert.ok(
        premiumUpgradeJsx.includes('30s HD Video Profile') || premiumUpgradeJsx.includes('30-second HD video'),
        'PremiumUpgrade video tab must highlight 30s for Ultra'
    );
    assert.ok(premiumUpgradeJsx.includes('Unrestricted Contact Sharing'), 'PremiumUpgrade must highlight contact sharing');
    assert.ok(premiumUpgradeJsx.includes('Public Bio Contact Display'), 'PremiumUpgrade must highlight bio contact display');
    assert.ok(premiumUpgradeJsx.includes('Extended 30s HD Video Profile'), 'PremiumUpgrade must highlight 30s video');
    assert.ok(premiumUpgradeJsx.includes('VIP Spotlight & Radiant Crowns'), 'PremiumUpgrade must highlight VIP spotlight and crowns');

    // Native subscribe handler does NOT bypass RevenueCat when selecting Ultra
    assert.ok(
        !premiumUpgradeJsx.includes("if (isNative() && tierCategory !== 'ultra')"),
        'PremiumUpgrade handleSubscribe must NOT bypass RevenueCat for Ultra'
    );
});
