/**
 * Utility functions to compute campus common ground and 1-tap icebreakers
 * for newly matched student conversations.
 */

/**
 * Normalizes academic level (e.g. '300L' -> '300 Level', 'Graduate' -> 'Graduate').
 * Prevents awkward labels like '300L Level' or 'Graduate Level'.
 */
export function formatStudentLevel(rawLevel) {
    if (!rawLevel) return '';
    const clean = String(rawLevel).trim();
    if (/^\d+l$/i.test(clean)) {
        return `${clean.slice(0, -1)} Level`;
    }
    if (/level$/i.test(clean) || /graduate$/i.test(clean)) {
        return clean;
    }
    return `${clean} Level`;
}

/**
 * Normalizes department string by stripping redundant prefixes like "Department of".
 */
export function formatDepartmentName(rawDept) {
    if (!rawDept) return '';
    const clean = String(rawDept).trim();
    return clean.replace(/^(department of|dept\.? of)\s+/i, '');
}

/**
 * Computes common ground between two student profiles (university, department, level, shared interests).
 *
 * @param {Object} otherUser - Matched student profile
 * @param {Object} userProfile - Current student profile
 * @returns {{ highlight: string, badges: Array<{ icon: string, label: string }> }}
 */
export function getCampusCommonGround(otherUser, userProfile) {
    if (!otherUser) return { highlight: '', badges: [] };

    const firstName = otherUser.full_name?.trim()?.split(/\s+/)[0]
        || otherUser.username?.replace(/^@/, '')
        || 'your match';
    const badges = [];

    const otherUni = (otherUser.university || otherUser.college || '').trim();
    const myUni = (userProfile?.university || userProfile?.college || '').trim();
    const sameUni = Boolean(otherUni && myUni && otherUni.toLowerCase() === myUni.toLowerCase());

    if (otherUni) {
        badges.push({
            icon: '🏛️',
            label: sameUni ? `Same Campus: ${otherUni}` : otherUni
        });
    }

    const otherDeptRaw = otherUser.department || otherUser.faculty || otherUser.major || '';
    const otherDept = formatDepartmentName(otherDeptRaw);
    const myDeptRaw = userProfile?.department || userProfile?.faculty || userProfile?.major || '';
    const myDept = formatDepartmentName(myDeptRaw);
    const sameDept = Boolean(otherDept && myDept && otherDept.toLowerCase() === myDept.toLowerCase());

    if (otherDept) {
        badges.push({
            icon: '📚',
            label: sameDept ? `Same Field: ${otherDept}` : otherDept
        });
    }

    const levelBadge = formatStudentLevel(otherUser.level || otherUser.year);
    if (levelBadge) {
        badges.push({
            icon: '🎓',
            label: levelBadge
        });
    }

    if (Array.isArray(otherUser.interests) && otherUser.interests.length > 0) {
        const myInterests = Array.isArray(userProfile?.interests)
            ? userProfile.interests.map(i => String(i).toLowerCase().trim())
            : [];
        const shared = otherUser.interests.filter(i => myInterests.includes(String(i).toLowerCase().trim()));

        if (shared.length > 0) {
            badges.push({
                icon: '✨',
                label: `Both like ${shared.slice(0, 2).join(', ')}`
            });
        } else {
            badges.push({
                icon: '✨',
                label: otherUser.interests.slice(0, 2).join(' · ')
            });
        }
    }

    let highlight = `You and ${firstName} matched on The College Date! Break the ice below.`;
    if (sameUni && sameDept) {
        highlight = `You and ${firstName} share the same campus and department at ${otherUni}!`;
    } else if (sameUni) {
        highlight = `You and ${firstName} are both students at ${otherUni}!`;
    }

    return { highlight, badges };
}

/**
 * Generates dynamic campus-tailored icebreakers based on mutual campus, department, and student vibe.
 *
 * @param {Object} otherUser - Matched student profile
 * @param {Object} userProfile - Current student profile
 * @returns {string[]} List of 4 1-tap icebreaker questions
 */
