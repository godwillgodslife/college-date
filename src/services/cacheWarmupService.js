import { getConversations } from './chatService';
import { getLeaderboards } from './leaderboardService';
import { getDiscoverProfiles, checkSwipeLimit } from './swipeService';
import { getDiscoveryCacheKey } from '../hooks/useSWRData';
import { setCachedData } from '../lib/persistentCache';

function deferIdle(task) {
    if (typeof window === 'undefined') return;
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(task, { timeout: 4000 });
    } else {
        setTimeout(task, 1800);
    }
}

export function warmupAppDataCache(userId, userProfile) {
    if (!userId || typeof window === 'undefined') return;

    deferIdle(async () => {
        let initialGender = 'All';
        if (userProfile) {
            if (userProfile.interest_gender && userProfile.interest_gender !== 'All') {
                initialGender = userProfile.interest_gender;
            } else if (userProfile.gender) {
                initialGender = userProfile.gender.toLowerCase() === 'male' ? 'Female' : 'Male';
            }
        }

        const matchDiscoveryFilters = {
            gender: initialGender,
            university: 'All',
            ageRange: [18, 50],
            liveOnly: false
        };

        const discoveryCacheKey = getDiscoveryCacheKey(userId, matchDiscoveryFilters, userProfile);

        const tasks = [
            getConversations(userId).then(({ data }) => setCachedData(['conversations', userId], data || [])),
            getLeaderboards().then((data) => setCachedData('leaderboards', {
                mostWanted: data.mostWanted || [],
                bigSpenders: data.bigSpenders || []
            })),
            checkSwipeLimit(userId).then((data) => setCachedData(['limits', userId], data)),
            getDiscoverProfiles(userId, matchDiscoveryFilters, userProfile).then(({ data }) => {
                if (discoveryCacheKey && data) {
                    setCachedData(discoveryCacheKey, data);
                }
            })
        ];

        await Promise.allSettled(tasks);
    });
}

export const warmupNativeDataCache = warmupAppDataCache;
