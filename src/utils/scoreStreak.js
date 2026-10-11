export const STREAK_MILESTONES = [7, 14, 30, 60, 100];

export const STREAK_BADGES = [
    { days: 7, label: 'Campus Spark ✨', description: '7 consecutive days on campus' },
    { days: 14, label: 'Chemistry Starter 💫', description: '14 consecutive days on campus' },
    { days: 30, label: 'Campus Connector 🌟', description: '30 consecutive days on campus' },
    { days: 60, label: 'Campus Icon 👑', description: '60 consecutive days on campus' },
    { days: 100, label: 'College Legend 🏆', description: '100 consecutive days on campus' }
];

export const MAX_MONTHLY_FREEZE_TOKENS = 1;

export function getNextMilestone(currentStreak = 0) {
    const next = STREAK_MILESTONES.find(m => m > currentStreak);
    if (!next) return { milestone: null, daysLeft: 0, progress: 100 };
    return {
        milestone: next,
        daysLeft: next - currentStreak,
        progress: Math.min(100, Math.round((currentStreak / next) * 100))
    };
}

export function getStreakCacheKey(userId) {
    return ['score_streak', userId || 'anon'];
}

/**
 * Calculates calendar days elapsed between two YYYY-MM-DD date strings.
 */
export function getDaysDifference(dateStr1, dateStr2) {
    if (!dateStr1 || !dateStr2) return Infinity;
    const clean1 = String(dateStr1).split('T')[0];
    const clean2 = String(dateStr2).split('T')[0];
    const d1 = new Date(`${clean1}T00:00:00Z`);
    const d2 = new Date(`${clean2}T00:00:00Z`);
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates streak progression with Exam-Period Freeze Token support.
 *
 * Rules:
 * 1. Same-day activity (daysDiff === 0): Idempotent, streak remains currentStreak.
 * 2. Consecutive day (daysDiff === 1): Standard progression, increments currentStreak + 1.
 * 3. Missed 1 day (daysDiff === 2):
 *    - If student has a freeze token available for the calendar month:
 *      Consumes 1 freeze token, preserves existing streak and increments for today's action.
 *    - If no freeze tokens available: streak resets to 1.
 * 4. Missed >1 day (daysDiff > 2): Streak resets to 1.
 */
export function evaluateStreakTransition({
    lastActivityDate,
    todayDate = new Date().toISOString().split('T')[0],
    currentStreak = 0,
    longestStreak = 0,
    freezeTokensAvailable = 1,
    freezeUsedMonth = null
}) {
    const currentMonth = todayDate.slice(0, 7); // 'YYYY-MM'

    // Automatically replenish freeze token in a new calendar month
    let availableFreezes = freezeTokensAvailable;
    if (freezeUsedMonth && freezeUsedMonth !== currentMonth) {
        availableFreezes = MAX_MONTHLY_FREEZE_TOKENS;
    }

    if (!lastActivityDate) {
        return {
            currentStreak: 1,
            longestStreak: Math.max(1, longestStreak),
            freezeUsed: false,
            freezeTokensAvailable: availableFreezes,
            freezeUsedMonth,
            isNewDay: true,
            streakPreservedByFreeze: false,
            streakReset: false
        };
    }

    const daysDiff = getDaysDifference(lastActivityDate, todayDate);

    // Same day
    if (daysDiff === 0) {
        return {
            currentStreak,
            longestStreak,
            freezeUsed: false,
            freezeTokensAvailable: availableFreezes,
            freezeUsedMonth,
            isNewDay: false,
            streakPreservedByFreeze: false,
            streakReset: false
        };
    }

    // Consecutive day
    if (daysDiff === 1) {
        const nextStreak = currentStreak + 1;
        return {
            currentStreak: nextStreak,
            longestStreak: Math.max(nextStreak, longestStreak),
            freezeUsed: false,
            freezeTokensAvailable: availableFreezes,
            freezeUsedMonth,
            isNewDay: true,
            streakPreservedByFreeze: false,
            streakReset: false
        };
    }

    // Missed 1 day: Exam-period freeze token kicks in!
    if (daysDiff === 2 && availableFreezes > 0) {
        const nextStreak = currentStreak + 1;
        return {
            currentStreak: nextStreak,
            longestStreak: Math.max(nextStreak, longestStreak),
            freezeUsed: true,
            freezeTokensAvailable: availableFreezes - 1,
            freezeUsedMonth: currentMonth,
            isNewDay: true,
            streakPreservedByFreeze: true,
            streakReset: false,
            message: 'Streak protected by Exam-Period Freeze Token! 🛡️'
        };
    }

    // Missed >1 day or no freeze tokens left: Reset to 1
    return {
        currentStreak: 1,
        longestStreak: Math.max(1, longestStreak),
        freezeUsed: false,
        freezeTokensAvailable: availableFreezes,
        freezeUsedMonth,
        isNewDay: true,
        streakPreservedByFreeze: false,
        streakReset: true
    };
}
