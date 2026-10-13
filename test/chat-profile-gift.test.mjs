import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Chat & Profile GIF/Gift Integration: Profile.jsx imports and wires GiftStore without placeholder', () => {
    const profilePath = path.join(rootDir, 'src', 'pages', 'Profile.jsx');
    const profileContent = fs.readFileSync(profilePath, 'utf8');

    // 1. Must import GiftStore and coinService functions
    assert.match(profileContent, /import\s+GiftStore\s+from\s+['"]\.\.\/components\/GiftStore['"]/);
    assert.match(profileContent, /import\s+CoinStoreModal\s+from\s+['"]\.\.\/components\/CoinStoreModal['"]/);
    assert.match(profileContent, /import\s+\{[^}]*getCoinBalance[^}]*sendCoinGift[^}]*\}\s+from\s+['"]\.\.\/services\/coinService['"]/);
    assert.match(profileContent, /useLocation/);

    // 2. Floating action bar must NOT contain 'coming soon' toast on the gift button
    assert.doesNotMatch(profileContent, /addToast\(['"]🎁\s*Gift\s*feature\s*coming\s*soon/i);

    // 3. Floating action bar 4th button must open GiftStore
    assert.match(profileContent, /<button[^>]*className=["'][^"']*gift-btn-glow[^"']*["'][^>]*onClick=\{[^}]*setShowGiftStore\(true\)[^}]*\}[^>]*>[\s\S]*?🎁\s*Gift[\s\S]*?<\/button>/);

    // 4. Must render GiftStore modal with required props
    assert.match(profileContent, /<GiftStore[\s\S]*?onClose=\{[^}]*setShowGiftStore\(false\)[^}]*\}[\s\S]*?onSend=\{handleGiftSend\}[\s\S]*?coinBalance=\{coinBalance\}/);

    // 5. Must implement handleGiftSend calling sendCoinGift with recipient ID, gift ID, and active match ID
    assert.match(profileContent, /const\s+handleGiftSend\s*=\s*async\s*\(/);
    assert.match(profileContent, /sendCoinGift\(userProfile\.id,\s*gift\.id,\s*activeMatchId\)/);

    // 6. Must pass chatId/conversationId when navigating to chat from profile
    assert.match(profileContent, /navigate\(['"]\/chat['"],\s*\{\s*state:\s*\{\s*openChatWith:\s*userProfile\.id,\s*chatId:\s*conversationId\s*\}\s*\}\)/);
});

test('Chat & Profile GIF/Gift Integration: Chat.jsx forwards conversationId to Profile navigation', () => {
    const chatPath = path.join(rootDir, 'src', 'pages', 'Chat.jsx');
    const chatContent = fs.readFileSync(chatPath, 'utf8');

    // 1. handleAvatarClick must accept convId and forward conversationId in navigation state
    assert.match(chatContent, /handleAvatarClick\s*=\s*useCallback\(async\s*\([^)]*convId\s*=\s*null[^)]*\)\s*=>/);
    assert.match(chatContent, /navigate\(`\/profile\/\$\{user\.id\}`,[\s\S]*?conversationId:\s*targetConvId/);

    // 2. Chat header-info click passes selectedConv ID
    assert.match(chatContent, /className=["']header-info["'][^>]*onClick=\{[^}]*handleAvatarClick\([^}]*selectedConv\?\.id\)/);

    // 3. Conversation row avatar click passes conv.id
    assert.match(chatContent, /className=\{`avatar-wrapper[^`]*`\}[^>]*onClick=\{[^}]*handleAvatarClick\([^}]*conv\.id\)/);

    // 4. ChatActionModal handleViewProfile passes conv.id
    assert.match(chatContent, /handleViewProfile[\s\S]*?handleAvatarClick\(targetUser,\s*null,\s*conv\.id\)/);

    // 5. Chat.jsx listens to tcd:gift-sent event to revalidate conversations & load messages
    assert.match(chatContent, /window\.addEventListener\(['"]tcd:gift-sent['"]/);
});

test('Chat & Profile GIF/Gift Integration: GiftStore.jsx features search, empty state, and send safety', () => {
    const giftStorePath = path.join(rootDir, 'src', 'components', 'GiftStore.jsx');
    const giftStoreContent = fs.readFileSync(giftStorePath, 'utf8');
    const giftStoreCssPath = path.join(rootDir, 'src', 'components', 'GiftStore.css');
    const giftStoreCss = fs.readFileSync(giftStoreCssPath, 'utf8');

    // 1. Search state and filtered gifts
    assert.match(giftStoreContent, /searchQuery/);
    assert.match(giftStoreContent, /filteredGifts/);
    assert.match(giftStoreContent, /gift-search-input/);

    // 2. Empty state handling
    assert.match(giftStoreContent, /gift-empty-state/);

    // 3. Duplicate send prevention
    assert.match(giftStoreContent, /if\s*\(isSending\)\s*return;/);

    // 4. Backdrop click dismiss
    assert.match(giftStoreContent, /className=["']gift-store-overlay["'][^>]*onClick=\{onClose\}/);

    // 5. CSS definitions
    assert.match(giftStoreCss, /\.gift-search-wrap/);
    assert.match(giftStoreCss, /\.gift-search-input/);
    assert.match(giftStoreCss, /\.gift-empty-state/);
});
