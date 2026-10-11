import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

test('Bottom Navigation: defines concise Tinder-style labels (Match, Explore, Chats, Confessions, Profile)', () => {
    const bottomNavJsx = fs.readFileSync(path.join(projectRoot, 'src/components/BottomNav.jsx'), 'utf8');
    const bottomNavCss = fs.readFileSync(path.join(projectRoot, 'src/components/BottomNav.css'), 'utf8');
    const androidPolishCss = fs.readFileSync(path.join(projectRoot, 'src/styles/androidPolish.css'), 'utf8');

    // Verifies Home and concise Tinder-style labels
    // Home icon removed from bottom nav; default tab is Match
    assert.doesNotMatch(bottomNavJsx, /path:\s*'\/dashboard'/);
    assert.match(bottomNavJsx, /label:\s*'Match'/);
    assert.match(bottomNavJsx, /label:\s*'Explore'/);
    assert.match(bottomNavJsx, /label:\s*'Chats'/);
    assert.match(bottomNavJsx, /label:\s*'Confessions'/);
    assert.match(bottomNavJsx, /label:\s*'Profile'/);

    // Verifies web typography is tiny and compact
    assert.match(bottomNavCss, /\.bottom-nav-label\s*\{[^}]*font-size:\s*9\.5px;/);
    assert.match(bottomNavCss, /\.bottom-nav-label\s*\{[^}]*font-weight:\s*600;/);
    assert.match(bottomNavCss, /\.bottom-nav-label\s*\{[^}]*white-space:\s*nowrap;/);

    // Verifies Android native app explicitly renders tiny labels without expanding height
    assert.match(androidPolishCss, /html\.is-native-app\s+\.bottom-nav-label\s*\{[^}]*display:\s*block\s*!important;/);
    assert.match(androidPolishCss, /html\.is-native-app\s+\.bottom-nav-label\s*\{[^}]*font-size:\s*9\.5px\s*!important;/);
    assert.match(androidPolishCss, /html\.is-native-app\s+\.bottom-nav-label\s*\{[^}]*white-space:\s*nowrap\s*!important;/);
});

test('Match Screen: swipe-container height restored to 83vh on Android to return action buttons to original position', () => {
    const androidPolishCss = fs.readFileSync(path.join(projectRoot, 'src/styles/androidPolish.css'), 'utf8');
    assert.match(androidPolishCss, /html\.is-native-app\s+\.swipe-container\s*\{[^}]*height:\s*calc\(var\(--vh,\s*1vh\)\s*\*\s*83\);/);
});

test('Premium Upgrade: streamlined layout prioritizes pricing plans, concise perks, and collapsible previews', () => {
    const premiumJsx = fs.readFileSync(path.join(projectRoot, 'src/pages/PremiumUpgrade.jsx'), 'utf8');
    const premiumCss = fs.readFileSync(path.join(projectRoot, 'src/pages/PremiumUpgrade.css'), 'utf8');

    // Verifies deepdive toggle state and toggle button exist
    assert.match(premiumJsx, /const\s+\[showFeaturePreviews,\s*setShowFeaturePreviews\]\s*=\s*useState\(false\)/);
    assert.match(premiumJsx, /className="btn-deepdive-toggle"/);
    assert.match(premiumJsx, /showFeaturePreviews\s*\?\s*'Hide Interactive Previews/);

    // Verifies deepdive toggle button styles
    assert.match(premiumCss, /\.btn-deepdive-toggle/);
    assert.match(premiumCss, /\.preview-deepdive-toggle-wrap/);
});
