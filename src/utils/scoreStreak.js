export const STREAK_MILESTONES = [7, 14, 30, 60, 100];

export const STREAK_BADGES = [
    { days: 7, label: 'Campus Spark ✨', description: '7 consecutive days on campus' },
    { days: 14, label: 'Chemistry Starter 💫', description: '14 consecutive days on campus' },
    { days: 30, label: 'Campus Connector 🌟', description: '30 consecutive days on campus' },
    { days: 60, label: 'Campus Icon 👑', description: '60 consecutive days on campus' },
    { days: 100, label: 'College Legend 🏆', description: '100 consecutive days on campus' }
];

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
