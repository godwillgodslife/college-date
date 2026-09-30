import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    CURRENT_POLICY_VERSIONS,
    CURRENT_APP_VERSION,
    hasAcceptedPolicy
} from '../src/services/policyService.js';

test('Policy Service: Constants, policy versions and synchronous checks', () => {
    assert.strictEqual(CURRENT_APP_VERSION, '2.2.61');
    assert.strictEqual(CURRENT_POLICY_VERSIONS.terms, '2.0');
    assert.strictEqual(CURRENT_POLICY_VERSIONS.privacy, '2.0');
    assert.strictEqual(CURRENT_POLICY_VERSIONS.safety, '1.0');
    assert.strictEqual(CURRENT_POLICY_VERSIONS.child_safety, '1.0');
    assert.strictEqual(CURRENT_POLICY_VERSIONS.marketplace, '1.0');

    // Test storage-backed version check
    const mockStorage = new Map();
    globalThis.window = {
        localStorage: {
            getItem: (k) => mockStorage.get(k) || null,
            setItem: (k, v) => mockStorage.set(k, String(v)),
            removeItem: (k) => mockStorage.delete(k)
        }
    };

    const userId = 'user-test-policy-123';
    // User hasn't accepted yet
    assert.strictEqual(hasAcceptedPolicy(userId, 'terms'), false);

    // Populate simulated cache
    mockStorage.set(`tcd_policy_acceptances:${userId}`, JSON.stringify({
        terms: { version: '2.0', accepted_at: new Date().toISOString() },
        privacy: { version: '1.0', accepted_at: new Date().toISOString() }
    }));

    // Check with and without version bounds
    assert.strictEqual(hasAcceptedPolicy(userId, 'terms'), true);
    assert.strictEqual(hasAcceptedPolicy(userId, 'terms', '2.0'), true);
    assert.strictEqual(hasAcceptedPolicy(userId, 'terms', '3.0'), false);

    // Privacy is at 1.0, asking for 2.0 should return false
    assert.strictEqual(hasAcceptedPolicy(userId, 'privacy'), true);
    assert.strictEqual(hasAcceptedPolicy(userId, 'privacy', '1.0'), true);
    assert.strictEqual(hasAcceptedPolicy(userId, 'privacy', '2.0'), false);
});

test('Legal Documents Modernization: privacy.html conforms to NDPA 2023 & Agora RTC', () => {
    const privacyPath = resolve('public/privacy.html');
    assert.strictEqual(existsSync(privacyPath), true, 'public/privacy.html must exist');
    const content = readFileSync(privacyPath, 'utf8');

    // Check version and effective date
    assert.ok(content.includes('Version 2.0'), 'privacy.html must declare Version 2.0');
    assert.ok(content.includes('September 21, 2026'), 'privacy.html must declare effective date');

    // Check NDPA 2023 compliance
    assert.ok(content.includes('Nigeria Data Protection Act (NDPA 2023)'), 'privacy.html must cite NDPA 2023');
    assert.ok(content.includes('dpo@thecollegedate.com'), 'privacy.html must provide DPO contact');

    // Check Agora RTC and zero stale ZEGOCLOUD
    assert.ok(content.includes('Agora RTC Inc.'), 'privacy.html must disclose Agora RTC');
    assert.strictEqual(content.includes('ZEGOCLOUD'), false, 'privacy.html must NOT reference ZEGOCLOUD');

    // Check GPS & precise location disclosure
    assert.ok(content.includes('Geolocation'), 'privacy.html must disclose geolocation data collection');
    assert.ok(content.includes('live location sharing'), 'privacy.html must cover live location sharing in chat');
});

test('Legal Documents Modernization: terms.html conforms to Nigerian Law, AMA 2023 & Virtual Currency rules', () => {
    const termsPath = resolve('public/terms.html');
    assert.strictEqual(existsSync(termsPath), true, 'public/terms.html must exist');
    const content = readFileSync(termsPath, 'utf8');

    // Check version
    assert.ok(content.includes('Version 2.0'), 'terms.html must declare Version 2.0');

    // Check Governing Law and Dispute Resolution
    assert.ok(content.includes('Federal Republic of Nigeria'), 'terms.html must specify Nigerian governing law');
    assert.ok(content.includes('Arbitration and Mediation Act, 2023'), 'terms.html must cite AMA 2023');
    assert.ok(content.includes('Lagos State, Nigeria'), 'terms.html must specify Lagos State forum');

    // Check Virtual Currency (Coins) and Escrow rules
    assert.ok(content.includes('CD Coins'), 'terms.html must cover CD Coins');
    assert.ok(content.toLowerCase().includes('non-refundable'), 'terms.html must specify coins are non-refundable');
    assert.ok(content.includes('Escrow Terms'), 'terms.html must govern campus service escrow deals');

    // Check Minimum Age
    assert.ok(content.includes('eighteen (18) years of age'), 'terms.html must enforce 18+ minimum age');
});

