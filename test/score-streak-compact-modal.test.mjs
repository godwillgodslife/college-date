import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();
const modalJsxPath = path.join(projectRoot, 'src', 'components', 'ScoreStreakModal.jsx');
const modalCssPath = path.join(projectRoot, 'src', 'components', 'ScoreStreakModal.css');

test('ScoreStreakModal JSX: portal mounting, bottom-nav suppression, keyboard accessibility, and streamlined hierarchy', () => {
    const jsx = fs.readFileSync(modalJsxPath, 'utf8');

    // Portal mounting to document.body
    assert.ok(jsx.includes('createPortal'), 'ScoreStreakModal must portal to document.body');
    assert.ok(jsx.includes('has-modal-open'), 'ScoreStreakModal must toggle has-modal-open on document.body');

    // Keyboard accessibility
    assert.ok(jsx.includes('Escape'), 'ScoreStreakModal must handle Escape key dismissal');

    // Compact hero & flame badge
    assert.ok(jsx.includes('className="score-streak-flame-circle"'), 'Must have compact flame circle');
    assert.ok(jsx.includes('className="score-streak-days-count"'), 'Must render streak days count');

    // Streamlined metrics strip eliminating duplicate streak count box
    assert.ok(jsx.includes('score-streak-metrics-strip'), 'Must use unified metrics strip');
    assert.ok(jsx.includes('score-streak-status-pill'), 'Must render active/at-risk status pill');
    assert.ok(jsx.includes('score-streak-best-pill'), 'Must render personal best pill');
    assert.ok(!jsx.includes('score-streak-stat-label'), 'Redundant duplicate current streak stat label should be removed');

    // Compact 2x2 daily action grid
    assert.ok(jsx.includes('score-streak-actions-grid'), 'Must render compact 2x2 action grid');
    assert.ok(jsx.includes('Match Swipe'), 'Grid must include Match Swipe action chip');
    assert.ok(jsx.includes('Chat Message'), 'Grid must include Chat Message action chip');
    assert.ok(jsx.includes('Send Request'), 'Grid must include Send Request action chip');
    assert.ok(jsx.includes('Post / React'), 'Grid must include Post/React action chip');

    // Proper milestone badge resolution
    assert.ok(jsx.includes('reverse().find'), 'Milestone lookup must check from highest tier down');

    // Props contract preservation
    assert.ok(jsx.includes('onStartActivity'), 'Must preserve onStartActivity trigger');
    assert.ok(jsx.includes('longestStreak'), 'Must display longestStreak');
    assert.ok(jsx.includes('nextMilestone'), 'Must display nextMilestone');
});

test('ScoreStreakModal CSS: compact mobile sizing, phone viewport containment, and touch responsiveness', () => {
    const css = fs.readFileSync(modalCssPath, 'utf8');

    // High z-index overlay
    assert.match(css, /\.score-streak-modal-backdrop\s*{[^}]*z-index:\s*99999/, 'Backdrop must have high z-index 99999');

    // Compact width and viewport max-height constraints
    assert.match(css, /\.score-streak-modal-container\s*{[^}]*max-width:\s*min\(375px/i, 'Container must be max-width min(375px, ...)');
    assert.match(css, /\.score-streak-modal-container\s*{[^}]*max-height:\s*min\(84dvh,\s*520px\)/, 'Container must be constrained to max-height min(84dvh, 520px)');
    assert.match(css, /\.score-streak-modal-container\s*{[^}]*overflow-y:\s*auto/, 'Container must have scroll container');
    assert.match(css, /\.score-streak-modal-container\s*{[^}]*overscroll-behavior:\s*contain/, 'Container must contain overscroll');

    // Scaled-down hero flame circle (48px instead of 104px)
    assert.match(css, /\.score-streak-flame-circle\s*{[^}]*width:\s*48px/, 'Flame circle must be scaled down to 48px');
    assert.match(css, /\.score-streak-flame-circle\s*{[^}]*height:\s*48px/, 'Flame circle height must be 48px');

    // Compact 2x2 grid styling
    assert.match(css, /\.score-streak-actions-grid\s*{[^}]*grid-template-columns:\s*1fr\s+1fr/, 'Actions must be a 2x2 grid');

    // Mobile media query constraints (<=480px)
    assert.match(css, /@media\s*\(max-width:\s*480px\)[\s\S]*?\.score-streak-flame-circle\s*{[^}]*width:\s*44px/, 'Mobile flame circle must scale to 44px on small screens');
});

test('ScoreStreakModal CSS: comprehensive Light Theme contrast and typography alignment', () => {
    const css = fs.readFileSync(modalCssPath, 'utf8');

    // Light theme container background and high contrast text
    assert.match(css, /html\[data-theme="light"\]\s+\.score-streak-modal-container[\s\S]*?color:\s*#0f172a/, 'Light theme container must use dark primary text #0f172a');
    assert.match(css, /\.theme-light\s+\.score-streak-modal-container/, 'Must include .theme-light container selector');

    // Light theme header & close button
    assert.match(css, /html\[data-theme="light"\]\s+\.score-streak-close-btn[\s\S]*?color:\s*#334155/, 'Light theme close button must have dark contrast');

    // Light theme days count
    assert.match(css, /html\[data-theme="light"\]\s+\.score-streak-days-count[\s\S]*?color:\s*#0f172a/, 'Light theme days count must be dark text');

    // Light theme status pills (emerald active, red at-risk)
    assert.match(css, /html\[data-theme="light"\]\s+\.score-streak-status-pill\.active[\s\S]*?color:\s*#047857/, 'Light theme active pill must use readable dark emerald');
    assert.match(css, /html\[data-theme="light"\]\s+\.score-streak-status-pill\.at-risk[\s\S]*?color:\s*#b91c1c/, 'Light theme at-risk pill must use readable red');

    // Light theme action chips
    assert.match(css, /html\[data-theme="light"\]\s+\.score-streak-action-chip[\s\S]*?background:\s*#ffffff/, 'Light theme action chips must render crisp white cards');
});
