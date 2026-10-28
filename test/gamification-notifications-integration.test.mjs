import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    NOTIFICATION_CATEGORIES,
    getNotificationCategory,
    getNotificationIcon,
    getNotificationDeepLink
} from '../src/utils/notificationRouting.js';

import {
    STREAK_MILESTONES,
    STREAK_BADGES
} from '../src/utils/scoreStreak.js';

test('Gamification Notifications: Routing, Categories, and Icons', () => {
    // 1. Vibe Endorsement
    const vibeNotif = { type: 'vibe_endorsement' };
    assert.equal(getNotificationCategory(vibeNotif), NOTIFICATION_CATEGORIES.PROFILE_ACTIVITY);
    assert.equal(getNotificationIcon('vibe_endorsement'), '✨');
    assert.deepEqual(getNotificationDeepLink(vibeNotif), { to: '/profile' });

    // 2. Mini-Games
    const miniGameNotif = { type: 'mini_game', match_id: 'conv-123' };
    assert.equal(getNotificationCategory(miniGameNotif), NOTIFICATION_CATEGORIES.MESSAGES);
    assert.equal(getNotificationIcon('mini_game'), '🎮');

    const miniGameRespNotif = { type: 'mini_game_response', match_id: 'conv-456' };
    assert.equal(getNotificationCategory(miniGameRespNotif), NOTIFICATION_CATEGORIES.MESSAGES);
    assert.equal(getNotificationIcon('mini_game_response'), '🎮');
    assert.equal(getNotificationDeepLink(miniGameRespNotif).to, '/chat?chatId=conv-456');

    // 3. Daily Quest Rewards & Streak Milestones
    const questNotif = { type: 'quest_reward' };
    assert.equal(getNotificationCategory(questNotif), NOTIFICATION_CATEGORIES.ACCOUNT);
    assert.equal(getNotificationIcon('quest_reward'), '🎯');
    assert.deepEqual(getNotificationDeepLink(questNotif), { to: '/dashboard' });

    const streakNotif = { type: 'streak_milestone' };
    assert.equal(getNotificationCategory(streakNotif), NOTIFICATION_CATEGORIES.ACCOUNT);
    assert.equal(getNotificationIcon('streak_milestone'), '🔥');
    assert.deepEqual(getNotificationDeepLink(streakNotif), { to: '/dashboard' });

    // 4. Clash of Campuses & Mystery Match
    const clashNotif = { type: 'campus_clash_victory' };
    assert.equal(getNotificationCategory(clashNotif), NOTIFICATION_CATEGORIES.SYSTEM);
    assert.equal(getNotificationIcon('campus_clash_victory'), '🏆');
    assert.deepEqual(getNotificationDeepLink(clashNotif), { to: '/leaderboard' });

    const mysteryNotif = { type: 'mystery_match_revealed', match_id: 'match-789' };
    assert.equal(getNotificationCategory(mysteryNotif), NOTIFICATION_CATEGORIES.MATCHES);
    assert.equal(getNotificationIcon('mystery_match_revealed'), '🎉');
});

test('Gamification Notifications: Vibe Endorsement Modal Integration', () => {
    const modalSrc = fs.readFileSync(path.resolve('src/components/EndorseVibeModal.jsx'), 'utf8');
    const profileSrc = fs.readFileSync(path.resolve('src/pages/Profile.jsx'), 'utf8');

    assert.ok(modalSrc.includes('createNotification'), 'EndorseVibeModal must import and use createNotification');
    assert.ok(modalSrc.includes("type: 'vibe_endorsement'"), 'Must specify vibe_endorsement notification type');
    assert.ok(modalSrc.includes("category: 'social'"), 'Must specify social category');
    assert.ok(modalSrc.includes('badge_id: badge.id'), 'Must attach badge metadata');
    assert.ok(profileSrc.includes('currentUserProfile={myProfile}'), 'Profile.jsx must pass currentUserProfile');
});

test('Gamification Notifications: In-Chat Mini-Game Push Previews and Answer Notifications', () => {
    const chatServiceSrc = fs.readFileSync(path.resolve('src/services/chatService.js'), 'utf8');
    const miniGameCardSrc = fs.readFileSync(path.resolve('src/components/ChatMiniGameCard.jsx'), 'utf8');
    const chatPageSrc = fs.readFileSync(path.resolve('src/pages/Chat.jsx'), 'utf8');

    // 1. chatService snippet preview
    assert.ok(chatServiceSrc.includes("type === 'mini_game'"), 'chatService must recognize mini_game type');
    assert.ok(chatServiceSrc.includes("content || '🎮 Campus Mini-Game Challenge'"), 'chatService must use mini-game content as preview snippet');

    // 2. ChatMiniGameCard answer notifications
    assert.ok(miniGameCardSrc.includes('createNotification'), 'ChatMiniGameCard must import createNotification');
    assert.ok(miniGameCardSrc.includes("type: 'mini_game_response'"), 'ChatMiniGameCard must dispatch mini_game_response');
    assert.ok(miniGameCardSrc.includes('answered your Would You Rather'), 'WYR response title must be explicit');
    assert.ok(miniGameCardSrc.includes('spotted your lie') && miniGameCardSrc.includes('fell for your lie'), '2 Truths & Lie must notify on correct/wrong guess');

    // 3. Chat.jsx props
    assert.ok(chatPageSrc.includes('currentUserName={userProfile?.full_name?.split'), 'Chat.jsx must forward user display name');
});

