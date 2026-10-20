import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Light Theme Design System: Semantic tokens in src/index.css', () => {
    const indexCss = fs.readFileSync(path.resolve('src/index.css'), 'utf-8');

    // 1. Verify soft light gray canvas
    assert.match(indexCss, /--bg-primary:\s*#f8fafc;/);
    assert.match(indexCss, /--bg-secondary:\s*#ffffff;/);
    assert.match(indexCss, /--bg-tertiary:\s*#f1f5f9;/);
    assert.match(indexCss, /--card-bg:\s*#ffffff;/);
    assert.match(indexCss, /--card-bg-elevated:\s*#ffffff;/);
    assert.match(indexCss, /--input-bg:\s*#ffffff;/);
    assert.match(indexCss, /--input-border:\s*#cbd5e1;/);

    // 2. High contrast slate text tokens
    assert.match(indexCss, /--text-primary:\s*#0f172a;/);
    assert.match(indexCss, /--text-secondary:\s*#334155;/);
    assert.match(indexCss, /--text-muted:\s*#64748b;/);
    assert.match(indexCss, /--text-dim:\s*#94a3b8;/);

    // 3. Crisp subtle borders & dividers
    assert.match(indexCss, /--border-subtle:\s*rgba\(15,\s*23,\s*42,\s*0\.08\);/);
    assert.match(indexCss, /--border-strong:\s*rgba\(15,\s*23,\s*42,\s*0\.16\);/);
    assert.match(indexCss, /--border-divider:\s*#e2e8f0;/);

    // 4. Subtle elevation shadows
    assert.match(indexCss, /--shadow-sm:\s*0 1px 3px rgba\(15,\s*23,\s*42,\s*0\.06\)/);
    assert.match(indexCss, /--shadow-md:\s*0 4px 12px rgba\(15,\s*23,\s*42,\s*0\.07\)/);
    assert.match(indexCss, /--shadow-lg:\s*0 10px 25px rgba\(15,\s*23,\s*42,\s*0\.09\)/);
});

test('Light Theme Design System: Surface elevation and typography in src/styles/androidPolish.css', () => {
    const polishCss = fs.readFileSync(path.resolve('src/styles/androidPolish.css'), 'utf-8');

    // 1. Light theme card surface elevation & borders
    assert.match(polishCss, /html\.is-native-app\[data-theme="light"\]\s+\.settings-list/);
    assert.match(polishCss, /border:\s*1px\s+solid\s+var\(--border-subtle\)\s*!important;/);
    assert.match(polishCss, /box-shadow:\s*0\s+2px\s+8px\s+rgba\(15,\s*23,\s*42,\s*0\.05\)\s*!important;/);
    assert.match(polishCss, /color:\s*var\(--text-primary\)\s*!important;/);

    // 2. Child typography rules enforcing contrast
    assert.match(polishCss, /color:\s*var\(--text-primary\)\s*!important;/);
    assert.match(polishCss, /color:\s*var\(--text-secondary\);/);

    // 3. Form input rules in light mode
    assert.match(polishCss, /html\.is-native-app\[data-theme="light"\]\s+input,/);
    assert.match(polishCss, /border:\s*1\.5px\s+solid\s+#cbd5e1\s*!important;/);
    assert.match(polishCss, /box-shadow:\s*0\s+1px\s+2px\s+rgba\(15,\s*23,\s*42,\s*0\.05\)\s*!important;/);

    // 4. Filter chips & category pills in light mode
    assert.match(polishCss, /\.notification-filter/);
    assert.match(polishCss, /\.chat-filter-chip/);
    assert.match(polishCss, /background:\s*#f1f5f9\s*!important;/);
    assert.match(polishCss, /border:\s*1px\s+solid\s+#e2e8f0\s*!important;/);
    assert.match(polishCss, /background:\s*linear-gradient\(135deg,\s*#635bff,\s*#ec4899\)\s*!important;/);
});

test('Light Theme Design System: Profile Dashboard Grid icon visibility and elevation in src/pages/Profile.css', () => {
    const profileCss = fs.readFileSync(path.resolve('src/pages/Profile.css'), 'utf-8');

    // 1. Base card icon must use semantic icon token instead of hardcoded white
    assert.match(profileCss, /\.dashboard-card\s+\.card-icon\s*{[^}]*color:\s*var\(--icon-secondary/);

    // 2. Profile Dashboard Cards have dedicated light theme elevation & background
    assert.match(profileCss, /html\[data-theme="light"\]\s+\.dashboard-card/);
    assert.match(profileCss, /background:\s*#ffffff;/);

    // 3. Standard card icons (Edit Profile, Wallet, Referrals, Settings, Requests, Leaderboard) have high contrast in light mode
    assert.match(profileCss, /html\[data-theme="light"\]\s+\.dashboard-card\s+\.card-icon/);
    assert.match(profileCss, /color:\s*#475569;/);

    // 4. Partner Up link has high-contrast vibrant cyan icon in light theme
    assert.match(profileCss, /html\[data-theme="light"\]\s+\.dashboard-card\.partner-card-link\s+\.card-icon/);
    assert.match(profileCss, /color:\s*#0284c7;/);

    // 5. Get Premium and Logout cards have high-contrast light theme icons
    assert.match(profileCss, /html\[data-theme="light"\]\s+\.dashboard-card\.premium-card\s+\.card-icon/);
    assert.match(profileCss, /color:\s*#7c3aed;/);
    assert.match(profileCss, /html\[data-theme="light"\]\s+\.dashboard-card\.logout-card\s+\.card-icon/);
    assert.match(profileCss, /color:\s*#dc2626;/);
});
