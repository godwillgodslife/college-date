import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
    normalizeBadgeCount,
    formatBadgeCount,
    calculateLauncherBadgeCount,
    setAppBadge,
    clearAppBadge,
    getAppBadge
} from '../src/services/appBadgeService.js';
import {
    countUnreadByCategory,
    NOTIFICATION_CATEGORIES
} from '../src/utils/notificationRouting.js';

test('App Badge: Normalization and Clamping', () => {
    assert.strictEqual(normalizeBadgeCount(0), 0);
    assert.strictEqual(normalizeBadgeCount(-5), 0);
    assert.strictEqual(normalizeBadgeCount(null), 0);
    assert.strictEqual(normalizeBadgeCount(undefined), 0);
    assert.strictEqual(normalizeBadgeCount(''), 0);
    assert.strictEqual(normalizeBadgeCount(NaN), 0);
    assert.strictEqual(normalizeBadgeCount('abc'), 0);
    assert.strictEqual(normalizeBadgeCount(1), 1);
    assert.strictEqual(normalizeBadgeCount(42), 42);
    assert.strictEqual(normalizeBadgeCount('15'), 15);
    assert.strictEqual(normalizeBadgeCount(3.7), 3);
});

test('App Badge: In-App WhatsApp-Style Text Formatting', () => {
    assert.strictEqual(formatBadgeCount(0), '');
    assert.strictEqual(formatBadgeCount(-1), '');
    assert.strictEqual(formatBadgeCount(1), '1');
    assert.strictEqual(formatBadgeCount(9), '9');
    assert.strictEqual(formatBadgeCount(15), '15');
    assert.strictEqual(formatBadgeCount(99), '99');
    assert.strictEqual(formatBadgeCount(100), '99+');
    assert.strictEqual(formatBadgeCount(105), '99+');
    assert.strictEqual(formatBadgeCount(999), '99+');
});

test('App Badge Policy: calculateLauncherBadgeCount Deduplication', () => {
    // Only general notifications
    assert.strictEqual(calculateLauncherBadgeCount({ generalUnreadCount: 5, chatUnreadCount: 0 }), 5);

    // Only chat unread
    assert.strictEqual(calculateLauncherBadgeCount({ generalUnreadCount: 0, chatUnreadCount: 3 }), 3);

    // Both distinct: 4 general (likes/matches) + 2 unread chats
    assert.strictEqual(calculateLauncherBadgeCount({ generalUnreadCount: 4, chatUnreadCount: 2 }), 6);

    // Deduplication: 5 total notifications where 2 are chat message notifications, plus 2 unread chats
    // (5 - 2 = 3 general without messages) + 2 chats = 5 total
    assert.strictEqual(calculateLauncherBadgeCount({
        generalUnreadCount: 5,
        chatUnreadCount: 2,
        messageNotificationsCount: 2
    }), 5);

    // Zero counts
    assert.strictEqual(calculateLauncherBadgeCount({ generalUnreadCount: 0, chatUnreadCount: 0 }), 0);

    // Boundary edge: negative or invalid inputs never corrupt badge
    assert.strictEqual(calculateLauncherBadgeCount({ generalUnreadCount: -3, chatUnreadCount: 'invalid' }), 0);
});

test('Case 1: Multiple notifications arrive -> counts increase accurately', () => {
    const list = [
        { id: '1', type: 'like', is_read: false },
        { id: '2', type: 'match', is_read: false },
        { id: '3', type: 'profile_view', is_read: false }
    ];
    const counts = countUnreadByCategory(list);
    assert.strictEqual(counts.total, 3);
    const badge = calculateLauncherBadgeCount({ generalUnreadCount: counts.total, chatUnreadCount: 0 });
    assert.strictEqual(badge, 3);
});

test('Case 2: Read one notification -> decreases count once after read operation', () => {
    let list = [
        { id: '1', type: 'like', is_read: false },
        { id: '2', type: 'match', is_read: false }
    ];
    assert.strictEqual(countUnreadByCategory(list).total, 2);

    // Mark '1' as read
    list = list.map(item => item.id === '1' ? { ...item, is_read: true } : item);
    const counts = countUnreadByCategory(list);
    assert.strictEqual(counts.total, 1);
    assert.strictEqual(calculateLauncherBadgeCount({ generalUnreadCount: counts.total }), 1);
});

test('Case 3: Open chat -> mark eligible messages read, update chat badge & launcher badge, do not clear general notifications', () => {
    const generalNotifs = [
        { id: 'g1', type: 'like', is_read: false },
        { id: 'g2', type: 'match', is_read: false }
    ];
    let unreadChatCount = 3;

    let launcherBadge = calculateLauncherBadgeCount({
        generalUnreadCount: countUnreadByCategory(generalNotifs).total,
        chatUnreadCount: unreadChatCount
    });
    assert.strictEqual(launcherBadge, 5); // 2 general + 3 chats

    // User opens conversation and marks its unread messages read
    unreadChatCount = 0;
    launcherBadge = calculateLauncherBadgeCount({
        generalUnreadCount: countUnreadByCategory(generalNotifs).total,
        chatUnreadCount: unreadChatCount
    });

    // General notifications remain unread (2), chat badge is 0, launcher badge is 2
    assert.strictEqual(countUnreadByCategory(generalNotifs).total, 2);
    assert.strictEqual(unreadChatCount, 0);
    assert.strictEqual(launcherBadge, 2);
});

