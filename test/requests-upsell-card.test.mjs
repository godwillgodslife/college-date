import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();
const reqJsxPath = path.join(projectRoot, 'src', 'pages', 'Requests.jsx');
const reqCssPath = path.join(projectRoot, 'src', 'pages', 'Requests.css');
const androidCssPath = path.join(projectRoot, 'src', 'styles', 'androidPolish.css');

test('Requests Upsell Card: JSX renders compact hierarchy and accessible button', () => {
    const jsx = fs.readFileSync(reqJsxPath, 'utf8');

    assert.ok(jsx.includes('className="requests-premium-upsell-card"'), 'Must have requests-premium-upsell-card');
    assert.ok(jsx.includes('className="upsell-icon-wrapper"'), 'Must have upsell-icon-wrapper for compact diamond container');
    assert.ok(jsx.includes('className="upsell-header-line"'), 'Must have upsell-header-line grouping badge and title compactly');
    assert.ok(jsx.includes('className="upsell-badge-pill"'), 'Must render upsell-badge-pill');
    assert.ok(jsx.includes('className="upsell-cta-btn"'), 'Must have upsell-cta-btn');
    assert.ok(jsx.includes('role="button"'), 'Card must have accessible role button');
    assert.ok(jsx.includes('onKeyDown='), 'Card must have keyboard accessibility');
});

test('Requests Upsell Card: CSS styles compact card and premium CTA button', () => {
    const css = fs.readFileSync(reqCssPath, 'utf8');

    // Button styling must exist for upsell-cta-btn
    assert.match(css, /\.upsell-cta-btn[\s\S]*?background:\s*linear-gradient/, 'upsell-cta-btn must have gold gradient background');
    assert.match(css, /\.upsell-cta-btn[\s\S]*?border-radius:\s*9999px/, 'upsell-cta-btn must have pill border-radius');
    assert.match(css, /\.upsell-cta-btn[\s\S]*?box-shadow:/, 'upsell-cta-btn must have premium elevation box-shadow');

    // Card styling must be compact with luxury backdrop
    assert.match(css, /\.requests-premium-upsell-card\s*{[^}]*backdrop-filter:\s*blur/, 'Card must have modern backdrop-filter blur');
    assert.match(css, /\.upsell-icon-wrapper\s*{[^}]*width:\s*38px/, 'Icon wrapper must have compact 38px dimensions');

    // Responsive mobile layout
    assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.upsell-content\s*{[^}]*grid-template-columns:/, 'Mobile must use compact grid layout');
    assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.upsell-cta-btn/, 'Mobile must position CTA button cleanly');

    // Light theme overrides
    assert.match(css, /html\[data-theme="light"\]\s+\.requests-premium-upsell-card/, 'Must support light theme card');
    assert.match(css, /html\[data-theme="light"\]\s+\.requests-premium-upsell-card\s+\.upsell-icon-wrapper/, 'Must support light theme icon wrapper');
});

test('Requests Upsell Card: Android polish defines compact mobile ergonomics', () => {
    const androidCss = fs.readFileSync(androidCssPath, 'utf8');

    assert.match(androidCss, /html\.is-native-app\s+\.requests-premium-upsell-card/, 'Android must style upsell card');
    assert.match(androidCss, /html\.is-native-app\[data-theme="light"\]\s+\.requests-premium-upsell-card/, 'Android light theme must override upsell card');
});
