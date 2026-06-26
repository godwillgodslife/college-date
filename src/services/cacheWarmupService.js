import { getConversations } from './chatService';
import { getLeaderboards } from './leaderboardService';
import { getUserSettings } from './notificationService';
import { getWallet } from './paymentService';
import { getDiscoverProfiles, checkSwipeLimit } from './swipeService';
import { setCachedData } from '../lib/persistentCache';

function isNativePlatform() {
    return typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();
}

function deferIdle(task) {
    if (typeof window === 'undefined') return;
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(task, { timeout: 4000 });
    } else {
        setTimeout(task, 1800);
    }
}

export function warmupNativeDataCache(userId, userProfile) {
    if (!userId || !isNativePlatform()) return;

    deferIdle(async () => {
        const discoveryFilters = {
            gender: userProfile?.preferred_gender || 'All',
            university: userProfile?.university || 'All',
            ageRange: [18, 50]
        };

        const tasks = [
            getConversations(userId).then(({ data }) => setCachedData(['conversations', userId], data || [])),
            getLeaderboards().then((data) => setCachedData('leaderboards', {
                mostWanted: data.mostWanted || [],
                bigSpenders: data.bigSpenders || []
            })),
            getUserSettings(userId).then(({ data }) => setCachedData(['settings', userId], data)),
            getWallet(userId).then(({ data }) => setCachedData(['wallet', userId], data)),
            checkSwipeLimit(userId).then((data) => setCachedData(['limits', userId], data)),
            getDiscoverProfiles(userId, discoveryFilters, userProfile).then(({ data }) => {
                setCachedData(['discovery', userId, JSON.stringify(discoveryFilters)], data || []);
            })
        ];

        await Promise.allSettled(tasks);
    });
}
