import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    sanitizeTelemetryPayload,
    trackEvent,
    getStoredTelemetry,
    clearTelemetry,
    hasTrackedEvent,
    getEventCount,
    TELEMETRY_EVENTS
} from '../src/services/telemetryService.js';

import {
    evaluateStreakTransition,
    getDaysDifference,
    MAX_MONTHLY_FREEZE_TOKENS
} from '../src/utils/scoreStreak.js';

import {
    getWhyYouMatchBadge,
    getCampusCommonGround,
    formatStudentLevel,
    formatDepartmentName,
    getCampusDailyPrompt,
    CAMPUS_DAILY_PROMPTS
} from '../src/utils/campusCommonGround.js';


const projectRoot = process.cwd();

test('Phase 2 Telemetry: sanitizeTelemetryPayload strips all PII fields', () => {
    const raw = {
        email: 'student@unilag.edu.ng',
        password: 'supersecretpass',
        phone: '+2348012345678',
        nin: '12345678901',
        bvn: '22334455667',
        message: 'private text message',
        campus: 'UNILAG',
        step: 2,
        is_native: true
    };

    const sanitized = sanitizeTelemetryPayload(raw);
    assert.equal(sanitized.email, undefined);
    assert.equal(sanitized.password, undefined);
    assert.equal(sanitized.phone, undefined);
    assert.equal(sanitized.nin, undefined);
    assert.equal(sanitized.bvn, undefined);
    assert.equal(sanitized.message, undefined);

    // Safe scalar properties preserved
    assert.equal(sanitized.campus, 'UNILAG');
    assert.equal(sanitized.step, 2);
    assert.equal(sanitized.is_native, true);
});

test('Phase 2 Telemetry: trackEvent increments counts and tracks milestones idempotently', () => {
    clearTelemetry();

    const res1 = trackEvent(TELEMETRY_EVENTS.LANDING_VIEW, { source: 'organic' });
    assert.equal(res1.event, 'landing_view');
    assert.equal(res1.count, 1);
    assert.equal(res1.isFirstTime, true);

    const res2 = trackEvent(TELEMETRY_EVENTS.LANDING_VIEW, { source: 'organic' });
    assert.equal(res2.count, 2);
    assert.equal(res2.isFirstTime, false);

    assert.equal(hasTrackedEvent(TELEMETRY_EVENTS.LANDING_VIEW), true);
    assert.equal(getEventCount(TELEMETRY_EVENTS.LANDING_VIEW), 2);

    const matchRes = trackEvent(TELEMETRY_EVENTS.FIRST_MATCH);
    assert.equal(matchRes.event, 'first_match');
    assert.equal(hasTrackedEvent('first_match'), true);

    clearTelemetry();
});

test('Phase 2 Discovery: getWhyYouMatchBadge produces accurate contextual pills', () => {
    // 1. Same campus and same department
    const me = {
        university: 'University of Lagos',
        department: 'Economics',
        level: '300L',
        interests: ['Books', 'Football']
    };
    const otherSame = {
        university: 'University of Lagos',
        department: 'Department of Economics',
        level: '300L',
        interests: ['Music', 'Football']
    };
    assert.equal(getWhyYouMatchBadge(otherSame, me), '🏛️ Same Campus & Dept (Economics)');

    // 2. Same campus, different department
    const otherUniOnly = {
        university: 'University of Lagos',
        department: 'Law',
        level: '200L',
        interests: ['Tech']
    };
    assert.equal(getWhyYouMatchBadge(otherUniOnly, me), '🏛️ Both at University of Lagos');

    // 3. Different campus, same department
    const otherDeptOnly = {
        university: 'University of Ibadan',
        department: 'Economics',
        level: '400L',
        interests: ['Design']
    };
    assert.equal(getWhyYouMatchBadge(otherDeptOnly, me), '📚 Both study Economics');

    // 4. Different campus and department, but shared interest
    const otherInterestOnly = {
        university: 'FUTA',
        department: 'Computer Science',
        level: '100L',
        interests: ['football', 'Gaming']
    };
    assert.equal(getWhyYouMatchBadge(otherInterestOnly, me), '✨ Both love football');

    // 5. Null safety
    assert.equal(getWhyYouMatchBadge(null, me), null);
    assert.equal(getWhyYouMatchBadge(me, null), null);
});

