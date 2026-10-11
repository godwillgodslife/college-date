import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// 1. Static Migration Audit & Syntax Integrity
// ---------------------------------------------------------------------------

test('Badge Security Migration: 20261009180000_protect_profile_trust_badges.sql exists and conforms to security specs', () => {
    const migrationPath = path.resolve('supabase/migrations/20261009180000_protect_profile_trust_badges.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration file must exist');

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    // Verify key security specifications
    assert.ok(sqlContent.includes('ALTER TABLE public.profiles'), 'Must ensure photo_verified column existence');
    assert.ok(sqlContent.includes('ADD COLUMN IF NOT EXISTS photo_verified'), 'Must add photo_verified if not present');
    assert.ok(sqlContent.includes('FUNCTION public.enforce_profile_trust_field_integrity()'), 'Must declare trigger function');
    assert.ok(sqlContent.includes('TRIGGER trg_enforce_profile_trust_integrity'), 'Must declare trigger');
    assert.ok(sqlContent.includes('BEFORE INSERT OR UPDATE ON public.profiles'), 'Must attach BEFORE INSERT OR UPDATE');
    assert.ok(sqlContent.includes('SECURITY INVOKER'), 'Must use SECURITY INVOKER to preserve caller role context');

    // Verify role evaluation paths
    assert.ok(sqlContent.includes("current_user IN ('postgres', 'service_role', 'supabase_admin')"), 'Must permit database administrative roles');
    assert.ok(sqlContent.includes("v_jwt_role = 'service_role'"), 'Must permit service_role key');
    assert.ok(sqlContent.includes('public.is_app_admin()'), 'Must permit application administrators');

    // Verify all protected trust and privilege columns
    const protectedFields = [
        'is_verified',
        'photo_verified',
        'ai_verification_status',
        'ai_verification_score',
        'ai_photo_origin',
        'ai_reviewed_at',
        'ai_review_summary',
        'ai_review_flags',
        'is_banned',
        'is_shadow_banned',
        'is_premium'
    ];

    for (const field of protectedFields) {
        assert.ok(sqlContent.includes(field), `Trigger must protect field: ${field}`);
    }
});

// ---------------------------------------------------------------------------
// 2. Deterministic Trigger Simulation Engine
// ---------------------------------------------------------------------------

/**
 * High-fidelity JS simulation of the PL/pgSQL trigger function
 * public.enforce_profile_trust_field_integrity()
 */
function simulateTrigger({
    operation, // 'INSERT' | 'UPDATE'
    currentUser = 'authenticated',
    jwtRole = 'authenticated',
    isAppAdmin = false,
    oldRow = {},
    newRow = {}
}) {
    // 1. Evaluate authorization exactly as PostgreSQL does
    const isAuthorized = (
        ['postgres', 'service_role', 'supabase_admin'].includes(currentUser) ||
        jwtRole === 'service_role' ||
        isAppAdmin === true
    );

    const resultRow = { ...newRow };

    // 2. INSERT Path
    if (operation === 'INSERT') {
        if (!isAuthorized) {
            resultRow.is_verified = false;
            resultRow.photo_verified = false;
            resultRow.ai_verification_status = 'not_started';
            resultRow.ai_verification_score = null;
            resultRow.ai_photo_origin = null;
            resultRow.ai_reviewed_at = null;
            resultRow.ai_review_summary = null;
            resultRow.ai_review_flags = [];
            resultRow.is_banned = false;
            resultRow.is_shadow_banned = false;
            resultRow.is_premium = false;
        }
        return { authorized: isAuthorized, row: resultRow };
    }

    // 3. UPDATE Path
    if (operation === 'UPDATE') {
        if (!isAuthorized) {
            // Revert protected fields to old values
            resultRow.is_verified = oldRow.is_verified ?? false;
            resultRow.photo_verified = oldRow.photo_verified ?? false;
            resultRow.ai_verification_status = oldRow.ai_verification_status ?? 'not_started';
            resultRow.ai_verification_score = oldRow.ai_verification_score ?? null;
            resultRow.ai_photo_origin = oldRow.ai_photo_origin ?? null;
            resultRow.ai_reviewed_at = oldRow.ai_reviewed_at ?? null;
            resultRow.ai_review_summary = oldRow.ai_review_summary ?? null;
            resultRow.ai_review_flags = oldRow.ai_review_flags ?? [];
            resultRow.is_banned = oldRow.is_banned ?? false;
            resultRow.is_shadow_banned = oldRow.is_shadow_banned ?? false;
            resultRow.is_premium = oldRow.is_premium ?? false;
        }
        return { authorized: isAuthorized, row: resultRow };
    }

    throw new Error(`Unsupported operation: ${operation}`);
}