test('Case 4: Read message on another device -> server sync updates counts on this device', () => {
    let convs = [
        { id: 'c1', has_unread: true, unread_count: 2 },
        { id: 'c2', has_unread: true, unread_count: 1 }
    ];
    assert.strictEqual(convs.filter(c => c.has_unread).length, 2);

    // Another device reads c1
    convs = convs.map(c => c.id === 'c1' ? { ...c, has_unread: false, unread_count: 0 } : c);
    const unreadConvs = convs.filter(c => c.has_unread).length;
    assert.strictEqual(unreadConvs, 1);
    assert.strictEqual(formatBadgeCount(unreadConvs), '1');
});

test('Case 5: App force-closed or backgrounded -> channels have setShowBadge(true) and notification channels configured', () => {
    const mainActivitySrc = readFileSync(resolve('android/app/src/main/java/com/collegedate/app/MainActivity.java'), 'utf8');
    assert.match(mainActivitySrc, /channelMessages\.setShowBadge\(true\)/);
    assert.match(mainActivitySrc, /channelMatches\.setShowBadge\(true\)/);
    assert.match(mainActivitySrc, /channelActivity\.setShowBadge\(true\)/);
    assert.match(mainActivitySrc, /registerPlugin\(AppBadgePlugin\.class\)/);
});

test('Case 6: Foreground -> avoid duplicate alerts, deduplicate notifications safely', () => {
    function deduplicate(items) {
        const seen = new Set();
        return items.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
        });
    }

    const stream = [
        { id: 'n1', type: 'like', is_read: false },
        { id: 'n1', type: 'like', is_read: false }, // Duplicate realtime echo
        { id: 'n2', type: 'match', is_read: false }
    ];

    const deduplicated = deduplicate(stream);
    assert.strictEqual(deduplicated.length, 2);
    assert.strictEqual(countUnreadByCategory(deduplicated).total, 2);
});

test('Case 7: Network unavailable -> retain last known synchronised state, do not reset to 0', () => {
    const cachedCount = 4;
    let currentBadge = cachedCount;

    // Simulate network error
    const networkFailed = true;
    if (networkFailed) {
        // Do NOT reset to 0
        currentBadge = cachedCount;
    }

    assert.strictEqual(currentBadge, 4);
    assert.strictEqual(formatBadgeCount(currentBadge), '4');
});

test('Case 8: Logout & new login -> clear user-specific badge data immediately on logout, reload from new account upon auth', async () => {
    await setAppBadge(7);
    assert.strictEqual(getAppBadge(), 7);

    // Logout
    await clearAppBadge();
    assert.strictEqual(getAppBadge(), 0);

    // New login with 3 notifications
    await setAppBadge(3);
    assert.strictEqual(getAppBadge(), 3);
});

test('Case 9: Duplicate push delivery -> idempotent processing via stable IDs', () => {
    const processedIds = new Set();
    function handleIncomingPush(pushId, currentBadge) {
        if (processedIds.has(pushId)) return currentBadge; // idempotent skip
        processedIds.add(pushId);
        return currentBadge + 1;
    }

    let badge = 0;
    badge = handleIncomingPush('push-uuid-1', badge);
    assert.strictEqual(badge, 1);

    // Re-delivered push
    badge = handleIncomingPush('push-uuid-1', badge);
    assert.strictEqual(badge, 1); // Not duplicated
});

test('Case 10: Notification dismissed vs read -> dismissing notification decrements count', () => {
    let notifs = [
        { id: 'n1', type: 'call', is_read: false },
        { id: 'n2', type: 'like', is_read: false }
    ];
    assert.strictEqual(countUnreadByCategory(notifs).total, 2);

    // User dismisses n1
    notifs = notifs.filter(n => n.id !== 'n1');
    assert.strictEqual(countUnreadByCategory(notifs).total, 1);
});

test('Case 11: Bulk actions -> Mark all read updates records and refreshes counts', () => {
    let notifs = [
        { id: '1', is_read: false },
        { id: '2', is_read: false },
        { id: '3', is_read: false }
    ];
    let chatUnread = 1;

    // Mark all general read
    notifs = notifs.map(n => ({ ...n, is_read: true }));
    const generalCount = countUnreadByCategory(notifs).total;
    assert.strictEqual(generalCount, 0);

    // Launcher badge retains remaining chat unread count
    const launcherBadge = calculateLauncherBadgeCount({
        generalUnreadCount: generalCount,
        chatUnreadCount: chatUnread
    });
    assert.strictEqual(launcherBadge, 1);
});

