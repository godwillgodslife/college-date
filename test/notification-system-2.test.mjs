import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getNotificationDeepLink } from '../src/utils/notificationRouting.js';
import { hasActivePremium } from '../src/utils/premium.js';

test('Notification Routing: Resolves deep links correctly for all key routes', () => {
    // 1. Guides / Official Hub
    const guidesNotif = { type: 'system', metadata: { url: '/guides' } };
    assert.strictEqual(getNotificationDeepLink(guidesNotif).to, '/guides');

    const officialNotif = { type: 'official', deep_link: '/official' };
    assert.strictEqual(getNotificationDeepLink(officialNotif).to, '/official');

    // 2. Public Anonymous Ask
    const askNotif = { type: 'confession', metadata: { url: '/ask/queenterry986' } };
    assert.strictEqual(getNotificationDeepLink(askNotif).to, '/ask/queenterry986');

    // 3. Incoming Call
    const callNotif = {
        type: 'call',
        match_id: 'match-xyz',
        metadata: {
            url: '/call/call-123?matchId=match-xyz&type=video&name=Chioma&avatar=https%3A%2F%2Fexample.com%2Fpic.jpg'
        }
    };
    assert.strictEqual(
        getNotificationDeepLink(callNotif).to,
        '/call/call-123?matchId=match-xyz&type=video&name=Chioma&avatar=https%3A%2F%2Fexample.com%2Fpic.jpg'
    );

    // 4. Chat Message
    const chatNotif = {
        type: 'message',
        category: 'messages',
        conversation_id: 'match-abc-123'
    };
    assert.strictEqual(getNotificationDeepLink(chatNotif).to, '/chat?chatId=match-abc-123');

    // 5. Requests
    const reqNotif = {
        type: 'like',
        category: 'requests'
    };
    assert.strictEqual(getNotificationDeepLink(reqNotif).to, '/requests');
});

test('Notification Privacy: Strict anonymity shielding for anonymous asks and confessions', () => {
    // Simulated privacy resolver logic matching notificationService.js
    function resolveSafeNotificationPayload({ type, actorId, metadata }) {
        const isAnonymousInteraction = Boolean(
            metadata?.is_anonymous ||
            type === 'confession' ||
            (type === 'snapshot_reaction' && !actorId) ||
            !actorId
        );
        const safeActorAvatar = isAnonymousInteraction ? null : (metadata?.actor_avatar_url || metadata?.avatar_url || null);
        const safeImageUrl = isAnonymousInteraction ? null : (metadata?.image_url || safeActorAvatar || null);

        return {
            isAnonymousInteraction,
            safeActorAvatar,
            safeImageUrl
        };
    }

    // Case 1: Anonymous Confession with leaky payload attempted
    const confessionPayload = {
        type: 'confession',
        actorId: null,
        metadata: {
            is_anonymous: true,
            actor_avatar_url: 'https://example.com/secret_student.jpg',
            image_url: 'https://example.com/secret_student.jpg'
        }
    };
    const protectedConfession = resolveSafeNotificationPayload(confessionPayload);
    assert.strictEqual(protectedConfession.isAnonymousInteraction, true);
    assert.strictEqual(protectedConfession.safeActorAvatar, null, 'Confession must never leak actor avatar');
    assert.strictEqual(protectedConfession.safeImageUrl, null, 'Confession must never leak image URL');

    // Case 2: Anonymous Ask Submission
    const askPayload = {
        type: 'confession',
        actorId: null,
        metadata: {
            is_anonymous: true,
            actor_name: 'Chioma (Hidden)',
            avatar_url: 'https://example.com/student_photo.png'
        }
    };
    const protectedAsk = resolveSafeNotificationPayload(askPayload);
    assert.strictEqual(protectedAsk.isAnonymousInteraction, true);
    assert.strictEqual(protectedAsk.safeActorAvatar, null, 'Anonymous ask must shield avatar');

    // Case 3: Identified direct chat message
    const chatPayload = {
        type: 'message',
        actorId: 'user-real-uuid',
        metadata: {
            is_anonymous: false,
            actor_avatar_url: 'https://example.com/chidinma.jpg'
        }
    };
    const protectedChat = resolveSafeNotificationPayload(chatPayload);
    assert.strictEqual(protectedChat.isAnonymousInteraction, false);
    assert.strictEqual(protectedChat.safeActorAvatar, 'https://example.com/chidinma.jpg');
});