export function getCampusIcebreakers(otherUser, userProfile) {
    const firstName = otherUser?.full_name?.trim()?.split(/\s+/)[0]
        || otherUser?.username?.replace(/^@/, '')
        || 'there';
    const otherUni = (otherUser?.university || otherUser?.college || '').trim();
    const myUni = (userProfile?.university || userProfile?.college || '').trim();
    const sameUni = Boolean(otherUni && myUni && otherUni.toLowerCase() === myUni.toLowerCase());
    const otherDept = formatDepartmentName(otherUser?.department || otherUser?.faculty || otherUser?.major || '');

    const list = [];
    if (sameUni) {
        list.push(`Hey ${firstName}! What's your favourite chill spot on campus? 🏫`);
    } else if (otherUni) {
        list.push(`Hey ${firstName}! How is campus life at ${otherUni}? 🎓`);
    } else {
        list.push(`Hey ${firstName}! How's your semester going so far? 📚`);
    }

    if (otherDept) {
        list.push(`What made you choose to study ${otherDept}? ✨`);
    } else {
        list.push(`Early bird or night owl in the library? 🦉`);
    }

    list.push(`Library crunch or hostel chilling today? 😂`);
    list.push(`What's your go-to campus snack between lectures? 🍕`);

    return list;
}

/**
 * Computes a concise 'Why You Match' pill for discovery card stacks.
 *
 * @param {Object} otherUser - Discovered student profile
 * @param {Object} userProfile - Current student profile
 * @returns {string|null} Contextual match reason pill or null
 */
export function getWhyYouMatchBadge(otherUser, userProfile) {
    if (!otherUser || !userProfile) return null;

    const otherUni = (otherUser.university || otherUser.college || '').trim();
    const myUni = (userProfile.university || userProfile.college || '').trim();
    const sameUni = Boolean(otherUni && myUni && otherUni.toLowerCase() === myUni.toLowerCase());

    const otherDept = formatDepartmentName(otherUser.department || otherUser.faculty || otherUser.major || '');
    const myDept = formatDepartmentName(userProfile.department || userProfile.faculty || userProfile.major || '');
    const sameDept = Boolean(otherDept && myDept && otherDept.toLowerCase() === myDept.toLowerCase());

    if (sameUni && sameDept) {
        return `🏛️ Same Campus & Dept (${otherDept})`;
    }
    if (sameUni) {
        return `🏛️ Both at ${otherUni}`;
    }
    if (sameDept) {
        return `📚 Both study ${otherDept}`;
    }

    if (Array.isArray(otherUser.interests) && Array.isArray(userProfile.interests)) {
        const myInterests = userProfile.interests.map(i => String(i).toLowerCase().trim());
        const shared = otherUser.interests.filter(i => myInterests.includes(String(i).toLowerCase().trim()));
        if (shared.length > 0) {
            return `✨ Both love ${shared[0]}`;
        }
    }

    const otherLevel = formatStudentLevel(otherUser.level || otherUser.year);
    const myLevel = formatStudentLevel(userProfile.level || userProfile.year);
    if (otherLevel && myLevel && otherLevel === myLevel) {
        return `🎓 Both in ${otherLevel}`;
    }

    if (otherUser.intent && userProfile.intent && otherUser.intent === userProfile.intent) {
        return `🎯 Same Intent: ${otherUser.intent}`;
    }

    return null;
}

// ─── CAMPUS DAILY PROMPT ENGINE ─────────────────────────────────────────────

export const CAMPUS_DAILY_PROMPTS = [
    { id: 'buka', question: 'What is the absolute best buka / food spot around your campus? 🍲', category: 'food' },
    { id: 'study', question: 'Night class in the faculty or early morning reading in the room? 📚', category: 'study' },
    { id: 'hostel', question: 'On-campus hostel life vs off-campus lodge: which is better? 🏫', category: 'lifestyle' },
    { id: 'lecture', question: 'What is your honest reaction to 8 AM Monday morning lectures? 😂', category: 'humor' },
    { id: 'crush', question: 'Have you ever sat beside your campus crush and said absolutely nothing? 🙈', category: 'dating' },
    { id: 'survival', question: 'What is your number one campus life survival hack? 💡', category: 'tips' },
    { id: 'signout', question: 'What is one thing you will miss most about your school after sign-out? 🎓', category: 'memories' }
];

export function getCampusDailyPrompt(date = new Date()) {
    const d = new Date(date);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = (d - start) + ((start.getTimezoneOffset() - d.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = Math.abs(dayOfYear) % CAMPUS_DAILY_PROMPTS.length;
    return CAMPUS_DAILY_PROMPTS[index];
}