test('Legal Documents Modernization: delete-account.html provides self-service & email fallback', () => {
    const deletePath = resolve('public/delete-account.html');
    assert.strictEqual(existsSync(deletePath), true, 'public/delete-account.html must exist');
    const content = readFileSync(deletePath, 'utf8');

    assert.ok(content.includes('Settings'), 'delete-account.html must guide user to Settings');
    assert.ok(content.includes('Delete Account Permanently'), 'delete-account.html must specify exact button');
    assert.ok(content.includes('privacy@thecollegedate.com'), 'delete-account.html must specify email fallback');
});

test('Database Migration: 20260922100000_terms_policy_acceptance_system.sql syntax & tamper-proof constraints', () => {
    const migrationPath = resolve('supabase/migrations/20260922100000_terms_policy_acceptance_system.sql');
    assert.strictEqual(existsSync(migrationPath), true, 'Policy migration file must exist');
    const sql = readFileSync(migrationPath, 'utf8');

    // Check table definitions
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.policies'), 'Must create policies table');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.user_policy_acceptances'), 'Must create user_policy_acceptances table');

    // Check tamper-proof RLS: Client UPDATE and DELETE revoked
    assert.ok(sql.includes('REVOKE UPDATE, DELETE ON public.user_policy_acceptances FROM anon, authenticated;'), 'Must revoke UPDATE & DELETE');

    // Check pre-seeded default policies
    assert.ok(sql.includes("('terms', '2.0'"), 'Must seed terms v2.0');
    assert.ok(sql.includes("('privacy', '2.0'"), 'Must seed privacy v2.0');
    assert.ok(sql.includes("('safety', '1.0'"), 'Must seed safety v1.0');
    assert.ok(sql.includes("('child_safety', '1.0'"), 'Must seed child safety v1.0');
    assert.ok(sql.includes("('marketplace', '1.0'"), 'Must seed marketplace v1.0');

    // Check RPCs
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.record_policy_acceptance'), 'Must define record_policy_acceptance RPC');
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.get_user_accepted_policies'), 'Must define get_user_accepted_policies RPC');
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.get_pending_policy_requirements'), 'Must define get_pending_policy_requirements RPC');
});

test('Clickwrap and Legal UI: Conspicuous disclosure across Signup, Settings, Face Verification, and Android Manifest', () => {
    // 1. Signup.jsx clickwrap
    const signupContent = readFileSync(resolve('src/pages/Signup.jsx'), 'utf8');
    assert.ok(signupContent.includes('auth-legal-notice'), 'Signup must contain auth-legal-notice');
    assert.ok(signupContent.includes('/terms'), 'Signup must link to /terms');
    assert.ok(signupContent.includes('/privacy'), 'Signup must link to /privacy');
    assert.ok(signupContent.includes('CURRENT_POLICY_VERSIONS.terms'), 'Signup must record CURRENT_POLICY_VERSIONS.terms');

    // 2. Settings.jsx Legal Center
    const settingsContent = readFileSync(resolve('src/pages/Settings.jsx'), 'utf8');
    assert.ok(settingsContent.includes('Legal & Policies'), 'Settings must feature Legal & Policies section');
    assert.ok(settingsContent.includes('v2.0 • Up to date'), 'Settings must display policy version badge');
    assert.ok(settingsContent.includes('/child-safety-standards'), 'Settings must link child safety standard');

    // 3. FaceVerificationModal NDPA notice
    const faceVerifyContent = readFileSync(resolve('src/components/FaceVerificationModal.jsx'), 'utf8');
    assert.ok(faceVerifyContent.includes('NDPA 2023 Biometric Consent'), 'FaceVerification must show NDPA consent');
    assert.ok(faceVerifyContent.includes('recordPolicyAcceptance'), 'FaceVerification must record acceptance');

    // 4. AndroidManifest.xml deep links
    const manifestContent = readFileSync(resolve('android/app/src/main/AndroidManifest.xml'), 'utf8');
    assert.ok(manifestContent.includes('android:pathPrefix="/terms"'), 'Manifest must have /terms deep link');
    assert.ok(manifestContent.includes('android:pathPrefix="/privacy"'), 'Manifest must have /privacy deep link');
    assert.ok(manifestContent.includes('android:pathPrefix="/safety"'), 'Manifest must have /safety deep link');
    assert.ok(manifestContent.includes('Voice & Video Calls via Agora RTC'), 'Manifest comment must reflect Agora RTC');
});