test('Phase 3 Retention: evaluateStreakTransition supports monthly exam-period freeze tokens', () => {
    // Case A: Consecutive day (daysDiff === 1) -> normal increment
    const day1Transition = evaluateStreakTransition({
        lastActivityDate: '2026-10-08',
        todayDate: '2026-10-09',
        currentStreak: 5,
        longestStreak: 5,
        freezeTokensAvailable: 1
    });
    assert.equal(day1Transition.currentStreak, 6);
    assert.equal(day1Transition.freezeUsed, false);
    assert.equal(day1Transition.streakPreservedByFreeze, false);
    assert.equal(day1Transition.freezeTokensAvailable, 1);

    // Case B: Missed 1 day (daysDiff === 2) with available freeze token -> streak preserved!
    const freezeTransition = evaluateStreakTransition({
        lastActivityDate: '2026-10-07',
        todayDate: '2026-10-09',
        currentStreak: 5,
        longestStreak: 5,
        freezeTokensAvailable: 1,
        freezeUsedMonth: null
    });
    assert.equal(freezeTransition.currentStreak, 6);
    assert.equal(freezeTransition.freezeUsed, true);
    assert.equal(freezeTransition.streakPreservedByFreeze, true);
    assert.equal(freezeTransition.freezeTokensAvailable, 0);
    assert.equal(freezeTransition.freezeUsedMonth, '2026-10');

    // Case C: Missed 1 day (daysDiff === 2) but ZERO freeze tokens -> reset to 1
    const resetTransition = evaluateStreakTransition({
        lastActivityDate: '2026-10-07',
        todayDate: '2026-10-09',
        currentStreak: 5,
        longestStreak: 5,
        freezeTokensAvailable: 0,
        freezeUsedMonth: '2026-10'
    });
    assert.equal(resetTransition.currentStreak, 1);
    assert.equal(resetTransition.streakReset, true);
    assert.equal(resetTransition.freezeUsed, false);

    // Case D: New calendar month replenishes freeze tokens
    const monthReplenish = evaluateStreakTransition({
        lastActivityDate: '2026-11-01',
        todayDate: '2026-11-01',
        currentStreak: 6,
        longestStreak: 6,
        freezeTokensAvailable: 0,
        freezeUsedMonth: '2026-10' // Previous month
    });
    assert.equal(monthReplenish.freezeTokensAvailable, MAX_MONTHLY_FREEZE_TOKENS);
});

test('Phase 3 Campus Prompts: getCampusDailyPrompt returns valid daily questions and categories', () => {
    assert.ok(CAMPUS_DAILY_PROMPTS.length >= 7, 'Has at least 7 rotating campus daily prompts');

    const promptToday = getCampusDailyPrompt(new Date('2026-10-09'));
    assert.ok(promptToday.id, 'Prompt has id');
    assert.ok(promptToday.question, 'Prompt has question text');
    assert.ok(promptToday.category, 'Prompt has category');

    const promptTomorrow = getCampusDailyPrompt(new Date('2026-10-10'));
    assert.ok(promptTomorrow.question);
});

test('Phase 2 & 3 UI Integration: SwipeCard, Match, MatchCelebration, Confessions, and Landing', () => {
    const swipeCardJsx = fs.readFileSync(path.join(projectRoot, 'src/components/SwipeCard.jsx'), 'utf8');
    const swipeCardCss = fs.readFileSync(path.join(projectRoot, 'src/components/SwipeCard.css'), 'utf8');
    const matchJsx = fs.readFileSync(path.join(projectRoot, 'src/pages/Match.jsx'), 'utf8');
    const matchCelebrationJsx = fs.readFileSync(path.join(projectRoot, 'src/components/MatchCelebration.jsx'), 'utf8');
    const confessionsJsx = fs.readFileSync(path.join(projectRoot, 'src/pages/Confessions.jsx'), 'utf8');
    const landingJsx = fs.readFileSync(path.join(projectRoot, 'src/pages/Landing.jsx'), 'utf8');

    // 1. SwipeCard renders why-you-match-tag
    assert.match(swipeCardJsx, /getWhyYouMatchBadge/);
    assert.match(swipeCardJsx, /why-you-match-tag/);
    assert.match(swipeCardCss, /\.why-you-match-tag/);

    // 2. Match empty deck provides campus fallbacks
    assert.match(matchJsx, /empty-deck-actions-grid/);
    assert.match(matchJsx, /Read Campus Confessions/);
    assert.match(matchJsx, /Explore Campus Directory/);

    // 3. MatchCelebration provides Invite Friends button
    assert.match(matchCelebrationJsx, /btn-match-invite/);
    assert.match(matchCelebrationJsx, /Invite Friends to College Date/);

    // 4. Confessions renders Campus Daily Question
    assert.match(confessionsJsx, /campus-daily-prompt-card/);
    assert.match(confessionsJsx, /Campus Daily Question/);
    assert.match(confessionsJsx, /Answer Prompt/);

    // 5. Landing mounts telemetry
    assert.match(landingJsx, /trackLandingView/);
    assert.match(landingJsx, /trackGuestDemoStart/);
});
