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

import { PREMIER_CAMPUSES, getCampusLeaderboard } from '../src/utils/campusLeaderboard.js';
import { WOULD_YOU_RATHER_PRESETS, TWO_TRUTHS_IDEAS } from '../src/utils/miniGames.js';
import { CAMPUS_VIBE_BADGES, getUserVibeEndorsements, endorseUserVibe } from '../src/utils/profileData.js';
import { getCampusPrimetimeStatus } from '../src/utils/campusPrimetime.js';

test('Gamification Phase 2: Clash of Campuses Inter-University Rivalry', () => {
    // 1. Campus Catalog
    assert.ok(Array.isArray(PREMIER_CAMPUSES), 'PREMIER_CAMPUSES must be an array');
    assert.ok(PREMIER_CAMPUSES.length >= 8, 'Must include at least 8 premier Nigerian universities');

    const unilag = PREMIER_CAMPUSES.find(c => c.shortName === 'UNILAG');
    assert.ok(unilag, 'UNILAG must exist in PREMIER_CAMPUSES');
    assert.ok(unilag.regex.test('University of Lagos (UNILAG)'), 'Regex must match full name');
    assert.ok(unilag.regex.test('unilag'), 'Regex must match abbreviation');

    // 2. Leaderboard Aggregation
    const mockUsers = [
        { university: 'University of Lagos', premium_swipes_received: 20, total_spent: 5000 },
        { university: 'Obafemi Awolowo University', premium_swipes_received: 10, total_spent: 0 },
        { university: 'Covenant University (CU)', premium_swipes_received: 15, total_spent: 2000 }
    ];

    const leaderboard = getCampusLeaderboard(mockUsers);
    assert.ok(Array.isArray(leaderboard), 'getCampusLeaderboard must return an array');
    assert.equal(leaderboard[0].rank, 1, 'Top campus must be rank 1');
    assert.ok(leaderboard[0].score >= leaderboard[1].score, 'Leaderboard must be sorted descending');

    // 3. UI integration
    const lbSrc = fs.readFileSync(path.resolve('src/pages/Leaderboard.jsx'), 'utf8');
    const lbCss = fs.readFileSync(path.resolve('src/pages/Leaderboard.css'), 'utf8');

    assert.ok(lbSrc.includes("Campuses 🏛️"), 'Leaderboard.jsx must render Campuses tab');
    assert.ok(lbSrc.includes('campus-clash-banner'), 'Leaderboard.jsx must render campus-clash-banner');
    assert.ok(lbSrc.includes('campus-podium-container'), 'Leaderboard.jsx must render campus podium');
    assert.ok(lbCss.includes('.campus-clash-banner'), 'Leaderboard.css must style clash banner');
    assert.ok(lbCss.includes('html[data-theme="light"] .campus-clash-banner'), 'Leaderboard.css must style clash banner for light theme');
});

test('Gamification Phase 2: In-Chat Interactive Vibe Mini-Games', () => {
    // 1. Presets validation
    assert.ok(Array.isArray(WOULD_YOU_RATHER_PRESETS), 'WOULD_YOU_RATHER_PRESETS must be an array');
    assert.ok(WOULD_YOU_RATHER_PRESETS.length >= 6, 'Must have at least 6 Would You Rather presets');
    assert.ok(WOULD_YOU_RATHER_PRESETS[0].optionA && WOULD_YOU_RATHER_PRESETS[0].optionB, 'Options must be defined');

    assert.ok(Array.isArray(TWO_TRUTHS_IDEAS), 'TWO_TRUTHS_IDEAS must be an array');
    assert.ok(TWO_TRUTHS_IDEAS.length >= 6, 'Must have at least 6 ideas');

    // 2. Chat.jsx integration
    const chatSrc = fs.readFileSync(path.resolve('src/pages/Chat.jsx'), 'utf8');
    assert.ok(chatSrc.includes('ChatMiniGameModal'), 'Chat.jsx must import ChatMiniGameModal');
    assert.ok(chatSrc.includes('ChatMiniGameCard'), 'Chat.jsx must import ChatMiniGameCard');
    assert.ok(chatSrc.includes("case 'mini_game':"), 'Chat.jsx must handle mini_game message type');
    assert.ok(chatSrc.includes('circle-game'), 'Chat.jsx must render games button in attachment grid');

    // 3. Mini-Game components exist
    const modalSrc = fs.readFileSync(path.resolve('src/components/ChatMiniGameModal.jsx'), 'utf8');
    const cardSrc = fs.readFileSync(path.resolve('src/components/ChatMiniGameCard.jsx'), 'utf8');
    assert.ok(modalSrc.includes('would_you_rather'), 'Modal must support would_you_rather');
    assert.ok(modalSrc.includes('two_truths_lie'), 'Modal must support two_truths_lie');
    assert.ok(cardSrc.includes('handleWyrVote'), 'Card must handle Would You Rather voting');
    assert.ok(cardSrc.includes('handleGuessLie'), 'Card must handle 2 Truths guess');
});

