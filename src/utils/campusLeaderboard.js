/**
 * ── Baseline Premier Nigerian Campuses for Clash of Campuses ────
 * Ensures the inter-university rivalry is active, competitive, and populated even on cold start.
 */
export const PREMIER_CAMPUSES = [
    {
        id: 'unilag',
        name: 'University of Lagos',
        shortName: 'UNILAG',
        icon: '🏛️',
        color: '#0284c7',
        baseScore: 5420,
        baseStudents: 384,
        activeMatches: 1240,
        regex: /lagos|unilag/i
    },
    {
        id: 'oau',
        name: 'Obafemi Awolowo University',
        shortName: 'OAU',
        icon: '🦅',
        color: '#eab308',
        baseScore: 4890,
        baseStudents: 312,
        activeMatches: 980,
        regex: /awolowo|oau/i
    },
    {
        id: 'covenant',
        name: 'Covenant University',
        shortName: 'CU',
        icon: '👑',
        color: '#8b5cf6',
        baseScore: 4350,
        baseStudents: 265,
        activeMatches: 840,
        regex: /covenant|\bcu\b/i
    },
    {
        id: 'unn',
        name: 'University of Nigeria, Nsukka',
        shortName: 'UNN',
        icon: '🦁',
        color: '#10b981',
        baseScore: 3980,
        baseStudents: 248,
        activeMatches: 790,
        regex: /nsukka|unn/i
    },
    {
        id: 'ui',
        name: 'University of Ibadan',
        shortName: 'UI',
        icon: '📚',
        color: '#f97316',
        baseScore: 3620,
        baseStudents: 220,
        activeMatches: 710,
        regex: /ibadan|\bui\b/i
    },
    {
        id: 'futo',
        name: 'Federal University of Tech, Owerri',
        shortName: 'FUTO',
        icon: '⚙️',
        color: '#06b6d4',
        baseScore: 3150,
        baseStudents: 195,
        activeMatches: 630,
        regex: /futo|owerri/i
    },
    {
        id: 'lasu',
        name: 'Lagos State University',
        shortName: 'LASU',
        icon: '⚡',
        color: '#ec4899',
        baseScore: 2840,
        baseStudents: 180,
        activeMatches: 590,
        regex: /lasu|lagos\s+state/i
    },
    {
        id: 'uniben',
        name: 'University of Benin',
        shortName: 'UNIBEN',
        icon: '🎓',
        color: '#6366f1',
        baseScore: 2510,
        baseStudents: 165,
        activeMatches: 520,
        regex: /benin|uniben/i
    },
    {
        id: 'futa',
        name: 'Federal University of Tech, Akure',
        shortName: 'FUTA',
        icon: '💡',
        color: '#14b8a6',
        baseScore: 2200,
        baseStudents: 140,
        activeMatches: 460,
        regex: /futa|akure/i
    },
    {
        id: 'babcock',
        name: 'Babcock University',
        shortName: 'BABCOCK',
        icon: '✨',
        color: '#d946ef',
        baseScore: 1950,
        baseStudents: 125,
        activeMatches: 410,
        regex: /babcock/i
    }
];

/**
 * Aggregates live activity data by university and ranks campuses for the weekly Clash of Campuses.
 * Adds dynamic points based on active users, received swipes, and spend in leaderboard_unified.
 */
export function getCampusLeaderboard(unifiedUsers = []) {
    const list = PREMIER_CAMPUSES.map((campus) => {
        let additionalStudents = 0;
        let additionalScore = 0;

        if (Array.isArray(unifiedUsers) && unifiedUsers.length > 0) {
            unifiedUsers.forEach((user) => {
                const uCampus = String(user.university || user.campus || '');
                if (campus.regex.test(uCampus)) {
                    additionalStudents += 1;
                    const swipes = Number(user.premium_swipes_received) || 0;
                    const spent = Number(user.total_spent) || 0;
                    additionalScore += (swipes * 15) + Math.floor(spent / 200) + 50;
                }
            });
        }

        const totalScore = campus.baseScore + additionalScore;
        const totalStudents = campus.baseStudents + additionalStudents;

        return {
            id: campus.id,
            name: campus.name,
            shortName: campus.shortName,
            icon: campus.icon,
            color: campus.color,
            score: totalScore,
            studentsCount: totalStudents,
            activeMatches: campus.activeMatches + Math.floor(additionalScore / 25)
        };
    });

    // Sort descending by total score
    list.sort((a, b) => b.score - a.score);

    // Assign rank
    return list.map((item, index) => ({
        ...item,
        rank: index + 1
    }));
}

/**
 * Calculates countdown string and milliseconds until upcoming Sunday 23:59:59 WAT
 */
export function getSundayMidnightCountdown() {
    const now = new Date();
    // WAT is UTC+1
    const watTime = new Date(now.getTime() + (1 * 60 + now.getTimezoneOffset()) * 60000);

    const day = watTime.getDay(); // 0 is Sunday
    const daysUntilSunday = (7 - day) % 7;

    const nextSunday = new Date(watTime);
    nextSunday.setDate(watTime.getDate() + (daysUntilSunday === 0 && (watTime.getHours() === 23 && watTime.getMinutes() === 59) ? 7 : daysUntilSunday));
    nextSunday.setHours(23, 59, 59, 999);

    const diffMs = Math.max(0, nextSunday.getTime() - watTime.getTime());
    const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let formatted = '';
    if (totalHours >= 24) {
        const days = Math.floor(totalHours / 24);
        const remainingHours = totalHours % 24;
        formatted = `${days}d ${remainingHours}h remaining`;
    } else {
        formatted = `${totalHours}h ${mins}m remaining`;
    }

    return {
        diffMs,
        formatted,
        totalHours,
        isSundayNight: day === 0 && watTime.getHours() >= 20
    };
}

