import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Gift Animation System - Virtual Gifts Registry matches user specification', () => {
    const coinServicePath = path.join(rootDir, 'src', 'services', 'coinService.js');
    assert.ok(fs.existsSync(coinServicePath), 'coinService.js must exist');
    const content = fs.readFileSync(coinServicePath, 'utf8');

    // Extract VIRTUAL_GIFTS array definition
    const match = content.match(/export\s+const\s+VIRTUAL_GIFTS\s*=\s*(\[[\s\S]*?\]);/);
    assert.ok(match, 'Must find VIRTUAL_GIFTS array export in coinService.js');

    // Evaluate in safe isolated scope
    const VIRTUAL_GIFTS = new Function(`return ${match[1]}`)();
    assert.ok(Array.isArray(VIRTUAL_GIFTS), 'VIRTUAL_GIFTS must be an array');
    assert.strictEqual(VIRTUAL_GIFTS.length, 7, 'Expected exactly 7 virtual gifts');

    const expectedGifts = [
        { id: 'rose', name: 'Digital Rose', emoji: '🌹', coins: 20 },
        { id: 'zobo', name: 'Cold Zobo', emoji: '🍷', coins: 20 },
        { id: 'suya', name: 'Hot Suya', emoji: '🍢', coins: 50 },
        { id: 'airtime', name: 'Airtime Charm', emoji: '📱', coins: 100 },
        { id: 'bouquet', name: 'Campus Bouquet', emoji: '💐', coins: 200 },
        { id: 'crown', name: 'Royal Crown', emoji: '👑', coins: 500 },
        { id: 'lion', name: 'Campus Lion', emoji: '🦁', coins: 10000 }
    ];

    for (const exp of expectedGifts) {
        const found = VIRTUAL_GIFTS.find(g => g.id === exp.id);
        assert.ok(found, `Gift ${exp.id} (${exp.name}) must exist`);
        assert.strictEqual(found.name, exp.name, `Gift ${exp.id} name mismatch`);
        assert.strictEqual(found.emoji, exp.emoji, `Gift ${exp.id} emoji mismatch`);
        assert.strictEqual(found.coins, exp.coins, `Gift ${exp.id} coins mismatch`);
    }

    const lion = VIRTUAL_GIFTS.find(g => g.id === 'lion');
    assert.strictEqual(lion.earningCreditNgn, 80000, 'Campus Lion must provide ₦80,000 recipient earning credit');
});

test('Gift Animation System - Synthesized Audio Engine handles all 7 tiers gracefully', async () => {
    const { playGiftCelebrationSound } = await import('../src/lib/audioContext.js');
    assert.strictEqual(typeof playGiftCelebrationSound, 'function', 'playGiftCelebrationSound must be exported');

    // In Node.js environment without window.AudioContext, it must exit safely without throwing
    const giftIds = ['rose', 'zobo', 'suya', 'airtime', 'bouquet', 'crown', 'lion', 'unknown_tier'];
    for (const id of giftIds) {
        assert.doesNotThrow(() => {
            playGiftCelebrationSound(id);
        }, `playGiftCelebrationSound('${id}') should be safe in all runtime environments`);
    }
});