test('Gamification Phase 2: Peer Campus Endorsement Badges', () => {
    // 1. Badges catalog
    assert.ok(Array.isArray(CAMPUS_VIBE_BADGES), 'CAMPUS_VIBE_BADGES must be an array');
    assert.ok(CAMPUS_VIBE_BADGES.length >= 6, 'Must define at least 6 campus vibe badges');

    const stepper = CAMPUS_VIBE_BADGES.find(b => b.id === 'stepper');
    assert.ok(stepper, 'Big Stepper badge must exist');

    // 2. Mock storage & endorsement mechanics
    const mockStorage = {};
    globalThis.window = {
        localStorage: {
            getItem: (k) => mockStorage[k] || null,
            setItem: (k, v) => { mockStorage[k] = String(v); }
        },
        dispatchEvent: () => true
    };

    const targetUser = 'student-test-uuid-456';
    const viewer1 = 'viewer-test-uuid-1';
    const viewer2 = 'viewer-test-uuid-2';

    // Endorse
    const success1 = endorseUserVibe(targetUser, 'stepper', viewer1);
    assert.equal(success1, true, 'First endorsement must succeed');

    // Duplicate endorsement by same viewer should be rejected
    const dup = endorseUserVibe(targetUser, 'stepper', viewer1);
    assert.equal(dup, false, 'Duplicate endorsement by same viewer must be rejected');

    // Second endorsement by another viewer succeeds
    const success2 = endorseUserVibe(targetUser, 'stepper', viewer2);
    assert.equal(success2, true, 'Second endorsement by another viewer must succeed');

    // 3. Retrieval
    const endorsements = getUserVibeEndorsements(targetUser, viewer1);
    const stepperData = endorsements.find(b => b.id === 'stepper');
    assert.ok(stepperData, 'Stepper data must be returned');
    assert.ok(stepperData.count >= 2, 'Count must reflect endorsements');
    assert.equal(stepperData.endorsedByMe, true, 'endorsedByMe must be true for viewer1');

    // 4. Profile.jsx integration
    const profileSrc = fs.readFileSync(path.resolve('src/pages/Profile.jsx'), 'utf8');
    assert.ok(profileSrc.includes('EndorseVibeModal'), 'Profile.jsx must import EndorseVibeModal');
    assert.ok(profileSrc.includes('campus-vibe-endorsements-section'), 'Profile.jsx must render campus-vibe-endorsements-section');
    assert.ok(profileSrc.includes('btn-endorse-vibe-cta'), 'Profile.jsx must render btn-endorse-vibe-cta');
});

test('Gamification Phase 2: Campus Primetime Hour & Countdown Banner', () => {
    // 1. Primetime Status Calculation
    const status = getCampusPrimetimeStatus();
    assert.equal(typeof status.isLive, 'boolean', 'isLive must be boolean');
    assert.ok(status.label, 'status must have label');
    assert.ok(status.countdown, 'status must have countdown string');
    assert.ok(status.headline.includes('Primetime'), 'headline must mention Primetime');

    // 2. Integration in Match.jsx and Dashboard.jsx
    const matchSrc = fs.readFileSync(path.resolve('src/pages/Match.jsx'), 'utf8');
    const dashSrc = fs.readFileSync(path.resolve('src/pages/Dashboard.jsx'), 'utf8');

    assert.ok(matchSrc.includes('CampusPrimetimeBanner'), 'Match.jsx must render CampusPrimetimeBanner');
    assert.ok(dashSrc.includes('CampusPrimetimeBanner'), 'Dashboard.jsx must render CampusPrimetimeBanner');
});

import { 
    getSundayMidnightCountdown 
} from '../src/utils/campusLeaderboard.js';
import { 
    MYSTERY_ALIASES, 
    MYSTERY_ICEBREAKERS, 
    getMysteryAlias, 
    getStageBlurStyle,
    formatMysteryCandidate 
} from '../src/utils/mysteryMatch.js';

