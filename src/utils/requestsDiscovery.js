/**
 * Connection Requests Discovery Utility
 * Manages educational coachmark eligibility, persistence, and copy for new students.
 */

export const REQUESTS_DISCOVERY_STORAGE_PREFIX = 'tcd_requests_discovery_seen_';
export const REQUESTS_DISCOVERY_SESSION_PREFIX = 'tcd_requests_discovery_session_';

/**
 * Checks if the user has already discovered the Connection Requests flow.
 */
export function hasDiscoveredRequests(userId) {
    if (typeof window === 'undefined' || !window.localStorage || !userId) return false;
    try {
        const userSpecific = window.localStorage.getItem(`${REQUESTS_DISCOVERY_STORAGE_PREFIX}${userId}`);
        return userSpecific === 'true';
    } catch {
        return false;
    }
}

/**
 * Permanently records that the user has opened/discovered Connection Requests.
 */
export function markRequestsDiscovered(userId) {
    if (typeof window === 'undefined' || !userId) return;
    try {
        if (window.localStorage) {
            window.localStorage.setItem(`${REQUESTS_DISCOVERY_STORAGE_PREFIX}${userId}`, 'true');
        }
        if (window.sessionStorage) {
            window.sessionStorage.setItem(`${REQUESTS_DISCOVERY_SESSION_PREFIX}${userId}`, 'true');
        }
    } catch (e) {
        console.warn('[RequestsDiscovery] Could not persist discovery state:', e);
    }
}

/**
 * Records that the discovery cue was shown during the current session.
 */
export function markDiscoveryShownInSession(userId) {
    if (typeof window === 'undefined' || !window.sessionStorage || !userId) return;
    try {
        window.sessionStorage.setItem(`${REQUESTS_DISCOVERY_SESSION_PREFIX}${userId}`, 'true');
    } catch {
        // silent
    }
}

/**
 * Checks whether the cue was already shown in the current tab session.
 */
export function wasShownInSession(userId) {
    if (typeof window === 'undefined' || !window.sessionStorage || !userId) return false;
    try {
        return window.sessionStorage.getItem(`${REQUESTS_DISCOVERY_SESSION_PREFIX}${userId}`) === 'true';
    } catch {
        return false;
    }
}

/**
 * Evaluates whether a user is eligible to receive the educational discovery highlight.
 * 
 * Criteria:
 * 1. User must be authenticated.
 * 2. User has NOT previously opened/discovered the Connection Requests page.
 * 3. User has zero (or at most 0) active conversations.
 * 4. Account is in early lifecycle (created within last 7 days or 0 conversations).
 * 5. Has not already seen it in the current session (unless has real actionable requests).
 */
export function isEligibleForRequestsDiscovery({
    userProfile,
    conversationsCount = 0,
    userId,
    hasRequests = false,
    alreadyShownInSession
}) {
    if (!userId) return false;

    // 1. Once discovered, never show the educational coachmark again
    if (hasDiscoveredRequests(userId)) return false;

    // 2. Experienced users with established conversations understand the flow
    if (conversationsCount > 0) return false;

    // 3. Account age check
    const createdAt = userProfile?.created_at ? new Date(userProfile.created_at).getTime() : Date.now();
    const accountAgeDays = Math.max(0, (Date.now() - createdAt) / (1000 * 60 * 60 * 24));
    
    // Established accounts (> 14 days) without conversations should not be bombarded
    if (accountAgeDays > 14 && !hasRequests) return false;

    // 4. Session frequency capping:
    // If user has NO pending requests and already saw the tip this session, do not repeat
    const sessionSeen = typeof alreadyShownInSession === 'boolean' 
        ? alreadyShownInSession 
        : wasShownInSession(userId);
    if (!hasRequests && sessionSeen) return false;

    return true;
}

/**
 * Returns the contextual copy and accessibility labels matching the user's state.
 */
export function getRequestsDiscoveryCopy(likesCount = 0) {
    const hasRequests = Number(likesCount) > 0;
    return {
        hasRequests,
        badgeCount: hasRequests ? Number(likesCount) : 0,
        label: hasRequests ? 'Accept Requests' : 'Requests',
        cue: hasRequests ? '💗 Accept Requests' : '💡 Requests are here',
        ariaLabel: hasRequests 
            ? `Connection requests: ${likesCount} waiting. Tap to review and accept.`
            : 'Connection requests area. Tap to see when campus students want to connect.'
    };
}