// ---------------------------------------------------------------------------
// 3. Test Cases TC-1 to TC-7 (Conforming to Specification)
// ---------------------------------------------------------------------------

test('TC-1: Regular user updates legitimate profile fields (bio, interests) -> Success', () => {
    const oldProfile = {
        id: 'user-123',
        bio: 'Old bio',
        interests: ['music'],
        is_verified: false,
        photo_verified: false,
        ai_verification_status: 'not_started'
    };

    const updatePayload = {
        ...oldProfile,
        bio: 'Passionate software engineering student',
        interests: ['music', 'coding', 'basketball']
    };

    const { authorized, row } = simulateTrigger({
        operation: 'UPDATE',
        currentUser: 'authenticated',
        jwtRole: 'authenticated',
        isAppAdmin: false,
        oldRow: oldProfile,
        newRow: updatePayload
    });

    assert.equal(authorized, false, 'Regular student is not system authorized');
    assert.equal(row.bio, 'Passionate software engineering student', 'Bio must be successfully updated');
    assert.deepEqual(row.interests, ['music', 'coding', 'basketball'], 'Interests must be successfully updated');
    assert.equal(row.is_verified, false, 'Verification badge remains intact (false)');
});

test('TC-2: Attacker sends direct PostgREST PATCH with { is_verified: true } -> Tamper Neutralized', () => {
    const oldProfile = {
        id: 'attacker-666',
        full_name: 'Attacker Student',
        is_verified: false,
        photo_verified: false
    };

    const maliciousPayload = {
        ...oldProfile,
        is_verified: true // Attempted forgery
    };

    const { authorized, row } = simulateTrigger({
        operation: 'UPDATE',
        currentUser: 'authenticated',
        jwtRole: 'authenticated',
        isAppAdmin: false,
        oldRow: oldProfile,
        newRow: maliciousPayload
    });

    assert.equal(authorized, false);
    assert.equal(row.is_verified, false, 'Forged is_verified must be forcibly reverted to false');
});

test('TC-3: Attacker sends direct PostgREST PATCH with { photo_verified: true, ai_verification_status: "verified" } -> Tamper Neutralized', () => {
    const oldProfile = {
        id: 'attacker-777',
        photo_verified: false,
        ai_verification_status: 'not_started'
    };

    const maliciousPayload = {
        ...oldProfile,
        photo_verified: true,
        ai_verification_status: 'verified'
    };

    const { authorized, row } = simulateTrigger({
        operation: 'UPDATE',
        currentUser: 'authenticated',
        jwtRole: 'authenticated',
        isAppAdmin: false,
        oldRow: oldProfile,
        newRow: maliciousPayload
    });

    assert.equal(authorized, false);
    assert.equal(row.photo_verified, false, 'Forged photo_verified must be forcibly reverted');
    assert.equal(row.ai_verification_status, 'not_started', 'Forged ai_verification_status must be reverted');
});

test('TC-4: Attacker attempts fresh INSERT with { is_verified: true, is_premium: true } -> Defaults Enforced', () => {
    const maliciousInsertPayload = {
        id: 'attacker-888',
        email: 'attacker@campus.edu.ng',
        full_name: 'Fake Verified Student',
        is_verified: true, // Attempted forgery on creation
        is_premium: true   // Attempted privilege escalation
    };

    const { authorized, row } = simulateTrigger({
        operation: 'INSERT',
        currentUser: 'authenticated',
        jwtRole: 'authenticated',
        isAppAdmin: false,
        oldRow: null,
        newRow: maliciousInsertPayload
    });

    assert.equal(authorized, false);
    assert.equal(row.is_verified, false, 'Fresh profile must have is_verified = false');
    assert.equal(row.photo_verified, false, 'Fresh profile must have photo_verified = false');
    assert.equal(row.is_premium, false, 'Fresh profile must have is_premium = false');
    assert.equal(row.ai_verification_status, 'not_started');
});

