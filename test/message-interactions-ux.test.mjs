import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CHAT_JSX = fs.readFileSync(path.resolve('src/pages/Chat.jsx'), 'utf8');
const CHAT_CSS = fs.readFileSync(path.resolve('src/pages/Chat.css'), 'utf8');
const ACTION_MENU_JSX = fs.readFileSync(path.resolve('src/components/MessageActionMenu.jsx'), 'utf8');
const ACTION_MENU_CSS = fs.readFileSync(path.resolve('src/components/MessageActionMenu.css'), 'utf8');
const DELETE_MODAL_JSX = fs.readFileSync(path.resolve('src/components/MessageDeleteModal.jsx'), 'utf8');
const INFO_MODAL_JSX = fs.readFileSync(path.resolve('src/components/MessageInfoModal.jsx'), 'utf8');

test('Message Interactions: MessageActionMenu renders cohesive floating pill and three-dot dropdown', () => {
    assert.ok(ACTION_MENU_JSX.includes("const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏']"), 'Must include 6 reaction emojis');
    assert.ok(ACTION_MENU_JSX.includes('msg-action-pill'), 'Must render unified floating pill');
    assert.ok(ACTION_MENU_JSX.includes('msg-three-dot-btn'), 'Must render three-dot button inside floating control');
    assert.ok(ACTION_MENU_JSX.includes('msg-dropdown-menu'), 'Must render dropdown menu on three-dot activation');
    assert.ok(ACTION_MENU_CSS.includes('.msg-action-backdrop'), 'Must include dimming backdrop');
});

test('Message Interactions: MessageActionMenu strictly disables Edit when message is seen or author is not sender', () => {
    assert.ok(ACTION_MENU_JSX.includes('isSeen'), 'Must check if message is seen');
    assert.ok(ACTION_MENU_JSX.includes('canEdit'), 'Must define canEdit gate');
    assert.ok(ACTION_MENU_JSX.includes('isSentByMe && isText && !isSeen'), 'canEdit must require isSentByMe, isText, and !isSeen');
    assert.ok(!ACTION_MENU_JSX.includes('canEdit = true'), 'canEdit must not be unconditionally true');
});

test('Message Interactions: MessageDeleteModal strictly restricts Delete for Everyone to unseen sender messages', () => {
    assert.ok(DELETE_MODAL_JSX.includes('canDeleteForEveryone'), 'Must define canDeleteForEveryone gate');
    assert.ok(DELETE_MODAL_JSX.includes('isSentByMe && !isSeen'), 'canDeleteForEveryone must require isSentByMe and !isSeen');
    assert.ok(DELETE_MODAL_JSX.includes('Delete for everyone'), 'Must render Delete for everyone button when permitted');
    assert.ok(DELETE_MODAL_JSX.includes('Delete for me'), 'Must always offer Delete for me option');
    assert.ok(DELETE_MODAL_JSX.includes('Seen messages can only be deleted for you'), 'Must display clear notice when message was already seen');
});

test('Message Interactions: MessageInfoModal displays Sent, Delivered, and Seen timestamps', () => {
    assert.ok(INFO_MODAL_JSX.includes('Sent'), 'Must render Sent row');
    assert.ok(INFO_MODAL_JSX.includes('Delivered'), 'Must render Delivered row');
    assert.ok(INFO_MODAL_JSX.includes('Seen'), 'Must render Seen row');
    assert.ok(INFO_MODAL_JSX.includes('Not yet seen'), 'Must display fallback when unread');
    assert.ok(INFO_MODAL_JSX.includes('formatTimestamp'), 'Must format timestamps cleanly');
});

test('Message Interactions: Chat.jsx implements Swipe Left to Reply gesture and dynamic indicator', () => {
    assert.ok(CHAT_JSX.includes('handleMessageTouchStart'), 'Must handle touch start on message row');
    assert.ok(CHAT_JSX.includes('handleMessageTouchMove'), 'Must track swipe translation');
    assert.ok(CHAT_JSX.includes('handleMessageTouchEnd'), 'Must trigger reply threshold on touch release');
    assert.ok(CHAT_JSX.includes('message-swipe-reply-indicator'), 'Must render swipe reply curved arrow indicator');
    assert.ok(CHAT_JSX.includes('message-row-wrapper'), 'Must wrap messages in gesture container');
    assert.ok(CHAT_JSX.includes('handleActivateReply'), 'Must define reply activation helper');
});

test('Message Interactions: Chat.jsx enables jumping and glow-highlighting for quoted replies', () => {
    assert.ok(CHAT_JSX.includes('handleScrollToQuotedMessage'), 'Must define handleScrollToQuotedMessage callback');
    assert.ok(CHAT_JSX.includes('message-highlight-pulse'), 'Must apply pulse highlight class on quoted jump');
    assert.ok(CHAT_JSX.includes('virtuosoRef.current.scrollToIndex') || CHAT_JSX.includes('virtuosoRef.current?.scrollToIndex'), 'Must scroll Virtuoso to quoted index');
    assert.ok(CHAT_CSS.includes('.message-highlight-pulse'), 'CSS must define pulse animation');
});

test('Message Interactions: Chat.jsx and Chat.css eliminate permanent clutter icons beside bubbles', () => {
    assert.ok(!CHAT_JSX.includes('className="message-action-buttons"'), 'Must eliminate permanent message-action-buttons from JSX');
    assert.ok(!CHAT_JSX.includes('className="btn-quick-react-bubble"'), 'Must eliminate permanent btn-quick-react-bubble');
    assert.ok(CHAT_JSX.includes('message-selected-active'), 'Selected message must receive elevation class');
    assert.ok(CHAT_CSS.includes('.message-selected-active'), 'CSS must define selected message elevation');
});
