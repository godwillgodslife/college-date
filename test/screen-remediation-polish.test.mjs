import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve('.');

test('Screen Polish: Dashboard.jsx uses semantic theme tokens for streak and active program cards', () => {
    const dashboardPath = path.join(projectRoot, 'src', 'pages', 'Dashboard.jsx');
    const content = fs.readFileSync(dashboardPath, 'utf8');

    // Score Streak card should NOT use hardcoded white text '#fff'
    assert.match(content, /color:\s*'var\(--text-primary\)'/, 'Score streak title should use var(--text-primary)');
    assert.doesNotMatch(content, /fontSize:\s*'0\.95rem',\s*color:\s*'#fff'/, 'Score streak should not have hardcoded #fff');

    // College Date Active Program card should use theme-adapted colors
    assert.match(content, /var\(--text-secondary\)/, 'Active program status should fallback to var(--text-secondary)');
});

test('Screen Polish: ViewerTeaser.css uses semantic theme tokens', () => {
    const teaserPath = path.join(projectRoot, 'src', 'components', 'ViewerTeaser.css');
    const content = fs.readFileSync(teaserPath, 'utf8');

    assert.match(content, /var\(--text-primary/, 'ViewerTeaser should reference var(--text-primary)');
    assert.match(content, /var\(--text-secondary/, 'ViewerTeaser should reference var(--text-secondary)');
    assert.match(content, /var\(--border-subtle/, 'ViewerTeaser should reference var(--border-subtle)');
});

test('Screen Polish: PremiumUpgrade.css provides robust Light Theme elevation and readable text', () => {
    const premiumPath = path.join(projectRoot, 'src', 'pages', 'PremiumUpgrade.css');
    const content = fs.readFileSync(premiumPath, 'utf8');

    assert.match(content, /\.premium-page\s*{[^}]*color:\s*var\(--text-primary\)/, 'Premium page should have var(--text-primary) color');
    assert.match(content, /\.hero-title\s*{[^}]*color:\s*var\(--text-primary\)/, 'Hero title should use var(--text-primary)');
    assert.match(content, /html\[data-theme="light"\]\s+\.tier-card-selector/, 'Should contain light theme tier-card-selector overrides');
    assert.match(content, /html\[data-theme="light"\]\s+\.active-elite-dashboard/, 'Should contain light theme active dashboard overrides');
});

test('Screen Polish: Referrals.css preserves vibrant gradient cards with white text across themes', () => {
    const referralsPath = path.join(projectRoot, 'src', 'pages', 'Referrals.css');
    const content = fs.readFileSync(referralsPath, 'utf8');

    assert.match(content, /html\[data-theme="light"\]\s+\.incentive-card\s*h3/, 'Light theme incentive-card h3 override present');
    assert.match(content, /color:\s*#ffffff\s*!important;/, 'Incentive card headers must preserve #ffffff text');
    assert.match(content, /html\[data-theme="light"\]\s+\.incentive-card:nth-of-type\(1\)/, 'Light theme preserve gradient for card 1');
    assert.match(content, /html\[data-theme="light"\]\s+\.incentive-card:nth-of-type\(2\)/, 'Light theme preserve gradient for card 2');
    assert.match(content, /html\[data-theme="light"\]\s+\.incentive-card:nth-of-type\(3\)/, 'Light theme preserve gradient for card 3');
});

test('Screen Polish: Requests.jsx & Requests.css define section labels and light theme cards', () => {
    const reqJsxPath = path.join(projectRoot, 'src', 'pages', 'Requests.jsx');
    const reqCssPath = path.join(projectRoot, 'src', 'pages', 'Requests.css');
    const jsxContent = fs.readFileSync(reqJsxPath, 'utf8');
    const cssContent = fs.readFileSync(reqCssPath, 'utf8');

    assert.match(jsxContent, /requests-section-label/, 'Requests.jsx must render requests-section-label');
    assert.match(jsxContent, /CONNECTIONS/, 'Requests.jsx must have CONNECTIONS label');
    assert.match(jsxContent, /ADMIRERS/, 'Requests.jsx must have ADMIRERS label');

    assert.match(cssContent, /\.requests-section-label\s*{[^}]*color:\s*var\(--text-muted/, 'Requests section label must use var(--text-muted)');
    assert.match(cssContent, /html\[data-theme="light"\]\s+\.request-card/, 'Requests light theme card override present');
    assert.match(cssContent, /html\[data-theme="light"\]\s+\.empty-requests\s+h2/, 'Requests light theme empty state override present');
});

test('Screen Polish: Leaderboard.css top-3 podium badges have high contrast white text and light theme borders', () => {
    const lbCssPath = path.join(projectRoot, 'src', 'pages', 'Leaderboard.css');
    const content = fs.readFileSync(lbCssPath, 'utf8');

    assert.match(content, /\.rank-badge-1\s*{[^}]*color:\s*#ffffff;/, 'Rank badge 1 must have white text');
    assert.match(content, /\.rank-badge-2\s*{[^}]*color:\s*#ffffff;/, 'Rank badge 2 must have white text');
    assert.match(content, /\.rank-badge-3\s*{[^}]*color:\s*#ffffff;/, 'Rank badge 3 must have white text');
    assert.match(content, /html\[data-theme="light"\]\s+\.rank-badge/, 'Light theme rank badge override present');
    assert.match(content, /html\[data-theme="light"\]\s+\.rank-number/, 'Light theme rank number override present');
});

test('Screen Polish: MiniProfileSetup.jsx & MiniProfileSetup.css popular campuses and light theme support', () => {
    const miniJsxPath = path.join(projectRoot, 'src', 'pages', 'MiniProfileSetup.jsx');
    const miniCssPath = path.join(projectRoot, 'src', 'pages', 'MiniProfileSetup.css');
    const jsxContent = fs.readFileSync(miniJsxPath, 'utf8');
    const cssContent = fs.readFileSync(miniCssPath, 'utf8');

    assert.match(jsxContent, /POPULAR_CAMPUSES/, 'MiniProfileSetup must define POPULAR_CAMPUSES');
    assert.match(jsxContent, /popular-campuses-container/, 'MiniProfileSetup must render popular-campuses-container');
    assert.match(jsxContent, /Start Matching/, 'MiniProfileSetup Step 5 must feature Start Matching CTA');
    assert.match(jsxContent, /Read Campus Confessions/, 'MiniProfileSetup Step 5 must feature Read Campus Confessions CTA');

    assert.match(cssContent, /\.popular-campus-pill/, 'MiniProfileSetup.css must style popular campus pills');
    assert.match(cssContent, /html\[data-theme="light"\]\s+\.quiz-onboarding-page/, 'MiniProfileSetup.css must support light theme');
    assert.match(cssContent, /html\[data-theme="light"\]\s+\.popular-campus-pill/, 'MiniProfileSetup.css must support light theme pills');
});