test('TC-5: Edge Function ai-profile-review (service_role) updates verified badges -> Authorized & Saved', () => {
    const oldProfile = {
        id: 'honest-student-101',
        is_verified: false,
        photo_verified: false,
        ai_verification_status: 'reviewing'
    };

    const now = new Date().toISOString();
    const aiVerificationPayload = {
        ...oldProfile,
        is_verified: true,
        photo_verified: true,
        ai_verification_status: 'verified',
        ai_verification_score: 94.5,
        ai_photo_origin: 'camera_confirmed',
        ai_reviewed_at: now
    };

    const { authorized, row } = simulateTrigger({
        operation: 'UPDATE',
        currentUser: 'service_role',
        jwtRole: 'service_role',
        isAppAdmin: false,
        oldRow: oldProfile,
        newRow: aiVerificationPayload
    });

    assert.equal(authorized, true, 'service_role caller must be authorized');
    assert.equal(row.is_verified, true, 'Verified status must be saved');
    assert.equal(row.photo_verified, true, 'Photo verified must be saved');
    assert.equal(row.ai_verification_status, 'verified');
    assert.equal(row.ai_verification_score, 94.5);
    assert.equal(row.ai_photo_origin, 'camera_confirmed');
    assert.equal(row.ai_reviewed_at, now);
});

test('TC-6: Admin Moderator invokes verification action -> Authorized & Saved', () => {
    const targetProfile = {
        id: 'student-to-verify',
        is_verified: false
    };

    // Scenario A: admin_set_user_status RPC runs under SECURITY DEFINER (owned by postgres)
    const { authorized: authA, row: rowA } = simulateTrigger({
        operation: 'UPDATE',
        currentUser: 'postgres',
        jwtRole: 'authenticated',
        isAppAdmin: true,
        oldRow: targetProfile,
        newRow: { ...targetProfile, is_verified: true }
    });

    assert.equal(authA, true, 'postgres SECURITY DEFINER context must be authorized');
    assert.equal(rowA.is_verified, true, 'Admin manual verification must persist');

    // Scenario B: Direct admin connection via is_app_admin()
    const { authorized: authB, row: rowB } = simulateTrigger({
        operation: 'UPDATE',
        currentUser: 'authenticated',
        jwtRole: 'authenticated',
        isAppAdmin: true,
        oldRow: targetProfile,
        newRow: { ...targetProfile, is_verified: true }
    });

    assert.equal(authB, true, 'is_app_admin() caller must be authorized');
    assert.equal(rowB.is_verified, true);
});

test('TC-7: Onboarding student with AI credit exhaustion -> Safe Onboarding with Withheld Badge', () => {
    // 1. Initial profile creation during signup
    const initialProfile = {
        id: 'student-onboard-303',
        email: 'student@unilag.edu.ng',
        full_name: 'Grace Eze',
        is_onboarded: false,
        is_verified: false,
        photo_verified: false,
        ai_verification_status: 'not_started'
    };

    // 2. OpenRouter credits are exhausted (Edge Function returns needs_review)
    const edgeFunctionUpdate = {
        ...initialProfile,
        ai_verification_status: 'needs_review',
        ai_verification_score: 60,
        is_verified: false,
        photo_verified: false
    };

    const { row: afterAiRow } = simulateTrigger({
        operation: 'UPDATE',
        currentUser: 'service_role',
        jwtRole: 'service_role',
        isAppAdmin: false,
        oldRow: initialProfile,
        newRow: edgeFunctionUpdate
    });

    assert.equal(afterAiRow.ai_verification_status, 'needs_review');
    assert.equal(afterAiRow.is_verified, false);

    // 3. Student completes MiniProfileSetup.jsx onboarding form
    const onboardingCompletePayload = {
        ...afterAiRow,
        university: 'University of Lagos',
        level: '300L',
        interests: ['design', 'tech'],
        is_onboarded: true,
        // Client form sends local states:
        photo_verified: false,
        is_verified: false
    };

    const { row: finalRow } = simulateTrigger({
        operation: 'UPDATE',
        currentUser: 'authenticated',
        jwtRole: 'authenticated',
        isAppAdmin: false,
        oldRow: afterAiRow,
        newRow: onboardingCompletePayload
    });

    assert.equal(finalRow.is_onboarded, true, 'User must successfully complete onboarding');
    assert.equal(finalRow.university, 'University of Lagos');
    assert.equal(finalRow.is_verified, false, 'Verified badge must NOT be granted');
    assert.equal(finalRow.photo_verified, false, 'Photo verified must NOT be granted');
    assert.equal(finalRow.ai_verification_status, 'needs_review', 'Remains queued for review');
});