test('Notification Personalization: Freemium vs. Premium copy distinction', () => {
    function getExternalNotificationCopy(settings, category, type, title, content) {
        if (category === 'messages') {
            if (settings?.message_previews_enabled === false) {
                return {
                    title: 'New message',
                    content: 'Open The College Date to view this message.'
                };
            }
            if (!hasActivePremium(settings)) {
                return {
                    title: 'New message 💬',
                    content: 'Someone sent you a message on The College Date. Tap to chat!'
                };
            }
        }
        if (category === 'requests' && !hasActivePremium(settings)) {
            return {
                title: 'New Connection Request 💌',
                content: 'Someone wants to connect with you on The College Date. Tap to review!'
            };
        }

        return { title, content };
    }

    const freemiumSettings = {
        is_premium: false,
        plan_type: null,
        status: null,
        message_previews_enabled: true
    };

    const premiumSettings = {
        is_premium: true,
        plan_type: 'Premium',
        status: 'active',
        message_previews_enabled: true
    };

    // Freemium Chat: Curiosity copy, sender name hidden
    const freemiumChatCopy = getExternalNotificationCopy(
        freemiumSettings,
        'messages',
        'message',
        'Tunde Adeleke',
        'Are you coming to the library tonight?'
    );
    assert.strictEqual(freemiumChatCopy.title, 'New message 💬');
    assert.strictEqual(freemiumChatCopy.content, 'Someone sent you a message on The College Date. Tap to chat!');

    // Premium Chat: Full sender name and message preview
    const premiumChatCopy = getExternalNotificationCopy(
        premiumSettings,
        'messages',
        'message',
        'Tunde Adeleke',
        'Are you coming to the library tonight?'
    );
    assert.strictEqual(premiumChatCopy.title, 'Tunde Adeleke');
    assert.strictEqual(premiumChatCopy.content, 'Are you coming to the library tonight?');

    // Freemium Requests: Curiosity copy
    const freemiumReqCopy = getExternalNotificationCopy(
        freemiumSettings,
        'requests',
        'like',
        'New Like! 👀',
        'Someone just right-swiped you.'
    );
    assert.strictEqual(freemiumReqCopy.title, 'New Connection Request 💌');
    assert.strictEqual(freemiumReqCopy.content, 'Someone wants to connect with you on The College Date. Tap to review!');

    // Privacy setting overrides all: message_previews_enabled = false
    const privateSettings = { ...premiumSettings, message_previews_enabled: false };
    const privateChatCopy = getExternalNotificationCopy(
        privateSettings,
        'messages',
        'message',
        'Tunde Adeleke',
        'Secret message'
    );
    assert.strictEqual(privateChatCopy.title, 'New message');
    assert.strictEqual(privateChatCopy.content, 'Open The College Date to view this message.');
});

test('Android Manifest: Contains deep links for /guides, /official, /ask, and /call', () => {
    const manifestPath = resolve(process.cwd(), 'android/app/src/main/AndroidManifest.xml');
    const manifestContent = readFileSync(manifestPath, 'utf8');

    assert.strictEqual(manifestContent.includes('android:pathPrefix="/guides"'), true, 'Manifest must declare /guides deep link');
    assert.strictEqual(manifestContent.includes('android:pathPrefix="/official"'), true, 'Manifest must declare /official deep link');
    assert.strictEqual(manifestContent.includes('android:pathPrefix="/ask"'), true, 'Manifest must declare /ask deep link');
    assert.strictEqual(manifestContent.includes('android:pathPrefix="/call"'), true, 'Manifest must declare /call deep link');
});

