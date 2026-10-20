import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();
const modalJsxPath = path.join(projectRoot, 'src', 'components', 'CreateServiceDealModal.jsx');
const modalCssPath = path.join(projectRoot, 'src', 'components', 'CreateServiceDealModal.css');
const cardJsxPath = path.join(projectRoot, 'src', 'components', 'ServiceDealCard.jsx');
const cardCssPath = path.join(projectRoot, 'src', 'components', 'ServiceDealCard.css');

test('CreateServiceDealModal JSX: role cards, quick amount chips, escrow guarantee, and payment transparency', () => {
    const jsx = fs.readFileSync(modalJsxPath, 'utf8');

    // Role selector with detailed explanatory cards
    assert.ok(jsx.includes('role-cards-grid'), 'Must render role cards grid');
    assert.ok(jsx.includes('Client (Payer)'), 'Must indicate Client/Payer role');
    assert.ok(jsx.includes('Provider'), 'Must indicate Provider role');

    // Quick denomination chips
    assert.ok(jsx.includes('QUICK_AMOUNTS'), 'Must define quick amount denominations');
    assert.ok(jsx.includes('quick-chips-wrap'), 'Must render quick chips wrapper');
    assert.ok(jsx.includes('quick-chip'), 'Must render quick chip buttons');

    // Partner context
    assert.ok(jsx.includes('deal-partner-tag'), 'Must render partner tag badge');
    assert.ok(jsx.includes('with {partnerName}'), 'Must display partner name in header');

    // Campus Escrow Guarantee
    assert.ok(jsx.includes('deal-escrow-guarantee-card'), 'Must render escrow guarantee card');
    assert.ok(jsx.includes('College Date Campus Escrow Guarantee'), 'Must include escrow guarantee title');
    assert.ok(jsx.includes('Held in Safe Vault'), 'Must explain safe vault holding');
    assert.ok(jsx.includes('Client-Authorized Release'), 'Must explain client release approval');
    assert.ok(jsx.includes('100% Refundable'), 'Must explain full refund policy');

    // Submit button payment reassurance
    assert.ok(jsx.includes('deal-submit-reassurance'), 'Must render payment reassurance note');
    assert.ok(jsx.includes('No funds deducted now'), 'Must reassure that funds are not immediately charged');

    // Tactile haptics
    assert.ok(jsx.includes('triggerLightHaptic'), 'Must integrate light haptic feedback');
    assert.ok(jsx.includes('triggerMediumHaptic'), 'Must integrate medium haptic feedback');
    assert.ok(jsx.includes('triggerSuccessHaptic'), 'Must integrate success haptic feedback');
});

test('CreateServiceDealModal CSS: phone ergonomics, keyboard resilience, and complete Light Theme design system', () => {
    const css = fs.readFileSync(modalCssPath, 'utf8');

    // Overlay and container constraints
    assert.match(css, /\.deal-modal-overlay\s*{[^}]*z-index:\s*99999/, 'Overlay must have high z-index 99999');
    assert.match(css, /\.deal-modal-card\s*{[^}]*max-height:\s*min\(86dvh,\s*620px\)/, 'Card must be constrained for keyboard safety');
    assert.match(css, /\.deal-modal-card\s*{[^}]*overflow:\s*hidden/, 'Card must handle overflow');

    // Light Theme Overrides
    assert.match(css, /html\[data-theme="light"\]\s+\.deal-modal-card/, 'Must define html[data-theme="light"] card override');
    assert.match(css, /\.theme-light\s+\.deal-modal-card/, 'Must define .theme-light card override');
    assert.match(css, /html\[data-theme="light"\]\s+\.deal-header-title-row\s+h3[\s\S]*?color:\s*#0f172a/, 'Light theme title must be high contrast #0f172a');
    assert.match(css, /html\[data-theme="light"\]\s+\.deal-escrow-guarantee-card[\s\S]*?background:\s*#f0fdf4/, 'Light theme escrow guarantee must use mint porcelain #f0fdf4');
    assert.match(css, /html\[data-theme="light"\]\s+\.deal-input[\s\S]*?background:\s*#ffffff/, 'Light theme inputs must use pure white background');

    // Mobile media queries
    assert.match(css, /@media\s*\(max-width:\s*480px\)/, 'Must include responsive mobile media queries');
});

test('ServiceDealCard JSX: 4-stage visual escrow stepper, role strip, and tactile actions', () => {
    const jsx = fs.readFileSync(cardJsxPath, 'utf8');

    // 4-Stage visual escrow stepper
    assert.ok(jsx.includes('escrow-stepper-wrap'), 'Must render escrow stepper container');
    assert.ok(jsx.includes('escrow-stepper'), 'Must render escrow stepper');
    assert.ok(jsx.includes('Agreed'), 'Stepper must display Agreed step');
    assert.ok(jsx.includes('Escrowed'), 'Stepper must display Escrowed step');
    assert.ok(jsx.includes('Delivered'), 'Stepper must display Delivered step');
    assert.ok(jsx.includes('Paid'), 'Stepper must display Paid step');

    // Role & protection banner
    assert.ok(jsx.includes('deal-user-role-strip'), 'Must render user role strip');
    assert.ok(jsx.includes('deal-escrow-shield'), 'Must render escrow protected shield');

    // Contract amount banner
    assert.ok(jsx.includes('deal-escrow-note'), 'Must render vault holding note');

    // Tactile haptics
    assert.ok(jsx.includes('triggerSuccessHaptic'), 'Must trigger success haptic on release/accept/fund');
    assert.ok(jsx.includes('triggerWarningHaptic'), 'Must trigger warning haptic on dispute/cancel');
});

test('ServiceDealCard CSS: Multi-theme design system and high contrast in-chat styling', () => {
    const css = fs.readFileSync(cardCssPath, 'utf8');

    // Dark theme baseline
    assert.match(css, /\.service-deal-card\s*{[^}]*background:\s*#181822/, 'Dark theme card must have #181822 background');
    assert.match(css, /\.stepper-node\.completed\s+\.stepper-dot\s*{[^}]*background:\s*#10b981/, 'Completed stepper dot must be emerald #10b981');

    // Light theme overrides
    assert.match(css, /html\[data-theme="light"\]\s+\.service-deal-card[\s\S]*?background:\s*#ffffff/, 'Light theme card must have white background');
    assert.match(css, /\.theme-light\s+\.service-deal-card/, 'Must include .theme-light selector');
    assert.match(css, /html\[data-theme="light"\]\s+\.deal-title-text[\s\S]*?color:\s*#0f172a/, 'Light theme deal title must be #0f172a');
    assert.match(css, /html\[data-theme="light"\]\s+\.deal-amount-banner[\s\S]*?background:\s*#f8fafc/, 'Light theme amount banner must use #f8fafc');
    assert.match(css, /html\[data-theme="light"\]\s+\.deal-amount-val[\s\S]*?color:\s*#059669/, 'Light theme amount value must use rich emerald #059669');
});
