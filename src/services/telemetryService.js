/**
 * Lightweight, privacy-preserving client-side funnel telemetry service.
 * Tracks key milestone events across student activation and onboarding funnels.
 *
 * Guarantees:
 * 1. Zero PII: Strictly excludes user emails, names, phone numbers, and chat message contents.
 * 2. Local-first: Aggregates counts and timestamps in localStorage with minimal CPU footprint.
 * 3. Idempotent milestone tracking: Safeguards 'first_*' funnel transitions.
 */

export const TELEMETRY_EVENTS = {
    LANDING_VIEW: 'landing_view',
    GUEST_DEMO_START: 'guest_demo_start',
    SIGNUP_START: 'signup_start',
    ONBOARDING_COMPLETE: 'onboarding_complete',
    FIRST_SWIPE: 'first_swipe',
    FIRST_MATCH: 'first_match',
    FIRST_MESSAGE_SENT: 'first_message_sent'
};

const STORAGE_KEY = 'cd_funnel_telemetry';
const BLOCKED_PII_KEYS = new Set([
    'email',
    'password',
    'message',
    'text',
    'content',
    'phone',
    'phone_number',
    'full_name',
    'name',
    'bio',
    'address',
    'token',
    'access_token',
    'refresh_token',
    'card_number',
    'nin',
    'bvn'
]);

/**
 * Returns a randomized anonymous session identifier without persistent fingerprinting.
 */
function getAnonymousSessionId() {
    if (typeof window === 'undefined') return 'server_session';
    try {
        let sid = window.sessionStorage.getItem('cd_telemetry_sid');
        if (!sid) {
            sid = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
            window.sessionStorage.setItem('cd_telemetry_sid', sid);
        }
        return sid;
    } catch {
        return 'ephemeral_session';
    }
}

/**
 * Filters out any potentially sensitive PII keys from metadata objects.
 */
export function sanitizeTelemetryPayload(metadata = {}) {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return {};
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(metadata)) {
        const lowerKey = key.toLowerCase();
        if (BLOCKED_PII_KEYS.has(lowerKey)) {
            continue;
        }

        // Only allow safe scalar primitives
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
            // Trim long strings to avoid storing bloated payloads
            sanitized[key] = typeof value === 'string' ? value.slice(0, 100) : value;
        }
    }
    return sanitized;
}

let memoryStorage = null;

/**
 * Retrieves the raw telemetry container from localStorage.
 */
export function getStoredTelemetry() {
    if (typeof window === 'undefined') {
        if (!memoryStorage) {
            memoryStorage = {
                sessionId: 'server',
                events: {},
                milestones: {}
            };
        }
        return memoryStorage;
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return {
                sessionId: getAnonymousSessionId(),
                events: {},
                milestones: {}
            };
        }
        const parsed = JSON.parse(raw);
        return {
            sessionId: parsed.sessionId || getAnonymousSessionId(),
            events: parsed.events || {},
            milestones: parsed.milestones || {}
        };
    } catch {
        return {
            sessionId: getAnonymousSessionId(),
            events: {},
            milestones: {}
        };
    }
}

/**
 * Persists the telemetry container back to localStorage.
 */
function saveStoredTelemetry(data) {
    if (typeof window === 'undefined') {
        memoryStorage = data;
        return;
    }
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // Storage might be restricted or full, fail silently
    }
}

/**
 * Tracks a privacy-preserving telemetry event.
 *
 * @param {string} eventName - One of TELEMETRY_EVENTS or custom non-PII event key
 * @param {Object} metadata - Optional non-PII metadata (e.g. { campus: 'UNILAG', source: 'cta' })
 * @returns {Object} Updated event summary
 */
export function trackEvent(eventName, metadata = {}) {
    if (!eventName || typeof eventName !== 'string') {
        return null;
    }

    const cleanEvent = eventName.trim().toLowerCase();
    const cleanMeta = sanitizeTelemetryPayload(metadata);
    const nowIso = new Date().toISOString();

    const data = getStoredTelemetry();
    const isFirstTime = !data.events[cleanEvent];

    // Increment aggregate counter
    if (!data.events[cleanEvent]) {
        data.events[cleanEvent] = {
            count: 1,
            firstAt: nowIso,
            lastAt: nowIso,
            meta: cleanMeta
        };
    } else {
        data.events[cleanEvent].count += 1;
        data.events[cleanEvent].lastAt = nowIso;
        if (Object.keys(cleanMeta).length > 0) {
            data.events[cleanEvent].meta = cleanMeta;
        }
    }

    // If it's a first milestone event, record in milestones map
    if (isFirstTime || cleanEvent.startsWith('first_')) {
        if (!data.milestones[cleanEvent]) {
            data.milestones[cleanEvent] = nowIso;
        }
    }

    saveStoredTelemetry(data);

    return {
        event: cleanEvent,
        count: data.events[cleanEvent].count,
        isFirstTime,
        timestamp: nowIso
    };
}

/**
 * Checks if a specific event has ever been tracked on this client.
 */
export function hasTrackedEvent(eventName) {
    if (!eventName) return false;
    const data = getStoredTelemetry();
    return Boolean(data.events[eventName.trim().toLowerCase()]);
}

/**
 * Returns total count for a given event.
 */
export function getEventCount(eventName) {
    if (!eventName) return 0;
    const data = getStoredTelemetry();
    return data.events[eventName.trim().toLowerCase()]?.count || 0;
}

/**
 * Returns a high-level summary of client funnel events.
 */
export function getTelemetrySummary() {
    const data = getStoredTelemetry();
    return {
        sessionId: data.sessionId,
        milestones: { ...data.milestones },
        eventCounts: Object.fromEntries(
            Object.entries(data.events).map(([k, v]) => [k, v.count])
        ),
        totalEventsRecorded: Object.values(data.events).reduce((sum, v) => sum + (v.count || 0), 0)
    };
}

/**
 * Resets local telemetry storage.
 */
export function clearTelemetry() {
    if (typeof window === 'undefined') {
        memoryStorage = null;
        return;
    }
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Ignore
    }
}

// -----------------------------------------------------------------------------
// Convenience milestone wrappers
// -----------------------------------------------------------------------------

export function trackLandingView(metadata = {}) {
    return trackEvent(TELEMETRY_EVENTS.LANDING_VIEW, metadata);
}

export function trackGuestDemoStart(metadata = {}) {
    return trackEvent(TELEMETRY_EVENTS.GUEST_DEMO_START, metadata);
}

export function trackSignupStart(metadata = {}) {
    return trackEvent(TELEMETRY_EVENTS.SIGNUP_START, metadata);
}

export function trackOnboardingComplete(metadata = {}) {
    return trackEvent(TELEMETRY_EVENTS.ONBOARDING_COMPLETE, metadata);
}

export function trackFirstSwipe(metadata = {}) {
    return trackEvent(TELEMETRY_EVENTS.FIRST_SWIPE, metadata);
}

export function trackFirstMatch(metadata = {}) {
    return trackEvent(TELEMETRY_EVENTS.FIRST_MATCH, metadata);
}

export function trackFirstMessageSent(metadata = {}) {
    return trackEvent(TELEMETRY_EVENTS.FIRST_MESSAGE_SENT, metadata);
}
