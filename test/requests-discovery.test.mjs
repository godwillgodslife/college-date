import assert from 'node:assert/strict';
import test from 'node:test';
import {
    hasDiscoveredRequests,
    markRequestsDiscovered,
    markDiscoveryShownInSession,
    wasShownInSession,
    isEligibleForRequestsDiscovery,
    getRequestsDiscoveryCopy,
    REQUESTS_DISCOVERY_STORAGE_PREFIX,
    REQUESTS_DISCOVERY_SESSION_PREFIX
} from '../src/utils/requestsDiscovery.js';

// Setup mock window with localStorage and sessionStorage
function setupMockStorage() {
    const localStore = new Map();
    const sessionStore = new Map();

    globalThis.window = {
        localStorage: {
            getItem: (key) => localStore.get(key) || null,
            setItem: (key, val) => localStore.set(key, String(val)),
            removeItem: (key) => localStore.delete(key)
        },
        sessionStorage: {
            getItem: (key) => sessionStore.get(key) || null,
            setItem: (key, val) => sessionStore.set(key, String(val)),
            removeItem: (key) => sessionStore.delete(key)
        }
    };

    return { localStore, sessionStore };
}

test('requests discovery: new user eligibility and retirement flow', () => {
    const { localStore } = setupMockStorage();
    const userId = 'user-student-101';
    const newProfile = {
        id: userId,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours old
    };

    // Brand new user with 0 conversations should be eligible
    assert.equal(
        isEligibleForRequestsDiscovery({ userProfile: newProfile, conversationsCount: 0, userId, hasRequests: false }),
        true
    );

    // If user has pending requests, they are eligible
    assert.equal(
        isEligibleForRequestsDiscovery({ userProfile: newProfile, conversationsCount: 0, userId, hasRequests: true }),
        true
    );

    // Once marked discovered, user is permanently ineligible
    markRequestsDiscovered(userId);
    assert.equal(hasDiscoveredRequests(userId), true);
    assert.equal(
        isEligibleForRequestsDiscovery({ userProfile: newProfile, conversationsCount: 0, userId, hasRequests: true }),
        false
    );
});

test('requests discovery: established user with conversations is never eligible', () => {
    setupMockStorage();
    const userId = 'user-experienced-202';
    const profile = {
        id: userId,
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days old
    };

    // User has 3 active conversations -> Ineligible
    assert.equal(
        isEligibleForRequestsDiscovery({ userProfile: profile, conversationsCount: 3, userId, hasRequests: true }),
        false
    );

    // Even with 0 conversations, old account (> 14 days) without requests is ineligible
    assert.equal(
        isEligibleForRequestsDiscovery({ userProfile: profile, conversationsCount: 0, userId, hasRequests: false }),
        false
    );
});

test('requests discovery: session frequency capping for zero-request users', () => {
    setupMockStorage();
    const userId = 'user-student-303';
    const newProfile = {
        id: userId,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    };

    // Eligible before seeing it
    assert.equal(wasShownInSession(userId), false);
    assert.equal(
        isEligibleForRequestsDiscovery({ userProfile: newProfile, conversationsCount: 0, userId, hasRequests: false }),
        true
    );

    // Mark shown in current session
    markDiscoveryShownInSession(userId);
    assert.equal(wasShownInSession(userId), true);

    // Should NOT show again in same session if user has NO requests
    assert.equal(
        isEligibleForRequestsDiscovery({ userProfile: newProfile, conversationsCount: 0, userId, hasRequests: false }),
        false
    );

    // But if a real request arrives during the session, it permits highlighting
    assert.equal(
        isEligibleForRequestsDiscovery({ userProfile: newProfile, conversationsCount: 0, userId, hasRequests: true }),
        true
    );
});

test('requests discovery: copy accurately reflects presence of requests without fake count', () => {
    // 0 requests -> educational wording
    const emptyCopy = getRequestsDiscoveryCopy(0);
    assert.equal(emptyCopy.hasRequests, false);
    assert.equal(emptyCopy.badgeCount, 0);
    assert.equal(emptyCopy.cue, '💡 Requests are here');
    assert.equal(emptyCopy.label, 'Requests');

    // 2 requests -> actionable wording
    const activeCopy = getRequestsDiscoveryCopy(2);
    assert.equal(activeCopy.hasRequests, true);
    assert.equal(activeCopy.badgeCount, 2);
    assert.equal(activeCopy.cue, '💗 Accept Requests');
    assert.equal(activeCopy.label, 'Accept Requests');
});

test('requests discovery: user isolation across storage keys', () => {
    const { localStore } = setupMockStorage();
    const userA = 'user-alpha';
    const userB = 'user-beta';

    markRequestsDiscovered(userA);
    assert.equal(hasDiscoveredRequests(userA), true);
    assert.equal(hasDiscoveredRequests(userB), false);
});
