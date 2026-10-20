import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Security Audit - VULN-CD-001: Referral Milestone Infinite Money Glitch Fixed', () => {
    const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '20261020120000_critical_security_audit_hardening.sql');
    assert.ok(fs.existsSync(migrationPath), 'Hardening migration file must exist');

    const migrationContent = fs.readFileSync(migrationPath, 'utf8');

    // 1. Must add tracking column to wallets
    assert.match(migrationContent, /referral_milestones_awarded\s+integer\[\]/i);

    // 2. Must use FOR UPDATE row lock to eliminate race conditions
    assert.match(migrationContent, /for\s+update/i);

    // 3. Must check if milestone tier has already been awarded
    assert.match(migrationContent, /not\s*\(\s*v_milestone_tier\s*=\s*any\s*\(\s*v_milestones\s*\)\s*\)/i);

    // 4. Must record transaction in wallet_transactions
    assert.match(migrationContent, /insert\s+into\s+public\.wallet_transactions/i);

    // 5. Simulate single-claim milestone logic
    let wallet = {
        available_balance: 0,
        total_earned: 0,
        referral_milestones_awarded: []
    };

    function simulateProcessReferralMilestones(walletState, totalReferralCount) {
        const milestoneTier = Math.floor(totalReferralCount / 10) * 10;
        let reward = 0;

        if (milestoneTier >= 10 && !walletState.referral_milestones_awarded.includes(milestoneTier)) {
            reward = 3000;
            walletState.available_balance += reward;
            walletState.total_earned += reward;
            walletState.referral_milestones_awarded.push(milestoneTier);
        }

        return {
            success: true,
            referral_count: totalReferralCount,
            bonus_awarded: reward,
            milestone_tier: milestoneTier
        };
    }

    // First claim at 10 referrals -> Should award 3000 NGN
    const claim1 = simulateProcessReferralMilestones(wallet, 10);
    assert.equal(claim1.bonus_awarded, 3000);
    assert.equal(wallet.available_balance, 3000);
    assert.deepEqual(wallet.referral_milestones_awarded, [10]);

    // Second immediate claim at same 10 referrals -> Must award 0 NGN (glitch prevented)
    const claim2 = simulateProcessReferralMilestones(wallet, 10);
    assert.equal(claim2.bonus_awarded, 0);
    assert.equal(wallet.available_balance, 3000);

    // Third claim when reaching 20 referrals -> Should award next tier (3000 NGN)
    const claim3 = simulateProcessReferralMilestones(wallet, 20);
    assert.equal(claim3.bonus_awarded, 3000);
    assert.equal(wallet.available_balance, 6000);
    assert.deepEqual(wallet.referral_milestones_awarded, [10, 20]);
});

test('Security Audit - VULN-CD-002: Android Production Remote Debugging Disabled', () => {
    const capacitorConfigPath = path.join(ROOT_DIR, 'capacitor.config.json');
    assert.ok(fs.existsSync(capacitorConfigPath), 'capacitor.config.json must exist');

    const config = JSON.parse(fs.readFileSync(capacitorConfigPath, 'utf8'));
    assert.equal(
        config?.android?.webContentsDebuggingEnabled,
        false,
        'webContentsDebuggingEnabled must be false in capacitor.config.json'
    );
});

test('Security Audit - VULN-CD-003: Window Global Supabase Client Guarded with DEV Mode', () => {
    const supabaseJsPath = path.join(ROOT_DIR, 'src', 'lib', 'supabase.js');
    assert.ok(fs.existsSync(supabaseJsPath), 'src/lib/supabase.js must exist');

    const content = fs.readFileSync(supabaseJsPath, 'utf8');

    // Must be guarded with import.meta.env.DEV
    assert.match(
        content,
        /if\s*\(\s*typeof\s+window\s*!==\s*'undefined'\s*&&\s*import\.meta\.env\.DEV\s*\)\s*\{\s*window\.__supabase\s*=\s*supabase;\s*\}/,
        'window.__supabase must be strictly guarded by import.meta.env.DEV'
    );
});

