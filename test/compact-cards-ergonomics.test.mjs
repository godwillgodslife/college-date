import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Compact Cards: Dashboard.css defines 2-column features grid on mobile', () => {
    const dashboardCss = fs.readFileSync(path.join(ROOT_DIR, 'src/pages/Dashboard.css'), 'utf-8');
    assert.match(dashboardCss, /grid-template-columns:\s*repeat\(2,\s*1fr\)/);
});

test('Compact Cards: FeatureCard.css defines compact mobile styles and line clamping', () => {
    const featureCardCss = fs.readFileSync(path.join(ROOT_DIR, 'src/components/FeatureCard.css'), 'utf-8');
    assert.match(featureCardCss, /@media\s*\(max-width:\s*480px\)/);
    assert.match(featureCardCss, /-webkit-line-clamp:\s*2/);
});

test('Compact Cards: androidPolish.css downscales explore-grid masonry layout to 138px', () => {
    const polishCss = fs.readFileSync(path.join(ROOT_DIR, 'src/styles/androidPolish.css'), 'utf-8');
    assert.match(polishCss, /html\.is-native-app\s+\.explore-grid\.masonry-layout\s*\{[^}]*grid-auto-rows:\s*138px\s*!important/s);
    assert.match(polishCss, /html\.is-native-app\s+\.explore-card\.tall\s*\{[^}]*grid-row-end:\s*span 2\s*!important/s);
});

test('Compact Cards: androidPolish.css defines compact ergonomics for Dashboard, Confessions, Referrals, Requests, and Notifications', () => {
    const polishCss = fs.readFileSync(path.join(ROOT_DIR, 'src/styles/androidPolish.css'), 'utf-8');
    
    // Dashboard
    assert.match(polishCss, /html\.is-native-app\s+\.features-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*1fr\)\s*!important/s);
    assert.match(polishCss, /html\.is-native-app\s+\.feature-card\s*\{[^}]*padding:\s*0\.75rem\s*0\.7rem\s*!important/s);
    
    // Confessions
    assert.match(polishCss, /html\.is-native-app\s+\.confession-card-premium\s*\{[^}]*padding:\s*0\.75rem\s*0\.85rem\s*!important/s);
    assert.match(polishCss, /html\.is-native-app\s+\.confession-body\s*\{[^}]*font-size:\s*0\.88rem\s*!important/s);

    // Referrals & Ambassador
    assert.match(polishCss, /html\.is-native-app\s+\.referral-milestone-card\s*\{[^}]*padding:\s*0\.85rem\s*1rem\s*!important/s);
    assert.match(polishCss, /html\.is-native-app\s+\.milestone-crown-badge\s*\{[^}]*width:\s*42px\s*!important/s);

    // Requests & Viewers
    assert.match(polishCss, /html\.is-native-app\s+\.request-card/);
    assert.match(polishCss, /html\.is-native-app\s+\.viewer-card/);

    // Notification Center
    assert.match(polishCss, /html\.is-native-app\s+\.notification-center-item/);

    // Leaderboard
    assert.match(polishCss, /html\.is-native-app\s+\.leaderboard-row/);
});
