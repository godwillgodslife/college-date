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
    '/reset-password',
    '/forgot-password',
    '/login',
    '/signup',
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
    '/guides',
    '/official',
    '/ask',
    '/admin',
    '/wireframes'
];

const MESSAGE_TYPES = new Set(['message', 'new_message', 'call', 'gift', 'gift_received', 'mini_game', 'mini_game_response']);
const MATCH_TYPES = new Set(['match', 'swipe_accepted', 'mystery_match_revealed']);
const REQUEST_TYPES = new Set(['like', 'super_swipe', 'swipe_received']);
const PROFILE_TYPES = new Set(['view', 'profile_view', 'checked_out', 'vibe_endorsement']);
const SOCIAL_TYPES = new Set(['snapshot_reaction', 'status_update', 'confession']);
const ACCOUNT_TYPES = new Set(['payment', 'funds', 'goal_reached', 'quest_reward', 'streak_milestone']);
const SYSTEM_TYPES = new Set(['system', 'verified', 'security', 'campus_clash_victory']);

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
    if (PROFILE_TYPES.has(type)) return { to: type === 'vibe_endorsement' ? '/profile' : '/viewers' };
    if (SOCIAL_TYPES.has(type)) return { to: type === 'confession' ? '/confessions' : '/snap' };
    if (type === 'trending' || type === 'leaderboard' || type === 'campus_clash_victory') return { to: '/leaderboard' };
    if (type === 'nearby') return { to: '/explore' };
    if (type === 'primetime_surge' || type === 'streak_saver') return { to: '/match' };
    if (ACCOUNT_TYPES.has(type)) return { to: (type === 'quest_reward' || type === 'streak_milestone') ? '/dashboard' : '/wallet' };
    if (type === 'official' || type === 'announcement' || type === 'guide') return { to: '/guides' };
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
        gift: 'G',
        gift_received: 'G',
        trending: '#',
        leaderboard: '#',
        confession: '?',
        verified: 'V',
        nearby: 'N',
        vibe_endorsement: '✨',
        mini_game: '🎮',
        mini_game_response: '🎮',
        quest_reward: '🎯',
        streak_milestone: '🔥',
        streak_saver: '🔥',
        primetime_surge: '⚡',
        campus_clash_victory: '🏆',
        mystery_match_revealed: '🎉'
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

/**
 * Partitions notifications into chronological groups ("Today", "Yesterday", "Earlier")
 * based on local calendar midnight boundaries.
 */
export function groupNotificationsChronologically(items = []) {
    if (!Array.isArray(items) || items.length === 0) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    const today = [];
    const yesterday = [];
    const earlier = [];

    for (const item of items) {
        const itemTime = item?.created_at ? new Date(item.created_at).getTime() : NaN;
        if (isNaN(itemTime)) {
            earlier.push(item);
        } else if (itemTime >= startOfToday) {
            today.push(item);
        } else if (itemTime >= startOfYesterday) {
            yesterday.push(item);
        } else {
            earlier.push(item);
        }
    }

    const groups = [];
    if (today.length > 0) groups.push({ id: 'today', title: 'Today', items: today });
    if (yesterday.length > 0) groups.push({ id: 'yesterday', title: 'Yesterday', items: yesterday });
    if (earlier.length > 0) groups.push({ id: 'earlier', title: 'Earlier', items: earlier });
    return groups;
}


export function groupNotificationsByDate(items = []) {
    if (!Array.isArray(items) || items.length === 0) return [];

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 86400000;

    const groups = {
        today: { id: 'today', label: 'Today', items: [], unreadCount: 0 },
        yesterday: { id: 'yesterday', label: 'Yesterday', items: [], unreadCount: 0 },
        earlier: { id: 'earlier', label: 'Earlier', items: [], unreadCount: 0 }
    };

    for (const item of items) {
        if (!item) continue;
        const rawDate = item.created_at || item.createdAt || Date.now();
        const itemTime = new Date(rawDate).getTime();

        let groupKey = 'earlier';
        if (itemTime >= todayMidnight) {
            groupKey = 'today';
        } else if (itemTime >= yesterdayMidnight) {
            groupKey = 'yesterday';
        }

        groups[groupKey].items.push(item);
        if (!item.is_read) {
            groups[groupKey].unreadCount += 1;
        }
    }

    return [groups.today, groups.yesterday, groups.earlier].filter(g => g.items.length > 0);
}

/**
 * Formats notification creation timestamps into relative, human-readable strings.
 */
export function formatNotificationTime(value) {
    if (!value) return '';

    const date = new Date(value);
    const timeMs = date.getTime();
    if (isNaN(timeMs)) return '';

    const diffMs = Date.now() - timeMs;
    if (diffMs < 0) return 'Just now';

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