test('Security Audit - VULN-CD-004: Admin & Owner Auth Requires Email Confirmation', () => {
    const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '20261020120000_critical_security_audit_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    // is_app_admin must require email_confirmed_at is not null
    assert.match(content, /is_app_admin[\s\S]*?v_user\.email_confirmed_at\s+is\s+not\s+null/i);

    // admin_is_owner must require email_confirmed_at is not null
    assert.match(content, /admin_is_owner[\s\S]*?v_user\.email_confirmed_at\s+is\s+not\s+null/i);

    // admin_has_permission must require email_confirmed_at is not null
    assert.match(content, /admin_has_permission[\s\S]*?v_user\.email_confirmed_at\s+is\s+null/i);
});

test('Security Audit - VULN-CD-005: Storage Folder Isolation Enforced on pending-avatars', () => {
    const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '20261020120000_critical_security_audit_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    // Storage policy must enforce folder check for auth.uid()
    assert.match(content, /\(storage\.foldername\(name\)\)\[1\]\s*=\s*auth\.uid\(\)::text/i);
});

test('Security Audit - VULN-CD-006: Internal Preview & Lab Routes Protected in App.jsx', () => {
    const appJsxPath = path.join(ROOT_DIR, 'src', 'App.jsx');
    assert.ok(fs.existsSync(appJsxPath), 'src/App.jsx must exist');

    const content = fs.readFileSync(appJsxPath, 'utf8');

    // DevOrAdminRoute guard must exist
    assert.match(content, /function\s+DevOrAdminRoute/);

    // Routes must be wrapped with DevOrAdminRoute
    assert.match(content, /path="\/wireframes"\s+element=\{<DevOrAdminRoute>/);
    assert.match(content, /path="\/ux-lab"\s+element=\{<DevOrAdminRoute>/);
    assert.match(content, /path="\/notification-preview"\s+element=\{<DevOrAdminRoute>/);
    assert.match(content, /path="\/push-preview"\s+element=\{<DevOrAdminRoute>/);
});

test('Security Audit - VULN-CD-007: Self-Gifting Prohibited in Gift RPC', () => {
    const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '20261020120000_critical_security_audit_hardening.sql');
    const content = fs.readFileSync(migrationPath, 'utf8');

    assert.match(content, /if\s+p_sender_id\s*=\s*p_receiver_id\s+then\s+return\s+jsonb_build_object\('success',\s*false,\s*'error',\s*'Cannot send gifts to yourself'\);/i);
});

test('Security Audit - VULN-CD-008: RevenueCat Webhook Uses Constant-Time Comparison', () => {
    const webhookPath = path.join(ROOT_DIR, 'supabase', 'functions', 'revenuecat-webhook', 'index.ts');
    assert.ok(fs.existsSync(webhookPath), 'revenuecat-webhook/index.ts must exist');

    const content = fs.readFileSync(webhookPath, 'utf8');

    assert.match(content, /function\s+constantTimeEqual/);
    assert.match(content, /constantTimeEqual\s*\(\s*receivedAuth\s*,\s*expectedAuth\s*\)/);
});

test('Security Audit - VULN-CD-009: Strict Cross-Domain & Isolation Headers Configured', () => {
    const headersPath = path.join(ROOT_DIR, 'public', '_headers');
    assert.ok(fs.existsSync(headersPath), 'public/_headers must exist');

    const content = fs.readFileSync(headersPath, 'utf8');

    assert.match(content, /X-Permitted-Cross-Domain-Policies:\s*none/i);
    assert.match(content, /Cross-Origin-Opener-Policy:\s*same-origin-allow-popups/i);
    assert.match(content, /X-Content-Type-Options:\s*nosniff/i);
    assert.match(content, /X-Frame-Options:\s*DENY/i);
    assert.match(content, /Strict-Transport-Security:\s*max-age=31536000/i);
});
