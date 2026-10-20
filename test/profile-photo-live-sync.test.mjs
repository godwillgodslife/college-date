import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    getFreshAvatarUrl,
    getAvatarUrl,
    getProfilePhotos,
    registerProfilePhotoTimestamp
} from '../src/utils/profileData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Profile Photo Live Sync: getFreshAvatarUrl applies timestamp cache-buster', () => {
    const rawUrl = 'https://gedoyoleoscgxgdqszzc.supabase.co/storage/v1/object/public/profile-photos/user1/avatar.webp';
    const ts = 1729432000000;

    const freshUrl = getFreshAvatarUrl(rawUrl, ts);
    assert.strictEqual(freshUrl, `${rawUrl}?t=${ts}`, 'Appends ?t= parameter');

    // Existing parameter cleanup
    const urlWithOldT = `${rawUrl}?t=1600000000000`;
    const cleanedUrl = getFreshAvatarUrl(urlWithOldT, ts);
    assert.strictEqual(cleanedUrl, `${rawUrl}?t=${ts}`, 'Replaces older ?t= parameter cleanly');

    // Dicebear and UI-avatars are untouched
    const dicebearUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=test';
    assert.strictEqual(getFreshAvatarUrl(dicebearUrl, ts), dicebearUrl, 'Preserves vector avatars');
});

test('Profile Photo Live Sync: registerProfilePhotoTimestamp & getAvatarUrl integration', () => {
    const userId = '11111111-2222-3333-4444-555555555555';
    const rawUrl = 'https://gedoyoleoscgxgdqszzc.supabase.co/storage/v1/object/public/profile-photos/user1/pic.jpg';
    const now = Date.now();

    registerProfilePhotoTimestamp(userId, now);

    // Profile object without photo_updated_at should look up in timestamp cache
    const profile = {
        id: userId,
        full_name: 'Test Student',
        avatar_url: rawUrl
    };

    const avatarUrl = getAvatarUrl(profile);
    assert.ok(avatarUrl.includes(`?t=${now}`), `Resolved avatar URL contains registered timestamp: ${avatarUrl}`);

    // getProfilePhotos also applies registered timestamp
    const profileWithPhotos = {
        id: userId,
        profile_photos: [rawUrl, `${rawUrl}2`]
    };
    const photos = getProfilePhotos(profileWithPhotos);
    assert.strictEqual(photos.length, 2);
    assert.ok(photos[0].includes(`?t=${now}`));
    assert.ok(photos[1].includes(`?t=${now}`));
});

test('Profile Photo Live Sync: Static analysis of profileService, AuthContext, Profile.jsx, and Chat.jsx', () => {
    // 1. profileService.js
    const profileServiceSrc = fs.readFileSync(path.join(rootDir, 'src/services/profileService.js'), 'utf8');
    assert.ok(profileServiceSrc.includes('hasPhotoUpdate'), 'profileService.updateProfile detects photo updates');
    assert.ok(profileServiceSrc.includes('registerProfilePhotoTimestamp'), 'profileService registers photo timestamp');
    assert.ok(profileServiceSrc.includes('cd:profile-photo-updated'), 'profileService dispatches cd:profile-photo-updated event');

    // 2. AuthContext.jsx
    const authContextSrc = fs.readFileSync(path.join(rootDir, 'src/contexts/AuthContext.jsx'), 'utf8');
    assert.ok(authContextSrc.includes("setCachedData(['auth-profile', profile.id], profile)"), 'AuthContext updates persistent cache on fetchProfile');
    assert.ok(authContextSrc.includes("setCachedData(['auth-profile', repaired.id], repaired)"), 'AuthContext updates persistent cache on updateProfile');
    assert.ok(authContextSrc.includes("window.addEventListener('cd:profile-photo-updated', handlePhotoUpdated)"), 'AuthContext listens to cd:profile-photo-updated');
    assert.ok(authContextSrc.includes('auth_user_profile_sync:'), 'AuthContext maintains Realtime subscription for authenticated profile');

    // 3. Profile.jsx (Chat Profile View)
    const profileJsxSrc = fs.readFileSync(path.join(rootDir, 'src/pages/Profile.jsx'), 'utf8');
    assert.ok(profileJsxSrc.includes('mutate: mutateProfile'), 'Profile.jsx binds mutateProfile from useSWR');
    assert.ok(profileJsxSrc.includes('isFromChat ? 30 * 1000 : CACHE_TTL.profile'), 'Profile.jsx enforces 30s TTL when opened from chat');
    assert.ok(profileJsxSrc.includes('window.addEventListener(\'cd:profile-photo-updated\', handlePhotoUpdated)'), 'Profile.jsx listens to cd:profile-photo-updated');
    assert.ok(profileJsxSrc.includes('profile_realtime_sync:'), 'Profile.jsx maintains Realtime subscription for partner profile updates');

    // 4. Chat.jsx (Header & Conversations)
    const chatJsxSrc = fs.readFileSync(path.join(rootDir, 'src/pages/Chat.jsx'), 'utf8');
    assert.ok(chatJsxSrc.includes('selectedConv?.other_user?.id'), 'Chat.jsx watches selectedConv other_user id');
    assert.ok(chatJsxSrc.includes('partner_profile_sync:'), 'Chat.jsx maintains partner Realtime subscription');
    assert.ok(chatJsxSrc.includes('registerProfilePhotoTimestamp(updatedUserId, updatedTs)'), 'Chat.jsx registers photo timestamp on update event');

    // 5. ProfileDrawer, Navbar, Requests, Viewers, Explore
    const profileDrawerSrc = fs.readFileSync(path.join(rootDir, 'src/components/ProfileDrawer.jsx'), 'utf8');
    assert.ok(profileDrawerSrc.includes('cd:profile-photo-updated'), 'ProfileDrawer listens to cd:profile-photo-updated');

    const navbarSrc = fs.readFileSync(path.join(rootDir, 'src/components/Navbar.jsx'), 'utf8');
    assert.ok(navbarSrc.includes('cd:profile-photo-updated'), 'Navbar listens to cd:profile-photo-updated');

    const requestsSrc = fs.readFileSync(path.join(rootDir, 'src/pages/Requests.jsx'), 'utf8');
    assert.ok(requestsSrc.includes('cd:profile-photo-updated'), 'Requests listens to cd:profile-photo-updated');

    const viewersSrc = fs.readFileSync(path.join(rootDir, 'src/pages/Viewers.jsx'), 'utf8');
    assert.ok(viewersSrc.includes('cd:profile-photo-updated'), 'Viewers listens to cd:profile-photo-updated');

    const exploreSrc = fs.readFileSync(path.join(rootDir, 'src/pages/Explore.jsx'), 'utf8');
    assert.ok(exploreSrc.includes('cd:profile-photo-updated'), 'Explore listens to cd:profile-photo-updated');
});
