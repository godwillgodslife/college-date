import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    STREAK_MILESTONES,
    STREAK_BADGES,
    STREAK_PERKS,
    getStreakMilestonePerk,
    getNextMilestone
} from '../src/utils/scoreStreak.js';

import {
    DAILY_QUESTS_CONFIG,
    DAILY_QUESTS_COMPLETION_BONUS_COINS,
    getDailyQuests,
    recordQuestProgress,
    isAllQuestsCompleted,
    claimDailyQuestBonus,
    isDailyQuestBonusClaimed
} from '../src/services/campusQuestService.js';

test('Gamification: Score Streak Milestones & Tangible Perk Rewards', () => {
    // 1. Milestone stability check
    assert.deepStrictEqual(STREAK_MILESTONES, [7, 14, 30, 60, 100]);

    // 2. STREAK_PERKS definitions
    assert.ok(Array.isArray(STREAK_PERKS), 'STREAK_PERKS must be an array');
    assert.ok(STREAK_PERKS.length >= 5, 'Must define at least 5 streak perks');

    const day7Perk = STREAK_PERKS.find(p => p.days === 7);
    assert.ok(day7Perk, 'Day 7 perk must exist');
    assert.ok(day7Perk.perk.includes('Super Swipe'), 'Day 7 perk must award Super Swipe');

    const day14Perk = STREAK_PERKS.find(p => p.days === 14);
    assert.ok(day14Perk.perk.includes('Spotlight Boost'), 'Day 14 perk must award Spotlight Boost');

    // 3. Helper getStreakMilestonePerk
    assert.equal(typeof getStreakMilestonePerk(7), 'string');
    assert.ok(getStreakMilestonePerk(7).includes('Super Swipe'));
    assert.ok(getStreakMilestonePerk(30).includes('Gold VIP Frame'));
});

test('Gamification: ScoreStreakModal displays perks and light theme tokens', () => {
    const modalSrc = fs.readFileSync(path.resolve('src/components/ScoreStreakModal.jsx'), 'utf8');
    const cssSrc = fs.readFileSync(path.resolve('src/components/ScoreStreakModal.css'), 'utf8');

    assert.ok(modalSrc.includes('score-streak-perk-hint'), 'ScoreStreakModal must render score-streak-perk-hint');
    assert.ok(modalSrc.includes('milestones.find(m => m.days > streak)?.perk'), 'ScoreStreakModal must showcase next perk unlock');
    assert.ok(cssSrc.includes('.score-streak-perk-hint'), 'ScoreStreakModal.css must style perk hint');
    assert.ok(cssSrc.includes('html[data-theme="light"] .score-streak-perk-hint'), 'Must style perk hint for Light Theme');
});

test('Gamification: Campus Daily Quests Service mechanics & habit loops', () => {
    // 1. Config tests
    assert.equal(DAILY_QUESTS_CONFIG.length, 3, 'Must define exactly 3 daily campus quests');
    assert.equal(DAILY_QUESTS_COMPLETION_BONUS_COINS, 25, 'Completion bonus must be 25 coins');

    const questKeys = DAILY_QUESTS_CONFIG.map(q => q.id);
    assert.ok(questKeys.includes('quest_explore'), 'Must have quest_explore');
    assert.ok(questKeys.includes('quest_icebreaker'), 'Must have quest_icebreaker');
    assert.ok(questKeys.includes('quest_voice'), 'Must have quest_voice');

    // 2. In Node environment (mock window/localStorage)
    const mockStorage = {};
    globalThis.window = {
        localStorage: {
            getItem: (k) => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = String(v); }
        },
        dispatchEvent: () => true
    };

    const userId = 'user-test-uuid-123';
    let quests = getDailyQuests(userId);
    assert.equal(quests.length, 3);
    assert.equal(isAllQuestsCompleted(quests), false);

    // 3. Progress recording
    recordQuestProgress(userId, 'quest_explore', 5);
    recordQuestProgress(userId, 'quest_icebreaker', 1);
    recordQuestProgress(userId, 'quest_voice', 1);

    quests = getDailyQuests(userId);
    assert.equal(quests.find(q => q.id === 'quest_explore').completed, true);
    assert.equal(quests.find(q => q.id === 'quest_icebreaker').completed, true);
    assert.equal(quests.find(q => q.id === 'quest_voice').completed, true);
    assert.equal(isAllQuestsCompleted(quests), true);

    // 4. Claiming
    assert.equal(isDailyQuestBonusClaimed(userId), false);
    const claimed = claimDailyQuestBonus(userId);
    assert.equal(claimed, true);
    assert.equal(isDailyQuestBonusClaimed(userId), true);

    // Idempotent (cannot claim twice on the same day)
    const claimedAgain = claimDailyQuestBonus(userId);
    assert.equal(claimedAgain, false);
});

test('Cross-Page Flow: MatchCelebration embeds 1-Tap Campus Icebreakers', () => {
    const celebrationSrc = fs.readFileSync(path.resolve('src/components/MatchCelebration.jsx'), 'utf8');
    const celebrationCss = fs.readFileSync(path.resolve('src/components/MatchCelebration.css'), 'utf8');

    assert.ok(celebrationSrc.includes('getCampusIcebreakers'), 'Must import getCampusIcebreakers');
    assert.ok(celebrationSrc.includes('btn-icebreaker-chip'), 'Must render btn-icebreaker-chip buttons');
    assert.ok(celebrationSrc.includes('onMessage(text)'), 'Must pass selected icebreaker to onMessage');
    assert.ok(celebrationCss.includes('.btn-icebreaker-chip'), 'CSS must define .btn-icebreaker-chip');
});

test('Cross-Page Flow: Requests empty-state and Wallet contain navigation bridges', () => {
    const requestsSrc = fs.readFileSync(path.resolve('src/pages/Requests.jsx'), 'utf8');
    const requestsCss = fs.readFileSync(path.resolve('src/pages/Requests.css'), 'utf8');
    const walletSrc = fs.readFileSync(path.resolve('src/pages/Wallet.jsx'), 'utf8');

    // Requests discovery loop
    assert.ok(requestsSrc.includes('empty-requests-discovery-cta'), 'Requests.jsx must have empty-requests-discovery-cta');
    assert.ok(requestsSrc.includes("navigate('/match')"), 'Requests empty CTA must navigate to /match');
    assert.ok(requestsCss.includes('.empty-requests-discovery-cta'), 'Requests.css must style CTA');

    // Wallet ambassador league bridge
    assert.ok(walletSrc.includes('wallet-ambassador-boost-card'), 'Wallet.jsx must have wallet-ambassador-boost-card');
    assert.ok(walletSrc.includes("navigate('/referrals')"), 'Wallet boost card must navigate to /referrals');
});

test('Cross-Page Flow: Chat.jsx sets initialMessage from navigation state', () => {
    const chatSrc = fs.readFileSync(path.resolve('src/pages/Chat.jsx'), 'utf8');

    assert.ok(
        chatSrc.includes('location.state?.initialMessage') && chatSrc.includes('setNewMessage(location.state.initialMessage)'),
        'Chat.jsx must prefill newMessage when arriving with initialMessage'
    );
    assert.ok(
        chatSrc.includes("recordQuestProgress(currentUser.id, 'quest_icebreaker', 1)"),
        'Chat.jsx must record quest progress when sending a message'
    );
});
