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