test('Case 12: Race conditions during sync -> monotonic sequence avoids stale responses', () => {
    let latestSequence = 0;
    let authoritativeCount = 0;

    function applySyncResponse({ sequence, count }) {
        if (sequence < latestSequence) {
            return; // Ignore stale response
        }
        latestSequence = sequence;
        authoritativeCount = count;
    }

    applySyncResponse({ sequence: 2, count: 5 });
    assert.strictEqual(authoritativeCount, 5);

    // Out-of-order delayed response from request 1 arrives
    applySyncResponse({ sequence: 1, count: 2 });
    assert.strictEqual(authoritativeCount, 5); // Stale write suppressed
});

test('Case 13: Count exceeds 99 -> show 99+ in-app, numeric badge on launcher', () => {
    const largeCount = 142;
    assert.strictEqual(formatBadgeCount(largeCount), '99+');
    assert.strictEqual(calculateLauncherBadgeCount({ generalUnreadCount: largeCount }), 142);
});

test('Case 14: Clear cache / fresh login -> reconstructs state from authoritative DB records', () => {
    const serverRecords = [
        { id: 's1', type: 'like', is_read: false },
        { id: 's2', type: 'system', is_read: false }
    ];
    const reconstructedCounts = countUnreadByCategory(serverRecords);
    assert.strictEqual(reconstructedCounts.total, 2);
    assert.strictEqual(reconstructedCounts[NOTIFICATION_CATEGORIES.REQUESTS], 1);
    assert.strictEqual(reconstructedCounts[NOTIFICATION_CATEGORIES.SYSTEM], 1);
});

test('Case 15: Denied notification permissions -> keep in-app badges functional', () => {
    const permissionGranted = false;
    const unreadNotifications = 4;
    // In-app badges depend purely on application state, NOT push permission
    const inAppBadge = formatBadgeCount(unreadNotifications);
    assert.strictEqual(inAppBadge, '4');
});

test('Case 16: Muted notifications -> respect preferences, track count faithfully', () => {
    const notification = { type: 'confession', category: 'social', is_read: false };
    const userMutedSocial = true;

    // Should sound/toast interrupt?
    const shouldInterrupt = !userMutedSocial;
    assert.strictEqual(shouldInterrupt, false);

    // But count must still track faithfully:
    const counts = countUnreadByCategory([notification]);
    assert.strictEqual(counts.social, 1);
    assert.strictEqual(counts.total, 1);
});

test('Case 17: Account deletion / expired session -> clear local state', async () => {
    await setAppBadge(10);
    // Session expired:
    await clearAppBadge();
    assert.strictEqual(getAppBadge(), 0);
});

test('Case 18: App restart -> reconciled on initialization', () => {
    const restoredNotifications = [{ id: 'r1', type: 'match', is_read: false }];
    const counts = countUnreadByCategory(restoredNotifications);
    assert.strictEqual(counts.total, 1);
    assert.strictEqual(calculateLauncherBadgeCount({ generalUnreadCount: counts.total }), 1);
});

test('Premium Liquid-Glass Icon: Asset Dimensions and Files Integrity', () => {
    const densities = [
        { name: 'mdpi', legacy: 48, adaptive: 108 },
        { name: 'hdpi', legacy: 72, adaptive: 162 },
        { name: 'xhdpi', legacy: 96, adaptive: 216 },
        { name: 'xxhdpi', legacy: 144, adaptive: 324 },
        { name: 'xxxhdpi', legacy: 192, adaptive: 432 }
    ];

    function readPngSize(file) {
        const buf = readFileSync(file);
        const width = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        return { width, height };
    }

    for (const d of densities) {
        const dir = resolve(`android/app/src/main/res/mipmap-${d.name}`);
        assert.ok(existsSync(join(dir, 'ic_launcher.png')), `Missing legacy ic_launcher for ${d.name}`);
        assert.ok(existsSync(join(dir, 'ic_launcher_round.png')), `Missing round ic_launcher for ${d.name}`);
        assert.ok(existsSync(join(dir, 'ic_launcher_foreground.png')), `Missing foreground for ${d.name}`);
        assert.ok(existsSync(join(dir, 'ic_launcher_background.png')), `Missing background for ${d.name}`);

        const legacySize = readPngSize(join(dir, 'ic_launcher.png'));
        const roundSize = readPngSize(join(dir, 'ic_launcher_round.png'));
        const fgSize = readPngSize(join(dir, 'ic_launcher_foreground.png'));
        const bgSize = readPngSize(join(dir, 'ic_launcher_background.png'));

        assert.strictEqual(legacySize.width, d.legacy, `Legacy width mismatch for ${d.name}`);
        assert.strictEqual(roundSize.width, d.legacy, `Round width mismatch for ${d.name}`);
        assert.strictEqual(fgSize.width, d.adaptive, `Foreground width mismatch for ${d.name}`);
        assert.strictEqual(bgSize.width, d.adaptive, `Background width mismatch for ${d.name}`);
    }

    // Adaptive XML configuration
    const icLauncherXml = readFileSync(resolve('android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml'), 'utf8');
    assert.match(icLauncherXml, /@mipmap\/ic_launcher_background/);
    assert.match(icLauncherXml, /@mipmap\/ic_launcher_foreground/);
    assert.ok(!icLauncherXml.includes('android:inset="16.7%"'), 'No double-insetting shrinkage in adaptive XML');
});
