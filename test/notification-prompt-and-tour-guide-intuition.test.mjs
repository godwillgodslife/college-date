import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isUserEligibleForTour } from '../src/utils/tourEligibility.js';

describe('App Tour Guide Intuition & Eligibility', () => {
    const tourJsx = fs.readFileSync(path.resolve('src/components/TourGuide.jsx'), 'utf8');
    const migrationSql = fs.readFileSync(path.resolve('supabase/migrations/20261021110000_add_has_seen_tour_to_profiles.sql'), 'utf8');

    test('isUserEligibleForTour returns false for accounts created > 24 hours ago (e.g. months old)', () => {
        const monthsOldUser = {
            id: 'user-months-old',
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
            has_seen_tour: false,
            bio: '',
            avatar_url: '',
            completion_score: 0
        };
        const eligible = isUserEligibleForTour(monthsOldUser, { id: 'user-months-old' });
        assert.equal(eligible, false, 'Users with accounts created months ago must never see the tour');
    });

    test('isUserEligibleForTour returns false for established profiles with bio, avatar, or photos', () => {
        const userWithBio = {
            id: 'user-with-bio',
            created_at: new Date().toISOString(),
            has_seen_tour: false,
            bio: 'UNILAG computer science student',
            avatar_url: '',
            completion_score: 20
        };
        assert.equal(isUserEligibleForTour(userWithBio, { id: 'user-with-bio' }), false);

        const userWithAvatar = {
            id: 'user-with-avatar',
            created_at: new Date().toISOString(),
            has_seen_tour: false,
            bio: '',
            avatar_url: 'https://example.com/avatar.jpg',
            completion_score: 30
        };
        assert.equal(isUserEligibleForTour(userWithAvatar, { id: 'user-with-avatar' }), false);
    });

    test('isUserEligibleForTour returns false for users who already completed swipes or have completion score >= 30', () => {
        const userWithSwipes = {
            id: 'user-swipes',
            created_at: new Date().toISOString(),
            has_seen_tour: false,
            free_swipes_remaining: 1, // Used 2 swipes
            completion_score: 20
        };
        assert.equal(isUserEligibleForTour(userWithSwipes, { id: 'user-swipes' }), false);

        const userWithScore = {
            id: 'user-score',
            created_at: new Date().toISOString(),
            has_seen_tour: false,
            completion_score: 50
        };
        assert.equal(isUserEligibleForTour(userWithScore, { id: 'user-score' }), false);
    });

    test('isUserEligibleForTour returns true ONLY for brand-new fresh accounts created within 24h', () => {
        const freshUser = {
            id: 'user-fresh-1',
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
            has_seen_tour: false,
            bio: '',
            avatar_url: '',
            completion_score: 0,
            free_swipes_remaining: 3,
            photos: [],
            profile_photos: []
        };
        assert.equal(isUserEligibleForTour(freshUser, { id: 'user-fresh-1' }), true);
    });

    test('TourGuide.jsx mounts via createPortal and suppresses bottom navigation', () => {
        assert.ok(tourJsx.includes('createPortal('), 'TourGuide must render through createPortal to avoid stacking traps');
        assert.ok(tourJsx.includes("document.body.classList.add('has-modal-open')"), 'Must add has-modal-open to body');
        assert.ok(tourJsx.includes('isUserEligibleForTour'), 'Must use isUserEligibleForTour');
    });

    test('Database migration adds has_seen_tour to public.profiles and backfills active users', () => {
        assert.match(migrationSql, /alter table public\.profiles add column if not exists has_seen_tour boolean default false/i);
        assert.match(migrationSql, /update public\.profiles/i);
        assert.match(migrationSql, /set has_seen_tour = true/i);
        assert.match(migrationSql, /interval '24 hours'/i);
    });
});

describe('Notification Soft Prompt Functionality & Persistence', () => {
    const notifJsx = fs.readFileSync(path.resolve('src/components/NotificationSoftPrompt.jsx'), 'utf8');

    test('NotificationSoftPrompt has permanent acceptance storage key', () => {
        assert.ok(notifJsx.includes('tcd_notification_prepermission_accepted'), 'Must define permanent acceptance storage key');
        assert.ok(notifJsx.includes('hasUserAcceptedNotifications'), 'Must check if user accepted notifications');
    });

    test('handleEnable registers push notifications and updates user profile in database', () => {
        assert.ok(notifJsx.includes('updateUserSettings(currentUser.id, { push_notifications: true })'), 'Must persist push preference to profiles table');
        assert.ok(notifJsx.includes('initPushNotifications(currentUser.id)'), 'Must call authoritative initPushNotifications');
        assert.ok(notifJsx.includes('STORAGE_ACCEPTED_KEY'), 'Must record acceptance in storage');
    });

    test('NotificationSoftPrompt respects user settings and existing registrations', () => {
        assert.ok(notifJsx.includes('userProfile.push_notifications === false'), 'Must respect user disabling notifications in settings');
        assert.ok(notifJsx.includes('userProfile?.onesignal_id'), 'Must recognize existing onesignal registration');
        assert.ok(notifJsx.includes('isNotificationPermissionGranted()'), 'Must check browser permission status');
        assert.ok(notifJsx.includes('isUserInCooldown(currentUser)'), 'Must enforce cooldown on dismissals');
    });
});
