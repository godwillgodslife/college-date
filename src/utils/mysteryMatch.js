/**
 * Mystery Match Utility - Primetime Blind Date Speed Hour
 * Provides mystery persona generation, blur styling calculations,
 * and collegiate speed-dating icebreakers.
 */

export const MYSTERY_ALIASES = [
    'Mystery Stepper 👟',
    'Campus Cipher 🎭',
    'Midnight Scholar 🦉',
    'Velvet Rebel ✨',
    'Golden Vibe Curator 🎧',
    'Porcelain Nomad ☕',
    'Collegiate Maverick ⚡',
    'Aura Explorer 🔮'
];

export const MYSTERY_ICEBREAKERS = [
    'Late-night hostel Indomie or off-campus buka cooking?',
    '8 AM Monday lecture or 4-hour Friday lab session?',
    'What track is currently on heavy rotation in your headphones?',
    'Quiet library 3rd floor grind or loud cafeteria hangout?',
    'What is the funniest rumor you have ever heard on campus?',
    'If we had one free weekend in Lagos/Ibadan, where are we going?'
];

/**
 * Deterministically pick or randomize a mystery alias
 */
export function getMysteryAlias(seed = '') {
    if (!seed) return MYSTERY_ALIASES[Math.floor(Math.random() * MYSTERY_ALIASES.length)];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % MYSTERY_ALIASES.length;
    return MYSTERY_ALIASES[index];
}

/**
 * Calculate avatar blur filter and scale based on progressive unblur stage (0..3)
 */
export function getStageBlurStyle(stage = 0) {
    switch (Number(stage)) {
        case 0:
            return {
                filter: 'blur(24px)',
                transform: 'scale(1.08)',
                transition: 'filter 0.5s ease, transform 0.5s ease',
                percentage: 0,
                label: 'Stage 1/3: Masked 🎭',
                sublabel: 'Send 1 message to reveal avatar outline'
            };
        case 1:
            return {
                filter: 'blur(12px)',
                transform: 'scale(1.04)',
                transition: 'filter 0.5s ease, transform 0.5s ease',
                percentage: 33,
                label: 'Stage 2/3: Warm Chemistry 💫',
                sublabel: 'Send 1 more message to sharpen preview'
            };
        case 2:
            return {
                filter: 'blur(5px)',
                transform: 'scale(1.02)',
                transition: 'filter 0.5s ease, transform 0.5s ease',
                percentage: 66,
                label: 'Stage 3/3: Almost Revealed 🔥',
                sublabel: '1 final message unlocks full identity & match!'
            };
        case 3:
        default:
            return {
                filter: 'blur(0px)',
                transform: 'scale(1)',
                transition: 'filter 0.5s ease, transform 0.5s ease',
                percentage: 100,
                label: 'Identity Revealed! 🎉',
                sublabel: 'Permanent match unlocked in your inbox (+25 XP)'
            };
    }
}

/**
 * Normalizes a candidate with mystery persona attributes
 */
export function formatMysteryCandidate(profile = {}) {
    const alias = getMysteryAlias(profile.id || profile.full_name);
    const icebreaker = MYSTERY_ICEBREAKERS[Math.floor(Math.random() * MYSTERY_ICEBREAKERS.length)];
    const avatar = profile.avatar_url || (Array.isArray(profile.profile_photos) && profile.profile_photos[0]) || '';

    return {
        ...profile,
        realName: profile.full_name || 'Campus Student',
        maskedName: alias,
        mysteryIcebreaker: icebreaker,
        maskedAvatar: avatar,
        displayFaculty: `${profile.faculty || 'Faculty of Social Sciences'} • ${profile.level || '300L'}`
    };
}

