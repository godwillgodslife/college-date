import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CHAT_JSX = fs.readFileSync(path.resolve('src/pages/Chat.jsx'), 'utf8');
const CHAT_CSS = fs.readFileSync(path.resolve('src/pages/Chat.css'), 'utf8');
const ANDROID_POLISH_CSS = fs.readFileSync(path.resolve('src/styles/androidPolish.css'), 'utf8');

test('Inbox Unified Scroll: .chat-sidebar acts as unified natural scroll container', () => {
    // chat-sidebar must be configured for natural touch scrolling with overscroll containment
    const sidebarMatch = CHAT_CSS.match(/\.chat-sidebar\s*\{([^}]+)\}/);
    assert.ok(sidebarMatch, 'Must find desktop .chat-sidebar rule');
    const body = sidebarMatch[1];
    assert.ok(body.includes('overflow-y: auto'), '.chat-sidebar must have overflow-y: auto');
    assert.ok(body.includes('overflow-x: hidden'), '.chat-sidebar must have overflow-x: hidden');
    assert.ok(body.includes('-webkit-overflow-scrolling: touch'), '.chat-sidebar must have -webkit-overflow-scrolling: touch');
    assert.ok(body.includes('overscroll-behavior-y: contain'), '.chat-sidebar must have overscroll-behavior-y: contain');
});

test('Inbox Unified Scroll: .conversation-list does not trap scroll independently', () => {
    const listMatch = CHAT_CSS.match(/\.conversation-list\s*\{([^}]+)\}/);
    assert.ok(listMatch, 'Must find .conversation-list rule');
    const body = listMatch[1];
    assert.ok(body.includes('overflow: visible'), '.conversation-list must have overflow: visible to allow whole sidebar scroll');
    assert.ok(!body.includes('overflow-y: auto'), '.conversation-list must NOT have overflow-y: auto');
});

test('Inbox Unified Scroll: Header, search, chips, and activity rows do not collapse or block touch', () => {
    const searchMatch = CHAT_CSS.match(/\.chat-sidebar-search-row\s*\{([^}]+)\}/);
    assert.ok(searchMatch, 'Must find .chat-sidebar-search-row rule');
    assert.ok(searchMatch[1].includes('flex-shrink: 0'), 'Search row must have flex-shrink: 0');
    assert.ok(searchMatch[1].includes('touch-action: pan-y'), 'Search row must specify touch-action: pan-y');

    const chipsMatch = CHAT_CSS.match(/\.chat-filter-chips-container\s*\{([^}]+)\}/);
    assert.ok(chipsMatch, 'Must find .chat-filter-chips-container rule');
    assert.ok(chipsMatch[1].includes('flex-shrink: 0'), 'Chips container must have flex-shrink: 0');
    assert.ok(chipsMatch[1].includes('touch-action: pan-x pan-y'), 'Chips container must specify touch-action: pan-x pan-y');

    const activityMatch = CHAT_CSS.match(/\.chat-activity-requests-row\s*\{([^}]+)\}/);
    assert.ok(activityMatch, 'Must find .chat-activity-requests-row rule');
    assert.ok(activityMatch[1].includes('flex-shrink: 0'), 'Activity row must have flex-shrink: 0');
    assert.ok(activityMatch[1].includes('touch-action: pan-x pan-y'), 'Activity row must specify touch-action: pan-x pan-y');
});

test('Inbox Unified Scroll: Mobile chat-sidebar provides bottom nav clearance and touch scrolling', () => {
    // Locate the mobile chat-sidebar definition
    const mobileSidebarMatch = CHAT_CSS.match(/\.chat-sidebar\s*\{[^}]*position:\s*absolute;[^}]*\}/);
    assert.ok(mobileSidebarMatch, 'Must find mobile .chat-sidebar rule in Chat.css');
    const mobileCss = mobileSidebarMatch[0];
    
    assert.ok(mobileCss.includes('overflow-y: auto'), 'Mobile .chat-sidebar must have overflow-y: auto');
    assert.ok(mobileCss.includes('-webkit-overflow-scrolling: touch'), 'Mobile .chat-sidebar must have touch scrolling');
    assert.ok(mobileCss.includes('padding-bottom: calc(var(--native-page-bottom-padding'), 'Mobile .chat-sidebar must provide bottom padding clearance');
});

test('Inbox Unified Scroll: Android native polish provides bottom clearance', () => {
    assert.ok(ANDROID_POLISH_CSS.includes('html.is-native-app .chat-sidebar'), 'androidPolish.css must include html.is-native-app .chat-sidebar');
    assert.ok(ANDROID_POLISH_CSS.includes('padding-bottom: calc(var(--native-page-bottom-padding) + 36px) !important'), 'Native chat-sidebar must have generous clearance');
});

test('Inbox Unified Scroll: Chat.jsx attaches sidebarRef and preserves scroll position across navigation', () => {
    assert.ok(CHAT_JSX.includes('ref={sidebarRef}'), 'Chat.jsx must attach ref={sidebarRef} to .chat-sidebar');
    assert.ok(CHAT_JSX.includes('sidebarScrollPos.current = sidebarRef.current.scrollTop'), 'Chat.jsx must record sidebar scroll position on conversation selection');
    assert.ok(CHAT_JSX.includes('handleSelectConversation'), 'Chat.jsx must define handleSelectConversation callback');
    assert.ok(CHAT_JSX.includes('sidebarRef.current.scrollTop = pos'), 'Chat.jsx must restore scroll position when returning from active chat');
});