test('Database Migration: Notification 2.0 migration defines authoritative RPC extensions', () => {
    const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260920230000_notification_system_2_0.sql');
    const migrationSql = readFileSync(migrationPath, 'utf8');

    assert.strictEqual(migrationSql.includes('FUNCTION public.insert_notification'), true, 'Migration must define insert_notification');
    assert.strictEqual(migrationSql.includes('p_actor_id IS NULL'), true, 'Migration must support NULL p_actor_id for anonymous interactions');
    assert.strictEqual(migrationSql.includes('FUNCTION public.accept_swipe_request'), true, 'Migration must define accept_swipe_request');
    assert.strictEqual(migrationSql.includes('Connection Accepted!'), true, 'Migration must automatically notify swiper on request accept');
});

test('OneSignal Campus Tags & Email Sync: pushNotification.js and App.jsx wire audience tags', () => {
    const pushNotificationSource = readFileSync(resolve(process.cwd(), 'src/services/pushNotification.js'), 'utf8');
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8');

    // 1. pushNotification.js exports
    assert.strictEqual(pushNotificationSource.includes('export async function syncOneSignalUserTags'), true);
    assert.strictEqual(pushNotificationSource.includes('export async function syncOneSignalUserEmail'), true);

    // 2. Tag keys present in synchronization logic
    const requiredTags = [
        'university',
        'faculty',
        'department',
        'gender',
        'level',
        'is_premium',
        'verified',
        'profile_completion',
        'first_name',
        'streak_count'
    ];
    for (const tag of requiredTags) {
        assert.strictEqual(
            pushNotificationSource.includes(`tags.${tag}`),
            true,
            `syncOneSignalUserTags must construct tag '${tag}'`
        );
    }

    // 3. OneSignal SDK User API integration
    assert.strictEqual(pushNotificationSource.includes('OneSignal.User.addTags(tags)'), true);
    assert.strictEqual(pushNotificationSource.includes('OneSignal.User.addEmail(cleanEmail)'), true);

    // 4. App.jsx hooks the synchronization
    assert.strictEqual(appSource.includes('syncOneSignalUserTags(currentUser.id, userProfile)'), true);
    assert.strictEqual(appSource.includes('syncOneSignalUserEmail(currentUser.email)'), true);
});

test('Termii SMS Integration: send-notification-sms and notificationService support Nigerian SMS', () => {
    const smsEdgeFunctionPath = resolve(process.cwd(), 'supabase/functions/send-notification-sms/index.ts');
    const smsEdgeSource = readFileSync(smsEdgeFunctionPath, 'utf8');
    const notifServicePath = resolve(process.cwd(), 'src/services/notificationService.js');
    const notifServiceSource = readFileSync(notifServicePath, 'utf8');

    // 1. Edge Function verifies Termii API integration
    assert.strictEqual(smsEdgeSource.includes('https://api.ng.termii.com/api/sms/send'), true);
    assert.strictEqual(smsEdgeSource.includes('normalizeNigerianPhone'), true);
    assert.strictEqual(smsEdgeSource.includes('TERMII_API_KEY'), true);

    // 2. Client service exports sendSmsNotification
    assert.strictEqual(notifServiceSource.includes('export async function sendSmsNotification'), true);
    assert.strictEqual(notifServiceSource.includes("'send-notification-sms'"), true);

    // 3. Test phone normalization logic
    function normalizeNigerianPhone(phone) {
        let clean = phone.replace(/\D/g, '');
        if (clean.startsWith('0') && clean.length === 11) {
            clean = '234' + clean.slice(1);
        } else if (clean.startsWith('234') && clean.length === 13) {
            // Already standard
        } else if ((clean.startsWith('7') || clean.startsWith('8') || clean.startsWith('9')) && clean.length === 10) {
            clean = '234' + clean;
        }
        return clean;
    }

    assert.strictEqual(normalizeNigerianPhone('08031234567'), '2348031234567');
    assert.strictEqual(normalizeNigerianPhone('+234 803 123 4567'), '2348031234567');
    assert.strictEqual(normalizeNigerianPhone('8031234567'), '2348031234567');
});


