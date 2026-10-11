import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const guideCode = fs.readFileSync(path.resolve('src/components/ContextualGuide.jsx'), 'utf-8');
const guideCss = fs.readFileSync(path.resolve('src/components/ContextualGuide.css'), 'utf-8');

// Extract the pure JS logic (everything before JSX components) to test execution in VM
const jsSection = guideCode.slice(0, guideCode.indexOf('export function ContextualTip'));

function createMockContext() {
    const mockStorage = new Map();
    const sandbox = {
        window: {
            localStorage: {
                getItem: (k) => mockStorage.get(k) ?? null,
                setItem: (k, v) => mockStorage.set(k, String(v)),
                removeItem: (k) => mockStorage.delete(k),
                clear: () => mockStorage.clear()
            }
        },
        console: { warn: () => {} },
        Date,
        parseInt,
        exports: {}
    };

    // Strip ES module export statements for VM compatibility
    const runnable = jsSection
        .replace(/import\s+[^;]+;/g, '')
        .replace(/export\s+const\s+/g, 'const ')
        .replace(/export\s+function\s+/g, 'function ');

    const wrapper = `
        ${runnable}
        exports.isGuideSeen = isGuideSeen;
        exports.markGuideSeen = markGuideSeen;
        exports.recordGuideImpression = recordGuideImpression;
        exports.markFeatureUsed = markFeatureUsed;
        exports.resetAllGuides = resetAllGuides;
        exports.GUIDE_FEATURES = GUIDE_FEATURES;
    `;

    vm.createContext(sandbox);
    vm.runInContext(wrapper, sandbox);
    return { mod: sandbox.exports, storage: mockStorage };
}

test('Intuitive Feature Guides: exports all required lifecycle functions and features', () => {
    const { mod } = createMockContext();
    assert.strictEqual(typeof mod.isGuideSeen, 'function');
    assert.strictEqual(typeof mod.markGuideSeen, 'function');
    assert.strictEqual(typeof mod.recordGuideImpression, 'function');
    assert.strictEqual(typeof mod.markFeatureUsed, 'function');
    assert.strictEqual(typeof mod.resetAllGuides, 'function');
    assert.ok(mod.GUIDE_FEATURES.match_swipe, 'GUIDE_FEATURES must contain match_swipe');
    assert.ok(mod.GUIDE_FEATURES.accept_request, 'GUIDE_FEATURES must contain accept_request');
    assert.ok(mod.GUIDE_FEATURES.who_viewed_me, 'GUIDE_FEATURES must contain who_viewed_me');
    assert.ok(mod.GUIDE_FEATURES.explore_filters, 'GUIDE_FEATURES must contain explore_filters');
    assert.ok(mod.GUIDE_FEATURES.messages_chat, 'GUIDE_FEATURES must contain messages_chat');
});

test('Intuitive Feature Guides: impression tracking retires guide after 2 views', () => {
    const { mod, storage } = createMockContext();
    const featureId = 'match_swipe';

    // 1. Initial state: not seen
    assert.strictEqual(mod.isGuideSeen(featureId), false);

    // 2. First view recorded
    mod.recordGuideImpression(featureId);
    assert.strictEqual(storage.get('tcd_guide_views_match_swipe'), '1');
    assert.strictEqual(mod.isGuideSeen(featureId), false);

    // 3. Second view recorded -> auto-retires
    mod.recordGuideImpression(featureId);
    assert.strictEqual(storage.get('tcd_guide_views_match_swipe'), '2');
    assert.strictEqual(mod.isGuideSeen(featureId), true);
    assert.strictEqual(storage.get('tcd_guide_seen_match_swipe'), 'true');
});

test('Intuitive Feature Guides: session expiration retires guide viewed in previous session', () => {
    const { mod, storage } = createMockContext();
    const featureId = 'who_viewed_me';

    // Set 1 view that occurred 45 minutes ago
    storage.set('tcd_guide_views_who_viewed_me', '1');
    storage.set('tcd_guide_last_seen_who_viewed_me', String(Date.now() - 45 * 60 * 1000));

    // When checked, it recognizes past session impression and auto-retires
    assert.strictEqual(mod.isGuideSeen(featureId), true);
    assert.strictEqual(storage.get('tcd_guide_seen_who_viewed_me'), 'true');
});

test('Intuitive Feature Guides: markFeatureUsed immediately retires tip when user interacts', () => {
    const { mod, storage } = createMockContext();
    const featureId = 'accept_request';

    assert.strictEqual(mod.isGuideSeen(featureId), false);
    mod.markFeatureUsed(featureId);
    assert.strictEqual(mod.isGuideSeen(featureId), true);
    assert.strictEqual(storage.get('tcd_guide_seen_accept_request'), 'true');
});

