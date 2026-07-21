export const NOTIFICATION_CATEGORIES = {
    MESSAGES: 'messages',
    MATCHES: 'matches',
    REQUESTS: 'requests',
    PROFILE_ACTIVITY: 'profile_activity',
    SOCIAL: 'social',
    ACCOUNT: 'account',
    SYSTEM: 'system',
    GENERAL: 'general'
};

const APP_ORIGINS = new Set([
    'https://www.thecollegedate.com',
    'https://thecollegedate.com'
]);
const CUSTOM_SCHEME = 'com.collegedate.app:';
const DEFAULT_ROUTE = '/notifications';

const ROUTE_ALIASES = {
    '/messages': '/chat',
    '/notification-preview-lab': '/notification-preview',
    '/push-preview': '/notification-preview',
    '/push-lab': '/notification-preview'
};

const APP_ROUTE_PREFIXES = [
    '/auth/callback',
    '/payment/callback',
    '/dashboard',
    '/match',
    '/explore',
    '/chat',
    '/messages',
    '/status',
    '/snap',
    '/profile',
    '/settings',
    '/referrals',
    '/wallet',
    '/requests',
    '/leaderboard',
    '/confessions',
    '/premium',
    '/viewers',
    '/notifications',
    '/notification-preview',
    '/notification-preview-lab',
    '/push-preview',
    '/push-lab',
    '/mini-profile-setup',
    '/call',
    '/admin',
    '/wireframes'
];

const MESSAGE_TYPES = new Set(['message', 'new_message', 'call']);
const MATCH_TYPES = new Set(['match', 'swipe_accepted']);
const REQUEST_TYPES = new Set(['like', 'super_swipe', 'swipe_received']);
const PROFILE_TYPES = new Set(['view', 'profile_view', 'checked_out']);
const SOCIAL_TYPES = new Set(['snapshot_reaction', 'status_update', 'confession']);
const ACCOUNT_TYPES = new Set(['payment', 'funds', 'goal_reached']);
const SYSTEM_TYPES = new Set(['system', 'verified', 'security']);

function cleanRoutePath(pathname) {
    const path = `/${String(pathname || '').replace(/^\/+/, '')}`.replace(/\/+/g, '/');
    return path === '/' ? DEFAULT_ROUTE : path.replace(/\/$/, '') || DEFAULT_ROUTE;
}