test('Gift Animation System - GiftCelebrationOverlay component and CSS contracts', () => {
    const componentPath = path.join(rootDir, 'src', 'components', 'GiftCelebrationOverlay.jsx');
    const cssPath = path.join(rootDir, 'src', 'components', 'GiftCelebrationOverlay.css');

    assert.ok(fs.existsSync(componentPath), 'GiftCelebrationOverlay.jsx must exist');
    assert.ok(fs.existsSync(cssPath), 'GiftCelebrationOverlay.css must exist');

    const jsx = fs.readFileSync(componentPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');

    // JSX contracts
    assert.ok(jsx.includes('export default function GiftCelebrationOverlay'), 'Must default export GiftCelebrationOverlay');
    assert.ok(jsx.includes('THEMED_PARTICLES'), 'Must define theme particles');
    assert.ok(jsx.includes('isLion'), 'Must check for Campus Lion whale tier');
    assert.ok(jsx.includes('playGiftCelebrationSound'), 'Must trigger sound effect');
    assert.ok(jsx.includes('triggerSuccessHaptic'), 'Must trigger haptic feedback');
    assert.ok(jsx.includes('gift-sunburst'), 'Must render sunburst ray element');
    assert.ok(jsx.includes('btn-gift-say-thanks'), 'Must render Say Thanks CTA');

    // CSS contracts
    assert.ok(css.includes('.gift-celebration-backdrop'), 'Must style celebration backdrop');
    assert.ok(css.includes('.lion-screen-shake'), 'Must include screen shake class');
    assert.ok(css.includes('@keyframes sunburstRotate'), 'Must define sunburst rotation animation');
    assert.ok(css.includes('@keyframes particleFall'), 'Must define particle fall animation');
    assert.ok(css.includes('@keyframes lionScreenShakeAnim'), 'Must define lion screen shake keyframes');
    assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Must include reduced motion accessibility rules');
});

test('Gift Animation System - NotificationContext integration', () => {
    const notifContextPath = path.join(rootDir, 'src', 'contexts', 'NotificationContext.jsx');
    const contextContent = fs.readFileSync(notifContextPath, 'utf8');

    assert.ok(contextContent.includes('GiftCelebrationOverlay'), 'Must import GiftCelebrationOverlay in NotificationContext');
    assert.ok(contextContent.includes('activeGiftCelebration'), 'Must have activeGiftCelebration state');
    assert.ok(contextContent.includes('triggerGiftCelebration'), 'Must export triggerGiftCelebration in context');
    assert.ok(contextContent.includes("tcd:trigger-gift-celebration"), 'Must listen for tcd:trigger-gift-celebration event');
    assert.ok(contextContent.includes("newNotification.type === 'gift_received'"), 'Must trigger on incoming gift_received notification');
});

test('Gift Animation System - Chat integration and interactive cards', () => {
    const chatJsxPath = path.join(rootDir, 'src', 'pages', 'Chat.jsx');
    const chatCssPath = path.join(rootDir, 'src', 'pages', 'Chat.css');

    const chatJsx = fs.readFileSync(chatJsxPath, 'utf8');
    const chatCss = fs.readFileSync(chatCssPath, 'utf8');

    // Chat.jsx
    assert.ok(chatJsx.includes('triggerGiftCelebration'), 'Must use triggerGiftCelebration from useNotifications');
    assert.ok(chatJsx.includes("payload.type === 'gift'"), 'Must intercept incoming real-time gift messages');
    assert.ok(chatJsx.includes('interactive-gift-card'), 'Must render interactive gift card in message list');
    assert.ok(chatJsx.includes('btn-replay-gift'), 'Must provide replay animation button');

    // Chat.css
    assert.ok(chatCss.includes('.gift-message.interactive-gift-card'), 'Must style interactive gift card');
    assert.ok(chatCss.includes('.lion-card'), 'Must style lion card variant');
    assert.ok(chatCss.includes('.btn-replay-gift'), 'Must style replay button');
    assert.ok(chatCss.includes('[data-theme="light"] .gift-message.interactive-gift-card'), 'Must support light theme for interactive gift cards');
});

test('Gift Animation System - Notification Routing Category & Icons', async () => {
    const { getNotificationCategory, getNotificationIcon, NOTIFICATION_CATEGORIES } = await import('../src/utils/notificationRouting.js');

    assert.strictEqual(getNotificationCategory({ type: 'gift_received' }), NOTIFICATION_CATEGORIES.MESSAGES);
    assert.strictEqual(getNotificationCategory({ type: 'gift' }), NOTIFICATION_CATEGORIES.MESSAGES);
    assert.strictEqual(getNotificationIcon('gift'), 'G');
    assert.strictEqual(getNotificationIcon('gift_received'), 'G');
});

test('Gift Animation System - SQL Migration for send_coin_gift notification exists and is valid', () => {
    const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20261021100000_send_coin_gift_notification.sql');
    assert.ok(fs.existsSync(migrationPath), 'Migration 20261021100000_send_coin_gift_notification.sql must exist');

    const sql = fs.readFileSync(migrationPath, 'utf8');
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.send_coin_gift'), 'Must declare send_coin_gift function');
    assert.ok(sql.includes("INSERT INTO public.notifications"), 'Must insert into public.notifications');
    assert.ok(sql.includes("'gift_received'"), 'Notification type must be gift_received');
    assert.ok(sql.includes("WHEN 'lion' THEN"), 'Must handle Campus Lion tier in CASE');
    assert.ok(sql.includes("v_notif_priority := 'critical'"), 'Must handle Campus Lion tier critical priority');
    assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.send_coin_gift'), 'Must grant execute permissions to authenticated');
});
