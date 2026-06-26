const LIVE_WINDOW_MS = 2 * 60 * 1000;
const RECENT_WINDOW_MS = 24 * 60 * 60 * 1000;

function getTimestamp(value) {
    if (!value) return null;
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
}

export function isRecentlyLive(profile) {
    const seenAt = getTimestamp(profile?.last_seen_at || profile?.last_active);
    if (!seenAt) return false;

    return Date.now() - seenAt <= LIVE_WINDOW_MS;
}

export function isRecentlyActive(profile) {
    const seenAt = getTimestamp(profile?.last_active || profile?.last_seen_at);
    if (!seenAt) return false;

    return Date.now() - seenAt <= RECENT_WINDOW_MS;
}