test('Gamification Notifications: Daily Quests and Score Streak Milestones', () => {
    const questsSrc = fs.readFileSync(path.resolve('src/components/CampusQuestsCard.jsx'), 'utf8');
    const streakSrc = fs.readFileSync(path.resolve('src/services/scoreStreakService.js'), 'utf8');
    const emailFuncSrc = fs.readFileSync(path.resolve('supabase/functions/send-notification-email/index.ts'), 'utf8');

    // 1. Quests bonus claim notification
    assert.ok(questsSrc.includes('createNotification'), 'CampusQuestsCard must import createNotification');
    assert.ok(questsSrc.includes("type: 'quest_reward'"), 'Must specify quest_reward type');
    assert.ok(questsSrc.includes('quest_bonus:'), 'Must include deduplication key');

    // 2. Score streak milestone notification
    assert.ok(streakSrc.includes('createNotification'), 'scoreStreakService must import createNotification');
    assert.ok(streakSrc.includes("type: 'streak_milestone'"), 'Must specify streak_milestone type');
    assert.ok(streakSrc.includes('streak_milestone:'), 'Must include deduplication key');
    assert.ok(streakSrc.includes('STREAK_BADGES'), 'Must resolve milestone badge');

    // 3. Email action labels
    assert.ok(emailFuncSrc.includes('case "vibe_endorsement":'), 'send-notification-email must handle vibe_endorsement');
    assert.ok(emailFuncSrc.includes('case "quest_reward":') && emailFuncSrc.includes('case "streak_milestone":'), 'send-notification-email must handle quest & streak');
    assert.ok(emailFuncSrc.includes('case "mini_game":'), 'send-notification-email must handle mini_game');
});

test('Closed-App Retention: Rich Big-Picture, Action Buttons, and Re-Engagement Loops', () => {
    const pushFuncSrc = fs.readFileSync(path.resolve('supabase/functions/send-notification-push/index.ts'), 'utf8');
    const pushServiceSrc = fs.readFileSync(path.resolve('src/services/pushNotification.js'), 'utf8');
    const swipeServiceSrc = fs.readFileSync(path.resolve('src/services/swipeService.js'), 'utf8');
    const notifyEventSrc = fs.readFileSync(path.resolve('supabase/functions/notify-on-event/index.ts'), 'utf8');

    // 1. send-notification-push: Big-picture media preview
    assert.ok(pushFuncSrc.includes('notificationPayload.big_picture = safeImageUrl'), 'Must set big_picture for expanded Android card');
    assert.ok(pushFuncSrc.includes('notificationPayload.chrome_web_image = safeImageUrl'), 'Must set chrome_web_image for Web push');

    // 2. send-notification-push: Interactive action buttons
    assert.ok(pushFuncSrc.includes('actionButtons.push({ id: "reply", text: "💬 Reply" })'), 'Must support direct message reply action');
    assert.ok(pushFuncSrc.includes('actionButtons.push({ id: "say_hi", text: "💬 Say Hi" })'), 'Must support match say hi action');
    assert.ok(pushFuncSrc.includes('actionButtons.push({ id: "see_admirer", text: "👀 See Admirers" })'), 'Must support admirer review action');
    assert.ok(pushFuncSrc.includes('actionButtons.push({ id: "play_back", text: "🎮 Answer Game" })'), 'Must support mini-game quick answer action');
    assert.ok(pushFuncSrc.includes('notificationPayload.buttons = actionButtons'), 'Must attach buttons to OneSignal payload');

    // 3. send-notification-push: Curiosity-gap copy
    assert.ok(pushFuncSrc.includes('New Admirer on Campus! ✨'), 'Must support campus admirer intrigue copy');
    assert.ok(pushFuncSrc.includes('liked your profile. Tap to see who it is!'), 'Must generate curious prompt with faculty/campus');

    // 4. pushNotification.js: Action ID routing
    assert.ok(pushServiceSrc.includes("actionId === 'see_admirer'"), 'pushNotification.js must route see_admirer to /requests');
    assert.ok(pushServiceSrc.includes("actionId === 'reply'"), 'pushNotification.js must route reply to /chat with focus');
    assert.ok(pushServiceSrc.includes("actionId === 'claim_reward'"), 'pushNotification.js must route claim_reward to /dashboard');

    // 5. swipeService.js: Passes swiperProfile metadata
    assert.ok(swipeServiceSrc.includes('actor_faculty: actorFaculty'), 'swipeService must pass actor faculty metadata');
    assert.ok(swipeServiceSrc.includes('actor_university: actorUniversity'), 'swipeService must pass actor university metadata');

    // 6. notify-on-event: Re-engagement loops & production URLs
    assert.ok(notifyEventSrc.includes("payload.type === 'STREAK_PROTECTOR'"), 'Must handle STREAK_PROTECTOR evening loss-aversion loop');
    assert.ok(notifyEventSrc.includes("payload.type === 'PRIMETIME_SURGE'"), 'Must handle PRIMETIME_SURGE rush hour loop');
    assert.ok(!notifyEventSrc.includes('campusdate.app'), 'All legacy campusdate.app URLs must be modernized to thecollegedate.com');
});
