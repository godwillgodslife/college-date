import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();
const modalJsxPath = path.join(projectRoot, 'src', 'components', 'StatusUploadModal.jsx');
const modalCssPath = path.join(projectRoot, 'src', 'components', 'StatusUploadModal.css');
const bottomNavCssPath = path.join(projectRoot, 'src', 'components', 'BottomNav.css');
const appLayoutCssPath = path.join(projectRoot, 'src', 'components', 'AppLayout.css');
const androidCssPath = path.join(projectRoot, 'src', 'styles', 'androidPolish.css');

test('StatusUploadModal JSX: compact layout, close button, createPortal, and clean copy', () => {
    const jsx = fs.readFileSync(modalJsxPath, 'utf8');

    // Root portal to escape stacking context
    assert.ok(jsx.includes('createPortal'), 'StatusUploadModal must portal to document.body');
    assert.ok(jsx.includes('has-modal-open'), 'StatusUploadModal must toggle has-modal-open class on document.body');

    // Header close button
    assert.ok(jsx.includes('className="status-close-btn"'), 'StatusUploadModal must have accessible status-close-btn');

    // Compact dropzone
    assert.ok(jsx.includes('status-dropzone compact'), 'StatusUploadModal must use compact dropzone');
    assert.ok(jsx.includes('dropzone-compact-row'), 'StatusUploadModal must have dropzone-compact-row');

    // Removed unnecessary elements
    assert.ok(!jsx.includes('status-incentive-card'), 'StatusUploadModal must remove oversized incentive card banner');
    assert.ok(!jsx.includes('status-ephemeral-note'), 'StatusUploadModal must remove verbose technical zero-backend note');
    assert.ok(!jsx.includes('library vibes, hangout clips'), 'StatusUploadModal must remove verbose dropzone filler copy');

    // Preserved critical features
    assert.ok(jsx.includes('notifyFriendsOfNewStatus'), 'StatusUploadModal must preserve friend notification trigger');
});

test('StatusUploadModal CSS: compact constraints, safe-area padding, and high z-index', () => {
    const css = fs.readFileSync(modalCssPath, 'utf8');

    // High z-index overlay
    assert.match(css, /\.status-modal-overlay\s*{[^}]*z-index:\s*99999/, 'Overlay must have high z-index 99999');

    // Compact card sizing & scrollability
    assert.match(css, /\.status-modal-card\s*{[^}]*max-height:\s*min\(78dvh,\s*500px\)/, 'Card must be constrained to max-height min(78dvh, 500px)');
    assert.match(css, /\.status-modal-card\s*{[^}]*overflow-y:\s*auto/, 'Card must have scroll container');
    assert.match(css, /\.status-modal-card\s*{[^}]*max-width:\s*420px/, 'Card must have compact max-width 420px');

    // Mobile layout constraints
    assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*?max-height:\s*min\(76dvh,\s*480px\)/, 'Mobile card must not exceed 76dvh');
});

test('Bottom Nav & Android Polish: bottom navigation bar suppressed while modal is active', () => {
    const bottomNavCss = fs.readFileSync(bottomNavCssPath, 'utf8');
    const appLayoutCss = fs.readFileSync(appLayoutCssPath, 'utf8');
    const androidCss = fs.readFileSync(androidCssPath, 'utf8');

    // BottomNav.css suppression rules
    assert.match(bottomNavCss, /body\.has-modal-open\s+\.bottom-nav/, 'BottomNav.css must hide bottom nav when modal is open');
    assert.match(bottomNavCss, /body:has\(\.status-modal-overlay\)\s+\.bottom-nav/, 'BottomNav.css must hide nav on status modal');

    // AppLayout.css suppression rules
    assert.match(appLayoutCss, /body\.has-modal-open\s+\.bottom-nav/, 'AppLayout.css must hide bottom nav when modal is open');

    // Android polish modal sizing
    assert.match(androidCss, /html\.is-native-app\s+\.status-modal-card[\s\S]*?max-height:\s*min\(78dvh,\s*500px\)/, 'Android must enforce max-height on modals');
    assert.match(androidCss, /html\.is-native-app:has\(\.status-modal-overlay\)\s+\.bottom-nav/, 'Android must suppress bottom nav during modal');
});
