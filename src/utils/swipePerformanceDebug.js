const MAX_EVENTS = 240;
const QA_INSTRUMENTATION_ENABLED = import.meta.env.VITE_ENABLE_SWIPE_QA === 'true';

function shortDebugId(value) {
    if (!value || typeof value !== 'string') return value;
    return value.length > 8 ? `${value.slice(0, 8)}...` : value;
}

function sanitizeDetail(value, key = '') {
    if (Array.isArray(value)) {
        return { count: value.length };
    }

    if (value && typeof value === 'object') {
        return Object.entries(value).reduce((acc, [entryKey, entryValue]) => {
            acc[entryKey] = sanitizeDetail(entryValue, entryKey);
            return acc;
        }, {});
    }

    const normalizedKey = key.toLowerCase();
    if (
        normalizedKey.includes('profileid')
        || normalizedKey === 'id'
        || normalizedKey.includes('url')
        || normalizedKey.includes('photo')
        || normalizedKey.includes('email')
        || normalizedKey.includes('name')
        || normalizedKey.includes('bio')
    ) {
        return typeof value === 'string' ? shortDebugId(value) : value;
    }

    return value;
}

function sanitizeCounterName(name) {
    return String(name).replace(/cardRender:([0-9a-f-]{8})[0-9a-f-]*/ig, 'cardRender:$1...');
}

function getDebugStore() {
    if (typeof window === 'undefined') return null;
    window.__TCD_SWIPE_PERF__ = window.__TCD_SWIPE_PERF__ || {
        events: [],
        counters: {}
    };
    return window.__TCD_SWIPE_PERF__;
}

export function isSwipeDebugEnabled() {
    if ((!import.meta.env.DEV && !QA_INSTRUMENTATION_ENABLED) || typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('swipe-debug') || window.localStorage?.getItem('tcd_swipe_debug') === 'true';
}

export function recordSwipeDebug(event, detail = {}) {
    if (!isSwipeDebugEnabled()) return;
    const store = getDebugStore();
    if (!store) return;

    const safeDetail = sanitizeDetail(detail);
    const entry = {
        event,
        detail: safeDetail,
        at: Math.round(performance.now() * 10) / 10,
        ts: Date.now()
    };

    store.events.push(entry);
    if (store.events.length > MAX_EVENTS) {
        store.events.splice(0, store.events.length - MAX_EVENTS);
    }

    console.info(`[SwipePerf] ${event} ${JSON.stringify(safeDetail)}`);
}

export function incrementSwipeDebugCounter(name, by = 1) {
    if (!isSwipeDebugEnabled()) return;
    const store = getDebugStore();
    if (!store) return;
    const safeName = sanitizeCounterName(name);
    store.counters[safeName] = (store.counters[safeName] || 0) + by;
}
