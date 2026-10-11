import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('Native Perceived Performance: Match.css defines skeleton shimmers and offline badge', () => {
    const cssPath = path.join(root, 'src', 'pages', 'Match.css');
    assert.ok(fs.existsSync(cssPath), 'Match.css should exist');
    const content = fs.readFileSync(cssPath, 'utf8');

    assert.ok(content.includes('.swipe-card-skeleton'), 'Should define .swipe-card-skeleton');
    assert.ok(content.includes('.swipe-skeleton-image'), 'Should define .swipe-skeleton-image');
    assert.ok(content.includes('.swipe-skeleton-overlay'), 'Should define .swipe-skeleton-overlay');
    assert.ok(content.includes('.swipe-skeleton-chips'), 'Should define .swipe-skeleton-chips');
    assert.ok(content.includes('.skeleton-chip'), 'Should define .skeleton-chip');
    assert.ok(content.includes('.swipe-skeleton-name'), 'Should define .swipe-skeleton-name');
    assert.ok(content.includes('.swipe-skeleton-bio'), 'Should define .swipe-skeleton-bio');
    assert.ok(content.includes('.swipe-skeleton-actions'), 'Should define .swipe-skeleton-actions');
    assert.ok(content.includes('.skeleton-btn'), 'Should define .skeleton-btn');
    assert.ok(content.includes('.shimmer'), 'Should define .shimmer animation class');
    assert.ok(content.includes('.match-offline-badge'), 'Should define .match-offline-badge');
    assert.ok(content.includes('.offline-dot'), 'Should define .offline-dot');
    assert.ok(content.includes('[data-theme="light"] .swipe-card-skeleton'), 'Should have light theme skeleton tokens');
});

test('Native Perceived Performance: Match.jsx renders skeleton card on loading and offline badge', () => {
    const jsxPath = path.join(root, 'src', 'pages', 'Match.jsx');
    assert.ok(fs.existsSync(jsxPath), 'Match.jsx should exist');
    const content = fs.readFileSync(jsxPath, 'utf8');

    assert.ok(content.includes('loading ? ('), 'Match.jsx should check loading before profiles.length === 0');
    assert.ok(content.includes('swipe-card-skeleton'), 'Match.jsx should render swipe-card-skeleton');
    assert.ok(content.includes('isOffline'), 'Match.jsx should track isOffline');
    assert.ok(content.includes('match-offline-badge'), 'Match.jsx should render match-offline-badge');
    assert.ok(content.includes('swrError'), 'Match.jsx should guard swrError to unblock loading');
});

test('Native Perceived Performance: Chat.css defines conversation, message skeletons, failed retry receipt, and offline pill', () => {
    const cssPath = path.join(root, 'src', 'pages', 'Chat.css');
    assert.ok(fs.existsSync(cssPath), 'Chat.css should exist');
    const content = fs.readFileSync(cssPath, 'utf8');

    assert.ok(content.includes('.conversation-skeleton-list'), 'Should define .conversation-skeleton-list');
    assert.ok(content.includes('.conv-skeleton-row'), 'Should define .conv-skeleton-row');
    assert.ok(content.includes('.conv-skeleton-avatar'), 'Should define .conv-skeleton-avatar');
    assert.ok(content.includes('.conv-skeleton-content'), 'Should define .conv-skeleton-content');
    assert.ok(content.includes('.conv-skeleton-name'), 'Should define .conv-skeleton-name');
    assert.ok(content.includes('.conv-skeleton-time'), 'Should define .conv-skeleton-time');
    assert.ok(content.includes('.conv-skeleton-msg'), 'Should define .conv-skeleton-msg');
    assert.ok(content.includes('.chat-bubbles-skeleton'), 'Should define .chat-bubbles-skeleton');
    assert.ok(content.includes('.chat-bubble-skeleton-item'), 'Should define .chat-bubble-skeleton-item');
    assert.ok(content.includes('.read-receipt.failed'), 'Should define .read-receipt.failed');
    assert.ok(content.includes('.chat-offline-banner-pill'), 'Should define .chat-offline-banner-pill');
    assert.ok(content.includes('[data-theme="light"] .conv-skeleton-avatar'), 'Should have light theme conversation skeleton tokens');
});

test('Native Perceived Performance: Chat.jsx integrates skeletons, optimistic retry badges, and offline banner', () => {
    const jsxPath = path.join(root, 'src', 'pages', 'Chat.jsx');
    assert.ok(fs.existsSync(jsxPath), 'Chat.jsx should exist');
    const content = fs.readFileSync(jsxPath, 'utf8');

    assert.ok(content.includes('conversation-skeleton-list'), 'Chat.jsx should render conversation-skeleton-list');
    assert.ok(content.includes('chat-bubbles-skeleton'), 'Chat.jsx should render chat-bubbles-skeleton');
    assert.ok(content.includes('messagesLoading'), 'Chat.jsx should manage messagesLoading state');
    assert.ok(content.includes('isOffline'), 'Chat.jsx should track isOffline');
    assert.ok(content.includes('chat-offline-banner-pill'), 'Chat.jsx should render chat-offline-banner-pill');
    assert.ok(content.includes('handleRetryMessage'), 'Chat.jsx should define handleRetryMessage');
    assert.ok(content.includes('Tap to retry'), 'Chat.jsx ReadReceipt should render Tap to retry for failed messages');
    assert.ok(content.includes('onRetry={handleRetryMessage}'), 'Chat.jsx should pass onRetry to ReadReceipt');
});

test('Google Play Console Handbook & Assets: Submission guide and screenshot assets exist and meet specs', () => {
    const guidePath = path.join(root, 'release', 'GOOGLE_PLAY_CONSOLE_SUBMISSION_GUIDE.md');
    assert.ok(fs.existsSync(guidePath), 'GOOGLE_PLAY_CONSOLE_SUBMISSION_GUIDE.md should exist');
    const guideContent = fs.readFileSync(guidePath, 'utf8');

    assert.ok(guideContent.includes('com.collegedate.app'), 'Should document com.collegedate.app');
    assert.ok(guideContent.includes('2.2.66'), 'Should document version 2.2.66');
    assert.ok(guideContent.includes('63'), 'Should document version code 63');
    assert.ok(guideContent.includes('Closed Testing'), 'Should document Closed Testing track');
    assert.ok(guideContent.includes('20 testers'), 'Should document 20 testers requirement');
    assert.ok(guideContent.includes('Photo & Video Permissions Policy'), 'Should document Photo policy compliance');
    assert.ok(guideContent.includes('Data Safety Form'), 'Should document Data Safety Form');

    const assetsDir = path.join(root, 'release', 'playstore-assets');
    assert.ok(fs.existsSync(assetsDir), 'release/playstore-assets directory should exist');
    const requiredScreenshots = [
        '01_discovery_match_deck.png',
        '02_elite_perks_pricing.png',
        '03_campus_confessions_feed.png',
        '04_messages_and_activity.png',
        '05_realtime_chat_icebreakers.png',
        '06_campus_onboarding_selector.png',
        '07_student_pledge_verified.png'
    ];

    for (const screenshot of requiredScreenshots) {
        const fullPath = path.join(assetsDir, screenshot);
        assert.ok(fs.existsSync(fullPath), `Screenshot ${screenshot} should exist`);
        const stats = fs.statSync(fullPath);
        assert.ok(stats.size > 50000, `Screenshot ${screenshot} should be non-empty and high-resolution (>50KB)`);
    }

    const readmePath = path.join(assetsDir, 'README.md');
    assert.ok(fs.existsSync(readmePath), 'release/playstore-assets/README.md should exist');
});
