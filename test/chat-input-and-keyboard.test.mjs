import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CHAT_JSX = fs.readFileSync(path.resolve('src/pages/Chat.jsx'), 'utf8');
const CHAT_CSS = fs.readFileSync(path.resolve('src/pages/Chat.css'), 'utf8');
const ANDROID_POLISH_CSS = fs.readFileSync(path.resolve('src/styles/androidPolish.css'), 'utf8');
const APP_LAYOUT_CSS = fs.readFileSync(path.resolve('src/components/AppLayout.css'), 'utf8');
const STICKER_DRAWER_JSX = fs.readFileSync(path.resolve('src/components/StickerDrawer.jsx'), 'utf8');

test('Chat Input: contains full IME attributes enabling Android keyboard emoji suggestion strip', () => {
    assert.ok(CHAT_JSX.includes('autoComplete="on"'), 'Chat input must specify autoComplete="on"');
    assert.ok(CHAT_JSX.includes('autoCorrect="on"'), 'Chat input must specify autoCorrect="on"');
    assert.ok(CHAT_JSX.includes('autoCapitalize="sentences"'), 'Chat input must specify autoCapitalize="sentences"');
    assert.ok(CHAT_JSX.includes('spellCheck={true}'), 'Chat input must specify spellCheck={true}');
    assert.ok(CHAT_JSX.includes('enterKeyHint="send"'), 'Chat input must specify enterKeyHint="send"');
    assert.ok(CHAT_JSX.includes('inputMode="text"'), 'Chat input must specify inputMode="text" for standard Android keyboard');
    assert.ok(CHAT_JSX.includes('name="message"'), 'Chat input must specify name="message" for accessibility and autofill');
    assert.ok(CHAT_JSX.includes('id="chat-message-input"'), 'Chat input must specify id="chat-message-input"');
});

test('Chat Input: uses multiline auto-resizing textarea with keyboard enter handling and Android IME composition safeguards', () => {
    assert.ok(CHAT_JSX.includes('chat-textarea'), 'Chat input must use chat-textarea class');
    assert.ok(CHAT_JSX.includes('<textarea'), 'Chat composer must render a textarea element');
    assert.ok(CHAT_JSX.includes('adjustInputHeight'), 'Chat component must include adjustInputHeight helper');
    assert.ok(CHAT_JSX.includes("e.key === 'Enter' && !e.shiftKey"), 'Hardware Enter key must trigger send on Enter without Shift');
    assert.ok(CHAT_JSX.includes('!e.nativeEvent?.isComposing'), 'Enter key must NOT trigger send while native IME is composing');
    assert.ok(CHAT_JSX.includes('e.keyCode !== 229'), 'Enter key must ignore keyCode 229 used by Android IME composition');
    assert.ok(CHAT_JSX.includes('onCompositionStart'), 'Chat textarea must handle onCompositionStart');
    assert.ok(CHAT_JSX.includes('onCompositionEnd'), 'Chat textarea must handle onCompositionEnd');
});

test('Chat Input CSS: ensures system text selection handles, copy/paste, and gesture typing work', () => {
    assert.ok(CHAT_CSS.includes('-webkit-user-select: text !important'), 'Chat.css must set -webkit-user-select: text !important');
    assert.ok(CHAT_CSS.includes('user-select: text !important'), 'Chat.css must set user-select: text !important');
    assert.ok(CHAT_CSS.includes('-webkit-touch-callout: default !important'), 'Chat.css must set -webkit-touch-callout: default !important');
    assert.ok(CHAT_CSS.includes('touch-action: manipulation'), 'Chat.css must set touch-action: manipulation');
    assert.ok(ANDROID_POLISH_CSS.includes('html.is-native-app .chat-input'), 'androidPolish.css must style native chat-input');
    assert.ok(ANDROID_POLISH_CSS.includes('-webkit-touch-callout: default !important'), 'androidPolish.css must ensure touch-callout default');
});

test('Android Layout: messages-container strictly avoids --keyboard-offset double compensation', () => {
    // Locate the html.is-native-app .messages-container rule in androidPolish.css
    const nativeMessagesRule = ANDROID_POLISH_CSS.match(/html\.is-native-app\s+\.messages-container\s*\{([^}]+)\}/);
    assert.ok(nativeMessagesRule, 'Must find html.is-native-app .messages-container rule');
    assert.ok(!nativeMessagesRule[1].includes('var(--keyboard-offset'), 'messages-container must NOT apply var(--keyboard-offset) which causes double compensation');
    assert.ok(nativeMessagesRule[1].includes('padding: 0.75rem 0.9rem 0.5rem'), 'messages-container must have clean padding');
});

test('Android Layout: chat-input-area anchors cleanly when keyboard is open', () => {
    assert.ok(ANDROID_POLISH_CSS.includes('.keyboard-open .chat-input-area'), 'Must define rule for keyboard-open .chat-input-area');
    assert.ok(ANDROID_POLISH_CSS.includes('padding-bottom: 0.55rem'), 'Must set snug bottom padding when keyboard is up');
});

test('Chat Layout: messages-container avoids nested scrollbars with Virtuoso', () => {
    // In Chat.css mobile media query, messages-container must have overflow: hidden
    const mobileMessagesMatch = CHAT_CSS.match(/\.messages-container\s*\{[^}]*overflow:\s*hidden\s*!important/);
    assert.ok(mobileMessagesMatch, 'messages-container must use overflow: hidden to allow Virtuoso to be the sole scroller');
});

test('App Layout & Chat Page: dynamic viewport heights respect keyboard resizing without rigid gaps', () => {
    assert.ok(APP_LAYOUT_CSS.includes('body.mobile-chat-active .app-main'), 'AppLayout must contain mobile-chat-active rule');
    assert.ok(CHAT_CSS.includes('body.mobile-chat-active .chat-page'), 'Chat.css must contain mobile-chat-active rule');
});

test('College Date Emoji Picker: StickerDrawer preserved with Nigerian stickers and unicode emojis', () => {
    assert.ok(STICKER_DRAWER_JSX.includes('NIGERIAN_STICKERS'), 'StickerDrawer must preserve Nigerian stickers');
    assert.ok(STICKER_DRAWER_JSX.includes('EMOJI_CATEGORIES'), 'StickerDrawer must preserve Emoji categories');
    assert.ok(CHAT_JSX.includes('setShowStickers(!showStickers)'), 'Smiley button must toggle StickerDrawer');
    assert.ok(CHAT_JSX.includes('handleStickerSelect'), 'handleStickerSelect must remain hooked');
});
