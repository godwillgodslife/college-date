import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

test('Dashboard Premium Icons: DashboardIcons.jsx defines precision SVG vector components', () => {
    const iconsPath = path.join(ROOT_DIR, 'src/components/DashboardIcons.jsx');
    assert.ok(fs.existsSync(iconsPath), 'DashboardIcons.jsx must exist');
    const content = fs.readFileSync(iconsPath, 'utf-8');

    // Verify all 6 action icon exports
    assert.match(content, /export function DashboardMatchIcon\(\)/, 'Must export DashboardMatchIcon');
    assert.match(content, /export function DashboardChatIcon\(\)/, 'Must export DashboardChatIcon');
    assert.match(content, /export function DashboardExploreIcon\(\)/, 'Must export DashboardExploreIcon');
    assert.match(content, /export function DashboardPremiumIcon\(/, 'Must export DashboardPremiumIcon');
    assert.match(content, /export function DashboardWalletIcon\(\)/, 'Must export DashboardWalletIcon');
    assert.match(content, /export function DashboardRequestsIcon\(\)/, 'Must export DashboardRequestsIcon');

    // Verify SVGs use vector geometric paths, currentColor, and appropriate classes
    assert.match(content, /feature-svg-match/, 'Match icon has feature-svg-match class');
    assert.match(content, /feature-svg-chat/, 'Chat icon has feature-svg-chat class');
    assert.match(content, /feature-svg-explore/, 'Explore icon has feature-svg-explore class');
    assert.match(content, /feature-svg-premium/, 'Premium icon has feature-svg-premium class');
    assert.match(content, /feature-svg-wallet/, 'Wallet icon has feature-svg-wallet class');
    assert.match(content, /feature-svg-requests/, 'Requests icon has feature-svg-requests class');
    assert.match(content, /isUltra/, 'Premium icon supports isUltra mode');
});

test('Dashboard Premium Icons: Dashboard.jsx integrates premium icons across all action cards', () => {
    const dashboardPath = path.join(ROOT_DIR, 'src/pages/Dashboard.jsx');
    const content = fs.readFileSync(dashboardPath, 'utf-8');

    // Verify imports
    assert.match(content, /import\s*\{[^}]*DashboardMatchIcon[^}]*\}\s*from\s*'\.\.\/components\/DashboardIcons'/);
    assert.match(content, /DashboardChatIcon/);
    assert.match(content, /DashboardExploreIcon/);
    assert.match(content, /DashboardPremiumIcon/);
    assert.match(content, /DashboardWalletIcon/);
    assert.match(content, /DashboardRequestsIcon/);

    // Verify actionCards mapping
    assert.match(content, /id:\s*'match'/);
    assert.match(content, /icon:\s*<DashboardMatchIcon\s*\/>/);
    assert.match(content, /id:\s*'chat'/);
    assert.match(content, /icon:\s*<DashboardChatIcon\s*\/>/);
    assert.match(content, /id:\s*'explore'/);
    assert.match(content, /icon:\s*<DashboardExploreIcon\s*\/>/);
    assert.match(content, /id:\s*'premium'/);
    assert.match(content, /icon:\s*<DashboardPremiumIcon\s+isUltra=\{isUltra\}\s*\/>/);
    assert.match(content, /id:\s*'wallet'/);
    assert.match(content, /icon:\s*<DashboardWalletIcon\s*\/>/);
    assert.match(content, /id:\s*'requests'/);
    assert.match(content, /icon:\s*<DashboardRequestsIcon\s*\/>/);

    // Verify raw text emojis are replaced in actionCards
    assert.doesNotMatch(content, /icon:\s*'💕'/);
    assert.doesNotMatch(content, /icon:\s*'💬'/);
    assert.doesNotMatch(content, /icon:\s*'🧭'/);
    assert.doesNotMatch(content, /icon:\s*'💳'/);
    assert.doesNotMatch(content, /icon:\s*'💌'/);

    // Verify FeatureCard invocation forwards variant and metadata
    assert.match(content, /variant=\{card\.variant\s*\|\|\s*card\.id\}/);
});