test('Gamification Phase 3: Clash of Campuses Sunday Midnight Automated Reward Engine', () => {
    // 1. Sunday Countdown Utility
    const countdown = getSundayMidnightCountdown();
    assert.ok(countdown.diffMs >= 0, 'diffMs must be non-negative');
    assert.ok(countdown.formatted.includes('remaining'), 'formatted string must have remaining');
    assert.equal(typeof countdown.totalHours, 'number');

    // 2. Migration Schema & RPCs Integrity
    const migrationPath = path.resolve('supabase/migrations/20261021150000_campus_clash_rewards_and_mystery_match.sql');
    assert.ok(fs.existsSync(migrationPath), 'Phase 3 migration must exist');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.campus_clash_weekly_results'), 'Must create campus_clash_weekly_results');
    assert.ok(migrationSql.includes('FUNCTION public.distribute_weekly_campus_clash_rewards'), 'Must define distribute_weekly_campus_clash_rewards');
    assert.ok(migrationSql.includes("'24h_boost'"), 'Must award 24h_boost in public.boosts');
    assert.ok(migrationSql.includes('FUNCTION public.get_campus_clash_current_status'), 'Must define get_campus_clash_current_status');
    assert.ok(migrationSql.includes('FUNCTION public.create_or_advance_mystery_match'), 'Must define create_or_advance_mystery_match');

    // 3. Leaderboard UI & CSS
    const lbSrc = fs.readFileSync(path.resolve('src/pages/Leaderboard.jsx'), 'utf8');
    const lbCss = fs.readFileSync(path.resolve('src/pages/Leaderboard.css'), 'utf8');

    assert.ok(lbSrc.includes('fetchCampusClashWeeklyStatus'), 'Leaderboard.jsx must call fetchCampusClashWeeklyStatus');
    assert.ok(lbSrc.includes('clash-countdown-pill'), 'Leaderboard.jsx must render clash-countdown-pill');
    assert.ok(lbCss.includes('.clash-countdown-pill'), 'Leaderboard.css must style countdown pill');
    assert.ok(lbCss.includes('.clash-champion-active-pill'), 'Leaderboard.css must style active champion pill');
    assert.ok(lbCss.includes('html[data-theme="light"] .clash-countdown-pill'), 'Must provide Light Theme styling');
});

test('Gamification Phase 3: Campus Primetime Mystery Match (Blind Date Speed Hour)', () => {
    // 1. Mystery Persona Catalogs & Generators
    assert.ok(Array.isArray(MYSTERY_ALIASES), 'MYSTERY_ALIASES must be array');
    assert.ok(MYSTERY_ALIASES.length >= 6, 'Must define at least 6 mystery aliases');
    assert.ok(Array.isArray(MYSTERY_ICEBREAKERS), 'MYSTERY_ICEBREAKERS must be array');
    assert.ok(MYSTERY_ICEBREAKERS.length >= 4, 'Must define collegiate speed-date icebreakers');

    const alias = getMysteryAlias('student_123');
    assert.ok(typeof alias === 'string' && alias.length > 0);

    // 2. Progressive 3-Stage Blur Calculations
    const stage0 = getStageBlurStyle(0);
    assert.equal(stage0.filter, 'blur(24px)', 'Stage 0 must be heavily blurred (24px)');
    assert.equal(stage0.percentage, 0);

    const stage1 = getStageBlurStyle(1);
    assert.equal(stage1.filter, 'blur(12px)', 'Stage 1 must reduce blur to 12px');
    assert.equal(stage1.percentage, 33);

    const stage2 = getStageBlurStyle(2);
    assert.equal(stage2.filter, 'blur(5px)', 'Stage 2 must reduce blur to 5px');
    assert.equal(stage2.percentage, 66);

    const stage3 = getStageBlurStyle(3);
    assert.equal(stage3.filter, 'blur(0px)', 'Stage 3 must unblur completely (0px)');
    assert.equal(stage3.percentage, 100);

    // 3. Format candidate
    const mockProfile = {
        id: 'usr_test_789',
        full_name: 'Amina Bello',
        gender: 'female',
        university: 'University of Lagos (UNILAG)',
        faculty: 'Faculty of Law',
        level: '300L',
        avatar_url: 'https://example.com/avatar.jpg'
    };
    const formatted = formatMysteryCandidate(mockProfile);
    assert.equal(formatted.realName, 'Amina Bello');
    assert.ok(formatted.maskedName.includes(' ') || formatted.maskedName.includes('🎭'));
    assert.ok(formatted.mysteryIcebreaker.length > 5);
    assert.equal(formatted.displayFaculty, 'Faculty of Law • 300L');

    // 4. Modal Component & Banner Integration
    const modalSrc = fs.readFileSync(path.resolve('src/components/CampusMysteryMatchModal.jsx'), 'utf8');
    const modalCss = fs.readFileSync(path.resolve('src/components/CampusMysteryMatchModal.css'), 'utf8');
    const bannerSrc = fs.readFileSync(path.resolve('src/components/CampusPrimetimeBanner.jsx'), 'utf8');

    assert.ok(modalSrc.includes('CampusMysteryMatchModal'), 'Must define CampusMysteryMatchModal');
    assert.ok(modalSrc.includes('mystery-stepper'), 'Must render mystery-stepper');
    assert.ok(modalSrc.includes('mystery-chat-feed'), 'Must render fast chat feed');
    assert.ok(modalSrc.includes('handleSendMessage'), 'Must handle message sending');
    assert.ok(modalCss.includes('.mystery-modal-container'), 'Must style mystery modal container');
    assert.ok(modalCss.includes('html[data-theme="light"] .mystery-modal-container'), 'Must support light theme');

    assert.ok(bannerSrc.includes('primetime-mystery-btn'), 'CampusPrimetimeBanner must have speed date button');
    assert.ok(bannerSrc.includes('CampusMysteryMatchModal'), 'CampusPrimetimeBanner must embed modal');
});

