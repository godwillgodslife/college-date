import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('ContextualTip: renders compact collapsed pill by default and provides 38px max-height constraint', () => {
    const guideCode = fs.readFileSync(path.resolve('src/components/ContextualGuide.jsx'), 'utf-8');
    const guideCss = fs.readFileSync(path.resolve('src/components/ContextualGuide.css'), 'utf-8');

    // ContextualTip component verifies default collapsed state and expandability
    assert.match(guideCode, /const\s+\[isExpanded,\s*setIsExpanded\]\s*=\s*useState\(false\)/);
    assert.match(guideCode, /contextual-tip-pill\s+\$\{isExpanded\s*\?\s*'is-expanded'\s*:\s*'is-collapsed'\}/);
    assert.match(guideCode, /contextual-tip-collapsed/);
    assert.match(guideCode, /tip-collapsed-expand-btn/);
    assert.match(guideCode, /markGuideSeen\(featureId\)/);

    // CSS strictly enforces max-height <= 38px (never > 48px) on collapsed state
    assert.match(guideCss, /\.contextual-tip-card\.is-collapsed\s*\{[^}]*max-height:\s*38px;/);
    assert.match(guideCss, /\.match-contextual-tip\.is-collapsed\s*\{[^}]*max-height:\s*38px;/);
    assert.match(guideCss, /@media\s*\(max-width:\s*768px\)\s*\{[^}]*max-height:\s*38px\s*!important;/);

    // Verifies standalone re-export modules exist for import compatibility
    assert.ok(fs.existsSync(path.resolve('src/components/ContextualTip.jsx')), 'ContextualTip.jsx must exist');
    assert.ok(fs.existsSync(path.resolve('src/components/ContextualTip.css')), 'ContextualTip.css must exist');
});

test('Match Top Filter Strip: enforces nowrap and horizontal scrolling across 360dp width', () => {
    const matchJsx = fs.readFileSync(path.resolve('src/pages/Match.jsx'), 'utf-8');
    const matchCss = fs.readFileSync(path.resolve('src/pages/Match.css'), 'utf-8');

    // Verifies match-filter-strip and filter-chips-row classes on top rail
    assert.match(matchJsx, /discover-top-rail\s+match-filter-strip/);
    assert.match(matchJsx, /discover-top-filters\s+filter-chips-row\s+match-top-actions/);

    // Verifies flex nowrap, horizontal scrolling, and touch momentum
    assert.match(matchCss, /flex-wrap:\s*nowrap;/);
    assert.match(matchCss, /overflow-x:\s*auto;/);
    assert.match(matchCss, /-webkit-overflow-scrolling:\s*touch;/);

    // Verifies white-space nowrap and flex-shrink 0 on pills to prevent awkward wrapping
    assert.match(matchCss, /\.discover-rail-btn\s*\{[^}]*white-space:\s*nowrap\s*!important;/);
    assert.match(matchCss, /\.discover-rail-btn\s*\{[^}]*flex-shrink:\s*0\s*!important;/);
    assert.match(matchCss, /\.discover-swipes-left-badge\s*\{[^}]*white-space:\s*nowrap\s*!important;/);

    // Verifies scrollbar is hidden
    assert.match(matchCss, /scrollbar-width:\s*none;/);
    assert.match(matchCss, /::-webkit-scrollbar\s*\{[^}]*display:\s*none;/);
});

test('Swipe Action Buttons: keep original in-card position (no bottom-nav clearance margin that lifts X/star/heart on Android)', () => {
    const matchCss = fs.readFileSync(path.resolve('src/pages/Match.css'), 'utf-8');
    const polishCss = fs.readFileSync(path.resolve('src/styles/androidPolish.css'), 'utf-8');
    const swipeCardCss = fs.readFileSync(path.resolve('src/components/SwipeCard.css'), 'utf-8');

    // The action row must not be pushed up by a bottom-nav-height margin
    const liftingMargin = /\.swipe-card-actions-row[^{]*\{[^}]*margin-bottom:\s*calc\(var\(--bottom-nav-height/;
    assert.doesNotMatch(matchCss, liftingMargin);
    assert.doesNotMatch(polishCss, liftingMargin);

    // Original action row layout and swipe container offset are preserved
    assert.match(swipeCardCss, /\.swipe-card-actions-row\s*\{[^}]*margin-top:\s*1rem;/);
    assert.match(matchCss, /\.swipe-container\s*\{[^}]*margin-top:\s*-1rem;/);
});

test('Dashboard, Profile, Settings, & Wallet: provides bottom padding to prevent bottom nav clipping', () => {
    const polishCss = fs.readFileSync(path.resolve('src/styles/androidPolish.css'), 'utf-8');

    // Verifies bottom clearance on dashboard, profile, settings, wallet pages
    assert.match(polishCss, /\.dashboard-page/);
    assert.match(polishCss, /\.profile-page/);
    assert.match(polishCss, /\.settings-page/);
    assert.match(polishCss, /\.wallet-page/);
    assert.match(polishCss, /padding-bottom:\s*calc\(var\(--bottom-nav-height\)\s*\+\s*env\(safe-area-inset-bottom,\s*0px\)\s*\+\s*32px\)\s*!important;/);
});
