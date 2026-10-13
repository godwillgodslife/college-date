export function getCampusBadgeText(profile) {
    const raw = profile?.university || profile?.campus || 'University of Lagos';
    if (/lasu|lagos\s+state/i.test(raw)) return 'LASU • Lagos State University';
    if (/lagos|unilag/i.test(raw)) return 'UNILAG • University of Lagos';
    if (/ibadan|\bui\b/i.test(raw)) return 'UI • University of Ibadan';
    if (/awolowo|oau/i.test(raw)) return 'OAU • Obafemi Awolowo University';
    if (/benin|uniben/i.test(raw)) return 'UNIBEN • University of Benin';
    if (/futa/i.test(raw)) return 'FUTA • Federal Univ. of Tech. Akure';
    if (/covenant|\bcu\b/i.test(raw)) return 'CU • Covenant University';
    return raw;
}

export const TOP_CAMPUS_CONNECTORS = [
    {
        id: 'blessing',
        rank: 2,
        name: 'Blessing O.',
        students: 35,
        avatarKey: 'amaka',
        isLeader: false
    },
    {
        id: 'tunde',
        rank: 1,
        name: 'Tunde A.',
        students: 42,
        avatarKey: 'tunde',
        isLeader: true
    },
    {
        id: 'chioma',
        rank: 3,
        name: 'Chioma K.',
        students: 28,
        avatarKey: 'zainab',
        isLeader: false
    }
];

export function getReferralMilestone(referralCount = 0) {
    const goal = 5;
    const progress = Math.min(referralCount, goal);
    const remaining = Math.max(0, goal - referralCount);
    const percent = Math.min(100, Math.round((progress / goal) * 100));
    const isUnlocked = referralCount >= goal;

    return {
        goal,
        count: referralCount,
        progress,
        remaining,
        percent,
        isUnlocked,
        title: `${progress} of ${goal} Friends Joined`,
        subtitle: isUnlocked
            ? '🎉 Milestone Unlocked: 3 Days Free Elite Active!'
            : `${remaining} more ${remaining === 1 ? 'invite' : 'invites'} to unlock 3 Days Free Elite!`
    };
}
