/**
 * Campus Daily Quests Service (cd2-0)
 * Gamified habit loops and daily engagement rewards for university students.
 * Idempotent, offline-resilient, and cross-tab reactive.
 */

export const DAILY_QUESTS_CONFIG = [
    {
        id: 'quest_explore',
        title: 'Campus Explorer',
        description: 'Explore or swipe 5 student profiles',
        target: 5,
        icon: '⚡',
        actionLabel: 'Swipe Feed',
        route: '/match',
        xp: 15
    },
    {
        id: 'quest_icebreaker',
        title: 'Campus Icebreaker',
        description: 'Send 1 chat message or connection request',
        target: 1,
        icon: '💬',
        actionLabel: 'Open Chats',
        route: '/chat',
        xp: 20
    },
    {
        id: 'quest_voice',
        title: 'Campus Voice',
        description: 'React or post in Campus Confessions',
        target: 1,
        icon: '🤫',
        actionLabel: 'Confessions',
        route: '/confessions',
        xp: 15
    }
];

export const DAILY_QUESTS_COMPLETION_BONUS_COINS = 25;
export const DAILY_QUESTS_TOTAL_XP = 50;

export function getTodayDateKey() {
    return new Date().toISOString().split('T')[0];
}

export function getQuestsStorageKey(userId) {
    return `tcd_daily_quests_${userId || 'anon'}_${getTodayDateKey()}`;
}

/**
 * Retrieves the daily quests list with hydrated progress for the given user.
 */
export function getDailyQuests(userId) {
    if (typeof window === 'undefined') {
        return DAILY_QUESTS_CONFIG.map(q => ({
            ...q,
            progress: 0,
            completed: false,
            claimed: false
        }));
    }

    const key = getQuestsStorageKey(userId);
    try {
        const raw = window.localStorage.getItem(key);
        const stored = raw ? JSON.parse(raw) : {};

        return DAILY_QUESTS_CONFIG.map(q => {
            const currentProgress = Number(stored[q.id]?.progress || 0);
            const isCompleted = currentProgress >= q.target;
            return {
                ...q,
                progress: Math.min(q.target, currentProgress),
                completed: isCompleted,
                claimed: Boolean(stored[q.id]?.claimed)
            };
        });
    } catch {
        return DAILY_QUESTS_CONFIG.map(q => ({
            ...q,
            progress: 0,
            completed: false,
            claimed: false
        }));
    }
}

/**
 * Records progress towards a specific quest.
 * Fires a custom window event for instant multi-component reactivity.
 */
export function recordQuestProgress(userId, questId, increment = 1) {
    if (typeof window === 'undefined' || !userId) return null;

    const key = getQuestsStorageKey(userId);
    try {
        const raw = window.localStorage.getItem(key);
        const stored = raw ? JSON.parse(raw) : {};

        const questDef = DAILY_QUESTS_CONFIG.find(q => q.id === questId);
        const target = questDef ? questDef.target : 1;

        const current = stored[questId] || { progress: 0 };
        const newProgress = Math.max(0, Number(current.progress || 0) + increment);

        stored[questId] = {
            ...current,
            progress: newProgress,
            completed: newProgress >= target,
            updated_at: new Date().toISOString()
        };

        window.localStorage.setItem(key, JSON.stringify(stored));

        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('cd:quests-updated', {
                detail: { questId, newProgress, completed: newProgress >= target }
            }));
        }

        return stored[questId];
    } catch (e) {
        console.warn('[CampusQuestService] Could not persist quest progress:', e);
        return null;
    }
}

/**
 * Checks if all daily quests are completed.
 */
export function isAllQuestsCompleted(quests) {
    if (!Array.isArray(quests) || quests.length === 0) return false;
    return quests.every(q => q.completed);
}

/**
 * Marks all quests as claimed for the day and grants rewards.
 */
export function claimDailyQuestBonus(userId) {
    if (typeof window === 'undefined' || !userId) return false;

    const key = getQuestsStorageKey(userId);
    try {
        const raw = window.localStorage.getItem(key);
        const stored = raw ? JSON.parse(raw) : {};

        if (stored._all_claimed) return false; // Already claimed

        stored._all_claimed = true;
        stored._claimed_at = new Date().toISOString();

        window.localStorage.setItem(key, JSON.stringify(stored));

        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('cd:quests-claimed', {
                detail: { bonusCoins: DAILY_QUESTS_COMPLETION_BONUS_COINS }
            }));
        }

        return true;
    } catch (e) {
        console.warn('[CampusQuestService] Could not record quest bonus claim:', e);
        return false;
    }
}

export function isDailyQuestBonusClaimed(userId) {
    if (typeof window === 'undefined' || !userId) return false;
    const key = getQuestsStorageKey(userId);
    try {
        const raw = window.localStorage.getItem(key);
        const stored = raw ? JSON.parse(raw) : {};
        return Boolean(stored._all_claimed);
    } catch {
        return false;
    }
}