function isAllowedAppRoute(pathname) {
    return APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function applyRouteAlias(pathname, search) {
    if (ROUTE_ALIASES[pathname]) {
        return { pathname: ROUTE_ALIASES[pathname], search };
    }

    if (pathname.startsWith('/messages/')) {
        const messageTarget = pathname.split('/').filter(Boolean)[1];
        const params = new URLSearchParams(search || '');
        if (messageTarget && !params.has('chatId')) {
            params.set('chatId', messageTarget);
        }
        return { pathname: '/chat', search: params.toString() ? `?${params.toString()}` : '' };
    }

    return { pathname, search };
}

export function normalizeNotificationRoute(rawUrl, fallback = DEFAULT_ROUTE) {
    if (!rawUrl || typeof rawUrl !== 'string') return fallback;

    try {
        const trimmed = rawUrl.trim();
        let url;

        if (trimmed.startsWith('/')) {
            url = new URL(trimmed, 'https://www.thecollegedate.com');
        } else {
            url = new URL(trimmed);
        }

        if (url.protocol === CUSTOM_SCHEME) {
            const routePath = cleanRoutePath(`${url.host}${url.pathname}`);
            const aliased = applyRouteAlias(routePath, url.search);
            return isAllowedAppRoute(aliased.pathname)
                ? `${aliased.pathname}${aliased.search}${url.hash}`
                : fallback;
        }

        if (!APP_ORIGINS.has(url.origin) && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
            return fallback;
        }

        const routePath = cleanRoutePath(url.pathname);
        const aliased = applyRouteAlias(routePath, url.search);
        return isAllowedAppRoute(aliased.pathname)
            ? `${aliased.pathname}${aliased.search}${url.hash}`
            : fallback;
    } catch {
        return fallback;
    }
}

export function getAbsoluteNotificationUrl(rawUrl, fallback = DEFAULT_ROUTE) {
    const route = normalizeNotificationRoute(rawUrl, fallback);
    return `https://www.thecollegedate.com${route}`;
}

export function openNotificationRoute(rawUrl, fallback = DEFAULT_ROUTE) {
    if (typeof window === 'undefined') return fallback;

    const route = normalizeNotificationRoute(rawUrl, fallback);
    window.history.pushState({}, '', route);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.dispatchEvent(new CustomEvent('tcd:notification-route-opened', {
        detail: {
            rawUrl,
            route,
            openedAt: new Date().toISOString()
        }
    }));
    return route;
}

export function getNotificationCategory(notification) {
    if (notification?.category) return notification.category;
    if (notification?.metadata?.category) return notification.metadata.category;

    const type = notification?.type;
    if (MESSAGE_TYPES.has(type)) return NOTIFICATION_CATEGORIES.MESSAGES;
    if (MATCH_TYPES.has(type)) return NOTIFICATION_CATEGORIES.MATCHES;
    if (REQUEST_TYPES.has(type)) return NOTIFICATION_CATEGORIES.REQUESTS;
    if (PROFILE_TYPES.has(type)) return NOTIFICATION_CATEGORIES.PROFILE_ACTIVITY;
    if (SOCIAL_TYPES.has(type)) return NOTIFICATION_CATEGORIES.SOCIAL;
    if (ACCOUNT_TYPES.has(type)) return NOTIFICATION_CATEGORIES.ACCOUNT;
    if (SYSTEM_TYPES.has(type)) return NOTIFICATION_CATEGORIES.SYSTEM;
    return NOTIFICATION_CATEGORIES.GENERAL;
}

export function getNotificationDeepLink(notification) {
    const metadata = notification?.metadata || {};
    const direct = notification?.deep_link || metadata.deep_link || metadata.url;
    const matchId = notification?.match_id || notification?.conversation_id || metadata.match_id || metadata.conversation_id;
    const actorId = notification?.actor_id || metadata.actor_id;
    const type = notification?.type;

    if (direct) {
        const normalizedRoute = normalizeNotificationRoute(direct);
        return {
            to: normalizedRoute,
            state: normalizedRoute.startsWith('/chat')
                ? { chatId: matchId || null, openChatWith: actorId || null }
                : undefined
        };
    }

    if (MESSAGE_TYPES.has(type) || MATCH_TYPES.has(type)) {
        return {
            to: matchId ? `/chat?chatId=${matchId}` : '/chat',
            state: { chatId: matchId || null, openChatWith: actorId || null }
        };
    }

    if (REQUEST_TYPES.has(type)) return { to: '/requests' };
    if (PROFILE_TYPES.has(type)) return { to: '/viewers' };
    if (SOCIAL_TYPES.has(type)) return { to: type === 'confession' ? '/confessions' : '/snap' };
    if (type === 'trending' || type === 'leaderboard') return { to: '/leaderboard' };
    if (type === 'nearby') return { to: '/explore' };
    if (ACCOUNT_TYPES.has(type)) return { to: '/wallet' };
    if (SYSTEM_TYPES.has(type)) return { to: '/profile' };

    return { to: '/profile' };
}

export function isViewingNotificationDestination(notification, pathname, search = '') {
    const { to } = getNotificationDeepLink(notification);
    const target = new URL(to, 'https://local.thecollegedate.test');
    const current = new URL(`${pathname}${search}`, 'https://local.thecollegedate.test');

    if (target.pathname !== current.pathname) return false;

    if (target.pathname === '/chat') {
        const targetChatId = target.searchParams.get('chatId')
            || notification?.match_id
            || notification?.conversation_id
            || notification?.metadata?.match_id
            || notification?.metadata?.conversation_id;
        const currentChatId = current.searchParams.get('chatId');
        return !targetChatId || targetChatId === currentChatId;
    }

    return true;
}

export function getNotificationIcon(type) {
    const iconMap = {
        match: 'M',
        swipe_accepted: 'M',
        swipe_received: '+',
        like: '+',
        super_swipe: '+',
        payment: '$',
        funds: '$',
        view: 'E',
        checked_out: 'E',
        profile_view: 'E',
        snapshot_reaction: 'S',
        status_update: 'L',
        message: 'C',
        new_message: 'C',
        call: 'C',
        trending: '#',
        leaderboard: '#',
        confession: '?',
        verified: 'V',
        nearby: 'N'
    };

    return iconMap[type] || '!';
}

export function countUnreadByCategory(notifications) {
    return (notifications || []).reduce((counts, notification) => {
        if (notification?.is_read) return counts;
        const category = getNotificationCategory(notification);
        counts.total += 1;
        counts[category] = (counts[category] || 0) + 1;
        return counts;
    }, { total: 0 });
}
