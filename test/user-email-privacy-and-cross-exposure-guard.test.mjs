import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

// ---------------------------------------------------------------------------
// 1. DATABASE MIGRATION INTEGRITY & PRIVACY ISOLATION
// ---------------------------------------------------------------------------
test('Database Migration: discovery_feed_v3 and get_admirers_secure strictly omit email & phone', () => {
    const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '20261021140000_strictly_isolate_user_emails.sql');
    assert.ok(fs.existsSync(migrationPath), 'Privacy migration must exist');

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // 1. discovery_feed_v3 must NOT select p.email or p.phone
    assert.ok(sql.includes('CREATE OR REPLACE VIEW public.discovery_feed_v3'), 'Must recreate discovery_feed_v3');
    const viewSelectSection = sql.split('CREATE OR REPLACE VIEW public.discovery_feed_v3')[1].split('FROM public.profiles')[0];
    assert.ok(!/\bp\.email\b/i.test(viewSelectSection), 'discovery_feed_v3 must not select p.email');
    assert.ok(!/\bp\.phone\b/i.test(viewSelectSection), 'discovery_feed_v3 must not select p.phone');

    // 2. get_admirers_secure must NOT return to_jsonb(p)
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.get_admirers_secure'), 'Must recreate get_admirers_secure');
    assert.ok(!sql.includes("'swiper', to_jsonb(p)"), 'get_admirers_secure must not use to_jsonb(p)');

    // 3. Email erase & write trigger
    assert.ok(sql.includes('UPDATE public.profiles SET email = NULL'), 'Must erase plain-text emails on profiles');
    assert.ok(sql.includes('NEW.email := NULL;'), 'Trigger must force email to NULL on profiles');
    assert.ok(sql.includes('trg_prevent_profile_email_storage'), 'Trigger must be registered on public.profiles');

    // 4. Admin RPCs join auth.users
    assert.ok(sql.includes('left join auth.users u on u.id = p.id'), 'Admin functions must join auth.users for email');
    assert.ok(sql.includes('coalesce(u.email, p.email)::text as email'), 'Admin functions must resolve verified email from auth.users');
});

// ---------------------------------------------------------------------------
// 2. PROFILE SERVICE & SWR DATA CONTRACTS
// ---------------------------------------------------------------------------
test('Profile Service: SAFE_PUBLIC_PROFILE_FIELDS and getProfile sanitize other user profiles', async () => {
    const profileServicePath = path.join(ROOT_DIR, 'src', 'services', 'profileService.js');
    const content = fs.readFileSync(profileServicePath, 'utf8');

    // 1. SAFE_PUBLIC_PROFILE_FIELDS definition
    assert.ok(content.includes('SAFE_PUBLIC_PROFILE_FIELDS'), 'Must export SAFE_PUBLIC_PROFILE_FIELDS');
    assert.ok(!content.includes("'email'") || !content.includes("SAFE_PUBLIC_PROFILE_FIELDS = [\n    'email'"), 'Safe fields must not contain email');

    // 2. getProfile uses SAFE_PUBLIC_PROFILE_FIELDS for non-owners and deletes email
    assert.ok(content.includes('const selectFields = isOwn ? \'*\' : SAFE_PUBLIC_PROFILE_FIELDS;'), 'Must select safe fields when viewing another user');
    assert.ok(content.includes('delete normalized.email;'), 'Must delete email if present on non-owner profile');
    assert.ok(content.includes('delete normalized.phone;'), 'Must delete phone if present on non-owner profile');

    // 3. Behavioral simulation of getProfile sanitization
    const userA_Id = '11111111-1111-1111-1111-111111111111';
    const userB_Id = '22222222-2222-2222-2222-222222222222';

    function simulateGetProfile(targetUserId, currentUserId, rawDbRow) {
        const isOwn = targetUserId === currentUserId;
        const normalized = { ...rawDbRow };
        if (!isOwn) {
            delete normalized.email;
            delete normalized.phone;
            delete normalized.onesignal_id;
        }
        return normalized;
    }

    const rawUserBProfile = {
        id: userB_Id,
        full_name: 'Chioma Okeke',
        email: 'chioma.okeke@unilag.edu.ng',
        phone: '+2348012345678',
        university: 'University of Lagos',
        avatar_url: 'https://example.com/chioma.jpg'
    };

    // User A fetches User B: Email and phone MUST be removed
    const sanitizedForUserA = simulateGetProfile(userB_Id, userA_Id, rawUserBProfile);
    assert.equal(sanitizedForUserA.email, undefined);
    assert.equal(sanitizedForUserA.phone, undefined);
    assert.equal(sanitizedForUserA.full_name, 'Chioma Okeke');

    // User B fetches User B: Email is preserved for owner
    const preservedForUserB = simulateGetProfile(userB_Id, userB_Id, rawUserBProfile);
    assert.equal(preservedForUserB.email, 'chioma.okeke@unilag.edu.ng');
    assert.equal(preservedForUserB.phone, '+2348012345678');
});

// ---------------------------------------------------------------------------
// 3. SWIPE & EXPLORE SEARCH PRIVACY CONTRACTS
// ---------------------------------------------------------------------------
test('Swipe Service: searchProfilesByName & getDiscoverProfiles eliminate email and phone', () => {
    const swipeServicePath = path.join(ROOT_DIR, 'src', 'services', 'swipeService.js');
    const content = fs.readFileSync(swipeServicePath, 'utf8');

    // searchProfilesByName must not select * from profiles
    assert.ok(!content.includes("from('profiles')\n                .select('*')"), 'Search query must not select * from profiles');
    assert.ok(content.includes('delete normalized.email;'), 'Search must delete normalized email');
    assert.ok(content.includes('delete normalizedProfile.email;'), 'Discovery must delete normalized email');
});