test('Intuitive Feature Guides: resetAllGuides cleans up all seen, impression, and nudge keys', () => {
    const { mod, storage } = createMockContext();
    storage.set('tcd_guide_seen_match_swipe', 'true');
    storage.set('tcd_guide_views_match_swipe', '2');
    storage.set('tcd_guide_last_seen_match_swipe', '123456');
    storage.set('tcd_nudge_dismissed_profile_completion', 'true');
    storage.set('tcd_dismissed_profile_completion', 'true');

    mod.resetAllGuides();

    assert.strictEqual(storage.has('tcd_guide_seen_match_swipe'), false);
    assert.strictEqual(storage.has('tcd_guide_views_match_swipe'), false);
    assert.strictEqual(storage.has('tcd_guide_last_seen_match_swipe'), false);
    assert.strictEqual(storage.has('tcd_nudge_dismissed_profile_completion'), false);
    assert.strictEqual(storage.has('tcd_dismissed_profile_completion'), false);
});

test('ContextualTip Component: implements scroll and timer auto-dismissal (WhatsApp style)', () => {
    assert.match(guideCode, /const\s+\[isDismissing,\s*setIsDismissing\]\s*=\s*useState\(false\)/);
    assert.match(guideCode, /isDismissing\s*\?\s*'is-dismissing'\s*:\s*''/);
    assert.match(guideCode, /window\.addEventListener\('scroll',\s*handleScroll/);
    assert.match(guideCode, /handleAutoDismiss/);
    assert.match(guideCode, /recordGuideImpression\(featureId\)/);
});

test('ContextualGuide CSS: contains smooth slide-away dismissing styles', () => {
    assert.match(guideCss, /\.contextual-tip-card\.is-dismissing/);
    assert.match(guideCss, /max-height:\s*0\s*!important/);
    assert.match(guideCss, /opacity:\s*0\s*!important/);
    assert.match(guideCss, /pointer-events:\s*none\s*!important/);
    assert.match(guideCss, /transition:\s*all\s*0\.35s/);
});

test('Requests Page: enforces single tip priority and dismissible completion nudge', () => {
    const requestsJsx = fs.readFileSync(path.resolve('src/pages/Requests.jsx'), 'utf-8');
    assert.match(requestsJsx, /!isGuideSeen\('accept_request'\)\s*\?/, 'Must check accept_request before who_liked_me');
    assert.match(requestsJsx, /markFeatureUsed\('accept_request'\)/, 'Must call markFeatureUsed in request actions');
    assert.match(requestsJsx, /nudgeDismissed/, 'Must track nudgeDismissed state');
    assert.match(requestsJsx, /tcd_nudge_dismissed_profile_completion/, 'Must persist completion nudge dismissal in localStorage');
});

test('Profile Completion: provides 1-tap dismiss button and persists dismissal', () => {
    const profileCompJsx = fs.readFileSync(path.resolve('src/components/ProfileCompletion.jsx'), 'utf-8');
    assert.match(profileCompJsx, /tcd_dismissed_profile_completion/, 'Must persist profile completion dismissal in localStorage');
    assert.match(profileCompJsx, /completion-dismiss-btn/, 'Must provide dismiss button');
    assert.match(profileCompJsx, /if\s*\(dismissed\)\s*return\s*null/, 'Must hide component when dismissed');
});

test('Feature Action Hooks: wired across Match, Explore, Chat, Viewers, and Premium', () => {
    const matchJsx = fs.readFileSync(path.resolve('src/pages/Match.jsx'), 'utf-8');
    const exploreJsx = fs.readFileSync(path.resolve('src/pages/Explore.jsx'), 'utf-8');
    const chatJsx = fs.readFileSync(path.resolve('src/pages/Chat.jsx'), 'utf-8');
    const viewersJsx = fs.readFileSync(path.resolve('src/pages/Viewers.jsx'), 'utf-8');
    const premiumJsx = fs.readFileSync(path.resolve('src/pages/PremiumUpgrade.jsx'), 'utf-8');

    assert.match(matchJsx, /markFeatureUsed\('match_swipe'\)/, 'Match must call markFeatureUsed on swipe');
    assert.match(exploreJsx, /markFeatureUsed\('explore_filters'\)/, 'Explore must call markFeatureUsed on search/filter');
    assert.match(chatJsx, /markFeatureUsed\('messages_chat'\)/, 'Chat must call markFeatureUsed on message send');
    assert.match(viewersJsx, /markFeatureUsed\('who_viewed_me'\)/, 'Viewers must call markFeatureUsed on view');
    assert.match(premiumJsx, /markFeatureUsed\('premium_benefits'\)/, 'Premium must call markFeatureUsed on tier select');
});
