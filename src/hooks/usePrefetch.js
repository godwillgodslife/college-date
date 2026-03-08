import { useCallback } from 'react';

/**
 * usePrefetch hook
 * Provides a function to manually trigger the preloading of lazy-loaded components.
 * Can be used on mouseEnter or focus to start loading the bundle before the click.
 */
export const usePrefetch = () => {
    const prefetch = useCallback((path) => {
        // Mapping of paths to dynamic import functions
        // These MUST match the paths used in App.jsx lazy loading
        const prefetchMap = {
            '/match': () => import('../pages/Match'),
            '/explore': () => import('../pages/Explore'),
            '/chat': () => import('../pages/Chat'),
            '/confessions': () => import('../pages/Confessions'),
            '/leaderboard': () => import('../pages/Leaderboard'),
            '/profile': () => import('../pages/Profile'),
            '/wallet': () => import('../pages/Wallet'),
            '/settings': () => import('../pages/Settings'),
            '/status': () => import('../pages/StatusUpdates'),
            '/snap': () => import('../pages/Snap'),
        };

        if (prefetchMap[path]) {
            prefetchMap[path]().catch(() => {
                // Ignore prefetch errors (e.g. offline)
                console.warn(`Prefetch failed for path: ${path}`);
            });
        }
    }, []);

    return { prefetch };
};