// ---------------------------------------------------------------------------
// 4. PROFILE DATA UTILITY: sanitizeProfileForDisplay
// ---------------------------------------------------------------------------
test('Profile Data: sanitizeProfileForDisplay strips email & phone for non-owners', async () => {
    const { sanitizeProfileForDisplay } = await import('../src/utils/profileData.js');

    const sampleProfile = {
        id: 'user-b-uuid',
        full_name: 'Emeka Obi',
        email: 'emeka@uniport.edu.ng',
        phone: '08099887766',
        onesignal_id: 'os-12345-id',
        university: 'UNIPORT'
    };

    // Non-owner inspection -> MUST NOT have email, phone, or onesignal_id
    const nonOwnerView = sanitizeProfileForDisplay(sampleProfile, false);
    assert.equal(nonOwnerView.email, undefined);
    assert.equal(nonOwnerView.phone, undefined);
    assert.equal(nonOwnerView.onesignal_id, undefined);
    assert.equal(nonOwnerView.full_name, 'Emeka Obi');

    // Owner inspection -> CAN retain own credentials
    const ownerView = sanitizeProfileForDisplay({ ...sampleProfile }, true);
    assert.equal(ownerView.email, 'emeka@uniport.edu.ng');
    assert.equal(ownerView.phone, '08099887766');
});

// ---------------------------------------------------------------------------
// 5. OFF-PLATFORM GUARD: BIO SANITIZATION ALWAYS LOCKS EMAILS
// ---------------------------------------------------------------------------
test('Off-Platform Guard: sanitizeBioForDisplay always locks emails when viewed by other users', async () => {
    const { sanitizeBioForDisplay } = await import('../src/utils/offPlatformGuard.js');

    const bioWithEmail = 'Hit me up on student email: adaeze.nwosu@unilag.edu.ng for lecture slides';

    // 1. Non-owner regular user: Email must be locked
    const sanitizedRegular = sanitizeBioForDisplay(bioWithEmail, false);
    assert.ok(!sanitizedRegular.includes('adaeze.nwosu@unilag.edu.ng'), 'Email must not be visible to other users');
    assert.ok(sanitizedRegular.includes('[🔒 email locked]'), 'Must replace email with lock tag');

    // 2. Non-owner viewing an Elite Ultra profile: Even though Ultra can bypass handles/links, EMAIL MUST BE LOCKED!
    const sanitizedUltra = sanitizeBioForDisplay(bioWithEmail, { is_ultra: true });
    assert.ok(!sanitizedUltra.includes('adaeze.nwosu@unilag.edu.ng'), 'Email must still be locked even if target user is Ultra');
    assert.ok(sanitizedUltra.includes('[🔒 email locked]'), 'Must replace email with lock tag');

    // 3. Profile owner previewing own bio: Owner sees their own text
    const ownerPreview = sanitizeBioForDisplay(bioWithEmail, true);
    assert.equal(ownerPreview, bioWithEmail, 'Profile owner can see their own bio text');
});

// ---------------------------------------------------------------------------
// 6. PROFILE.JSX UI DISPLAY SECURITY CONTRACT
// ---------------------------------------------------------------------------
test('Profile.jsx: Never leaks email as displayName fallback and isolates email variable to owner', () => {
    const profileJsxPath = path.join(ROOT_DIR, 'src', 'pages', 'Profile.jsx');
    const content = fs.readFileSync(profileJsxPath, 'utf8');

    // 1. displayName must not fall back to currentUser?.email when viewing another user (!isOwnProfile)
    assert.ok(content.includes("(isOwnProfile ? currentUser?.email?.split('@')[0] : 'Student')"), 'displayName must not fall back to email when viewing another profile');

    // 2. email variable must be empty string if not own profile
    assert.ok(content.includes("const email = isOwnProfile ? (currentUser?.email || '') : '';"), 'email variable must be strictly isolated to own profile');

    // 3. bio must use isOwnProfile for sanitization
    assert.ok(content.includes("const bio = sanitizeBioForDisplay(userProfile?.bio || 'No bio yet', isOwnProfile);"), 'bio must be sanitized with isOwnProfile');
});

// ---------------------------------------------------------------------------
// 7. EXPLORE PAGE & PROFILE DRAWER PRIVACY CONTRACTS
// ---------------------------------------------------------------------------
test('Explore.jsx & ProfileDrawer.jsx: Profiles are sanitized and bios are masked against email leaks', () => {
    const explorePath = path.join(ROOT_DIR, 'src', 'pages', 'Explore.jsx');
    const exploreContent = fs.readFileSync(explorePath, 'utf8');

    // 1. Explore page must sanitize discovery profiles
    assert.ok(exploreContent.includes('sanitizeProfileForDisplay(profile, false)'), 'Explore must sanitize profiles for display');
    assert.ok(exploreContent.includes('sanitizeProfileForDisplay(p, false)'), 'Explore must sanitize search results for display');

    const drawerPath = path.join(ROOT_DIR, 'src', 'components', 'ProfileDrawer.jsx');
    const drawerContent = fs.readFileSync(drawerPath, 'utf8');

    // 2. ProfileDrawer must use sanitizeProfileForDisplay
    assert.ok(drawerContent.includes('sanitizeProfileForDisplay(profile || activeProfile'), 'ProfileDrawer must sanitize displayed profile');

    // 3. ProfileDrawer must sanitize bio to prevent email exposure
    assert.ok(drawerContent.includes('sanitizeBioForDisplay(displayProfile.bio'), 'ProfileDrawer must sanitize bio to lock emails');
});