test('Dashboard Premium Icons: FeatureCard.jsx provides squircle badge wrapper and fallback elevation', () => {
    const featureCardPath = path.join(ROOT_DIR, 'src/components/FeatureCard.jsx');
    const content = fs.readFileSync(featureCardPath, 'utf-8');

    // Verify squircle badge rendering
    assert.match(content, /className=\{`feature-icon-badge \$\{effectiveVariant \? `feature-icon-badge-\$\{effectiveVariant\}` : ''\}`\}/);

    // Verify variant inference and fallback vector lookup
    assert.match(content, /function inferVariant/);
    assert.match(content, /function getIconForVariant/);
    assert.match(content, /data-variant=\{effectiveVariant \|\| undefined\}/);
});

test('Dashboard Premium Icons: FeatureCard.css defines 6 theme variants and Light Theme contrast', () => {
    const cssPath = path.join(ROOT_DIR, 'src/components/FeatureCard.css');
    const content = fs.readFileSync(cssPath, 'utf-8');

    // 1. Squircle badge system
    assert.match(content, /\.feature-icon-badge\s*\{/);
    assert.match(content, /width:\s*44px/);
    assert.match(content, /height:\s*44px/);
    assert.match(content, /border-radius:\s*13px/);

    // 2. Six Theme Variants in Dark Mode
    assert.match(content, /\.feature-card-match::before/);
    assert.match(content, /\.feature-icon-badge-match\s*\{[^}]*color:\s*#ff3b70/s);
    assert.match(content, /\.feature-card-chat::before/);
    assert.match(content, /\.feature-icon-badge-chat\s*\{[^}]*color:\s*#a78bfa/s);
    assert.match(content, /\.feature-card-explore::before/);
    assert.match(content, /\.feature-icon-badge-explore\s*\{[^}]*color:\s*#38bdf8/s);
    assert.match(content, /\.feature-card-premium::before/);
    assert.match(content, /\.feature-icon-badge-premium\s*\{[^}]*color:\s*#fbbf24/s);
    assert.match(content, /\.feature-card-wallet::before/);
    assert.match(content, /\.feature-icon-badge-wallet\s*\{[^}]*color:\s*#34d399/s);
    assert.match(content, /\.feature-card-requests::before/);
    assert.match(content, /\.feature-icon-badge-requests\s*\{[^}]*color:\s*#fb7185/s);

    // 3. Six Theme Variants in Light Mode
    assert.match(content, /html\[data-theme="light"\]\s+\.feature-icon-badge-match/);
    assert.match(content, /html\[data-theme="light"\]\s+\.feature-icon-badge-chat/);
    assert.match(content, /html\[data-theme="light"\]\s+\.feature-icon-badge-explore/);
    assert.match(content, /html\[data-theme="light"\]\s+\.feature-icon-badge-premium/);
    assert.match(content, /html\[data-theme="light"\]\s+\.feature-icon-badge-wallet/);
    assert.match(content, /html\[data-theme="light"\]\s+\.feature-icon-badge-requests/);

    // 4. Mobile responsiveness
    assert.match(content, /@media\s*\(max-width:\s*480px\)/);
    assert.match(content, /width:\s*36px/);
    assert.match(content, /height:\s*36px/);
});

test('Dashboard Premium Icons: androidPolish.css guarantees compact mobile icon sizing', () => {
    const polishPath = path.join(ROOT_DIR, 'src/styles/androidPolish.css');
    const content = fs.readFileSync(polishPath, 'utf-8');

    assert.match(content, /html\.is-native-app\s+\.feature-icon-badge\s*\{[^}]*width:\s*36px\s*!important/s);
    assert.match(content, /html\.is-native-app\s+\.feature-icon-badge\s*\{[^}]*height:\s*36px\s*!important/s);
});
