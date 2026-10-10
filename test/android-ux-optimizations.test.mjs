import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { formatDisplayName } from '../src/utils/profileData.js';

test('formatDisplayName: formats raw emails and regular campus names cleanly', () => {
    // 1. Raw email input (like Google signup or legacy auth)
    assert.equal(formatDisplayName('sojiok578@gmail.co', ''), 'Sojiok578');
    assert.equal(formatDisplayName('davidandrew6m@uniport.edu.ng', ''), 'Davidandrew6m');
    assert.equal(formatDisplayName('', 'amina2026@gmail.com'), 'Amina2026');

    // 2. Regular full names
    assert.equal(formatDisplayName('Chidinma Okafor', 'chidi'), 'Chidinma Okafor');
    assert.equal(formatDisplayName('Emmanuel Eze', ''), 'Emmanuel Eze');

    // 3. Fallbacks
    assert.equal(formatDisplayName('', '', 'there'), 'there');
    assert.equal(formatDisplayName(null, null, 'Campus Student'), 'Campus Student');
});

test('Dashboard.jsx: banners implement robust anti-truncation and formatDisplayName', () => {
    const dashboardCode = fs.readFileSync(path.resolve('src/pages/Dashboard.jsx'), 'utf-8');

    // Verifies formatDisplayName is used
    assert.match(dashboardCode, /import\s*\{\s*formatDisplayName\s*\}\s*from\s*'\.\.\/utils\/profileData'/);
    assert.match(dashboardCode, /const\s+displayName\s*=\s*formatDisplayName\(/);

    // Verifies Score Streak card prevents View button truncation
    assert.match(dashboardCode, /minWidth:\s*0,\s*flex:\s*1/);
    assert.match(dashboardCode, /whiteSpace:\s*'nowrap',\s*flexShrink:\s*0/);

    // Verifies Active Program card prevents View button truncation
    assert.match(dashboardCode, /dashboard-active-program-card/);
});

test('Explore.jsx & Explore.css: surfaces Campus Finder camera button and prevents badge collision', () => {
    const exploreCode = fs.readFileSync(path.resolve('src/pages/Explore.jsx'), 'utf-8');
    const exploreCss = fs.readFileSync(path.resolve('src/pages/Explore.css'), 'utf-8');

    // Verifies duplicate camera button in search bar is removed to prevent clutter
    assert.doesNotMatch(exploreCode, /className="search-camera-btn"/);

    // Verifies prominent Find by Camera chip in category filter strip
    assert.match(exploreCode, /category-chip category-chip-finder/);
    assert.match(exploreCode, /📸 Find by Camera/);

    // Verifies card display name formatting
    assert.match(exploreCode, /formatDisplayName\(profile\.full_name,\s*profile\.username\)/);

    // Verifies intent-badge is positioned cleanly above card info without colliding with top-left badges
    assert.match(exploreCss, /\.intent-badge\s*\{[^}]*bottom:\s*52px;/);

    // Verifies status-badges-overlay has width boundaries and pointer-events protection
    assert.match(exploreCss, /\.status-badges-overlay\s*\{[^}]*max-width:\s*58%;/);
});

test('androidPolish.css: provides adequate bottom clearance for dashboard and explore on Android', () => {
    const polishCss = fs.readFileSync(path.resolve('src/styles/androidPolish.css'), 'utf-8');

    // Verifies dashboard and explore-page are protected from bottom nav overlay
    assert.match(polishCss, /html\.is-native-app\s+\.dashboard/);
    assert.match(polishCss, /html\.is-native-app\s+\.explore-page/);
    assert.match(polishCss, /padding-bottom:\s*calc\(var\(--native-page-bottom-padding\)\s*\+\s*36px\)\s*!important;/);
});

test('SwipeCard.jsx: formats profile card names using formatDisplayName', () => {
    const swipeCardCode = fs.readFileSync(path.resolve('src/components/SwipeCard.jsx'), 'utf-8');
    assert.match(swipeCardCode, /import\s*\{[^}]*formatDisplayName[^}]*\}\s*from\s*'\.\.\/utils\/profileData'/);
    assert.match(swipeCardCode, /const\s+displayName\s*=\s*formatDisplayName\(/);
});

test('AndroidManifest.xml: complies with Google Play Photo and Video Permissions policy', () => {
    const manifest = fs.readFileSync(path.resolve('android/app/src/main/AndroidManifest.xml'), 'utf-8');
    
    // Must NOT declare broad storage permissions without tools:node="remove"
    const forbidden = [
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.READ_MEDIA_VIDEO',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE'
    ];
    for (const perm of forbidden) {
        const matches = manifest.match(new RegExp(`<uses-permission[^>]*${perm}[^>]*>`, 'g')) || [];
        for (const m of matches) {
            assert.ok(m.includes('tools:node="remove"'), `Permission ${perm} must use tools:node="remove"`);
        }
    }

    // Must have tools namespace declared
    assert.match(manifest, /xmlns:tools="http:\/\/schemas\.android\.com\/tools"/);

    // Verify assetlinks.json exists for App Links domain verification
    assert.ok(fs.existsSync(path.resolve('public/.well-known/assetlinks.json')), 'assetlinks.json must exist');
});


