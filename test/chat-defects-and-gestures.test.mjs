import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const CHAT_JSX = fs.readFileSync(path.resolve('src/pages/Chat.jsx'), 'utf8');
const CHAT_CSS = fs.readFileSync(path.resolve('src/pages/Chat.css'), 'utf8');
const NOTIF_CONTEXT_JSX = fs.readFileSync(path.resolve('src/contexts/NotificationContext.jsx'), 'utf8');
const CHAT_SERVICE_JS = fs.readFileSync(path.resolve('src/services/chatService.js'), 'utf8');
const MAIN_JSX = fs.readFileSync(path.resolve('src/main.jsx'), 'utf8');
const ACTION_MODAL_JSX = fs.readFileSync(path.resolve('src/components/ChatActionModal.jsx'), 'utf8');
const ACTION_MODAL_CSS = fs.readFileSync(path.resolve('src/components/ChatActionModal.css'), 'utf8');

// ── Milestone 1: Defect Fixes & Unread Synchronization ───────
test('Milestone 1 - Unread Sync: NotificationContext exports markConversationNotificationsRead and listens for tcd:conversation-read', () => {
    assert.ok(NOTIF_CONTEXT_JSX.includes('markConversationNotificationsRead'), 'NotificationContext must define markConversationNotificationsRead');
    assert.ok(NOTIF_CONTEXT_JSX.includes("window.addEventListener('tcd:conversation-read'"), 'NotificationContext must listen to tcd:conversation-read');
    assert.ok(CHAT_SERVICE_JS.includes("window.dispatchEvent(new CustomEvent('tcd:conversation-read'"), 'chatService markConversationRead must dispatch tcd:conversation-read');
    assert.ok(CHAT_JSX.includes('markConversationNotificationsRead'), 'Chat.jsx must consume and invoke markConversationNotificationsRead');
});

test('Milestone 1 - Pending Selection: Chat.jsx has exactly one resolver effect for pendingSelection', () => {
    const matches = CHAT_JSX.match(/Evaluating pending selection against new conversations list/g);
    assert.equal(matches?.length, 1, 'Chat.jsx must only have one resolver effect for pendingSelection');
    assert.ok(!CHAT_JSX.includes('Robust Retry: Watch conversations and pick up pending selection'), 'Duplicate retry effect must be removed');
});

test('Milestone 1 - Matches Filter Tab: Chat.jsx filters for zero-message conversations on Matches tab', () => {
    assert.ok(CHAT_JSX.includes("filterTab === 'Matches'"), 'filteredConvs must handle Matches tab');
    assert.ok(CHAT_JSX.includes('!conv.last_message || conv.last_message_type === null'), 'Matches tab must filter for fresh matches without messages');
});

test('Milestone 1 - Unread Pill: Chat.jsx renders conv-unread-pill with 99+ ceiling', () => {
    assert.ok(CHAT_JSX.includes('conv-unread-pill'), 'Chat.jsx must render conv-unread-pill');
    assert.ok(CHAT_JSX.includes("conv.unread_count > 99 ? '99+' : (conv.unread_count || 1)"), 'Must format unread counts with 99+ max limit');
    assert.ok(CHAT_CSS.includes('.conv-unread-pill'), 'Chat.css must define .conv-unread-pill');
});

// ── Milestone 2: Contextual Long-Press Menu (ChatActionModal) ─
test('Milestone 2 - ChatActionModal: Component renders contact info and actions', () => {
    assert.ok(ACTION_MODAL_JSX.includes('export default function ChatActionModal'), 'ChatActionModal component must be exported');
    assert.ok(ACTION_MODAL_JSX.includes('onToggleRead'), 'ChatActionModal must support onToggleRead');
    assert.ok(ACTION_MODAL_JSX.includes('onViewProfile'), 'ChatActionModal must support onViewProfile');
    assert.ok(ACTION_MODAL_JSX.includes('onToggleMute'), 'ChatActionModal must support onToggleMute');
    assert.ok(ACTION_MODAL_JSX.includes('onDeleteConversation'), 'ChatActionModal must support onDeleteConversation');
    assert.ok(ACTION_MODAL_JSX.includes('chat-action-confirm-card'), 'ChatActionModal must include delete confirmation step');
    assert.ok(ACTION_MODAL_CSS.includes('.chat-action-sheet'), 'ChatActionModal.css must define bottom sheet styling');
});

test('Milestone 2 - Chat.jsx Context Menu Integration: Handles contextConv and callbacks', () => {
    assert.ok(CHAT_JSX.includes('import ChatActionModal from'), 'Chat.jsx must import ChatActionModal');
    assert.ok(CHAT_JSX.includes('<ChatActionModal'), 'Chat.jsx must render ChatActionModal');
    assert.ok(CHAT_JSX.includes('handleToggleConvRead'), 'Chat.jsx must define handleToggleConvRead');
    assert.ok(CHAT_JSX.includes('handleViewProfile'), 'Chat.jsx must define handleViewProfile');
    assert.ok(CHAT_JSX.includes('handleToggleConvMute'), 'Chat.jsx must define handleToggleConvMute');
    assert.ok(CHAT_JSX.includes('handleDeleteConv'), 'Chat.jsx must define handleDeleteConv');
});

// ── Milestone 3: Keyboard Auto-Scroll & Per-Conversation Drafts ─
test('Milestone 3 - Keyboard Events: main.jsx dispatches keyboard show/hide events', () => {
    assert.ok(MAIN_JSX.includes("'tcd:keyboard-show'"), 'main.jsx must dispatch tcd:keyboard-show event');
    assert.ok(MAIN_JSX.includes("'tcd:keyboard-hide'"), 'main.jsx must dispatch tcd:keyboard-hide event');
});

test('Milestone 3 - Keyboard Auto-Scroll: Chat.jsx listens to keyboard show and auto-scrolls Virtuoso', () => {
    assert.ok(CHAT_JSX.includes("window.addEventListener('tcd:keyboard-show'"), 'Chat.jsx must listen to tcd:keyboard-show');
    assert.ok(CHAT_JSX.includes('scrollToBottomSmooth'), 'Chat.jsx must define scrollToBottomSmooth');
    assert.ok(CHAT_JSX.includes('onFocus={scrollToBottomSmooth}'), 'Chat textarea must trigger scrollToBottomSmooth onFocus');
    assert.ok(CHAT_JSX.includes("virtuosoRef.current.scrollToIndex"), 'Auto-scroll must use Virtuoso scrollToIndex');
});

test('Milestone 3 - Draft Preservation: Chat.jsx preserves drafts per conversation', () => {
    assert.ok(CHAT_JSX.includes('draftsByConvRef'), 'Chat.jsx must maintain draftsByConvRef');
    assert.ok(CHAT_JSX.includes('draftsByConvRef.current[selectedConv.id] = newMessage'), 'Chat.jsx must save draft on switch or close');
    assert.ok(CHAT_JSX.includes('draftsByConvRef.current[conv.id]'), 'Chat.jsx must restore draft when selecting conversation');
    assert.ok(CHAT_JSX.includes('delete draftsByConvRef.current[selectedConv.id]'), 'Chat.jsx must clear draft upon sending message');
});

// ── Milestone 4: Horizontal Swipe Actions on Chat Rows ────────
test('Milestone 4 - Swipe Rows: Chat.jsx wraps conversation items with swipe structure', () => {
    assert.ok(CHAT_JSX.includes('conversation-row-wrapper'), 'Chat.jsx must wrap items in conversation-row-wrapper');
    assert.ok(CHAT_JSX.includes('conv-swipe-actions-left'), 'Chat.jsx must include left swipe action container');
    assert.ok(CHAT_JSX.includes('conv-swipe-actions-right'), 'Chat.jsx must include right swipe action container');
    assert.ok(CHAT_JSX.includes('conv-swipe-btn read'), 'Chat.jsx must render read/unread swipe button');
    assert.ok(CHAT_JSX.includes('conv-swipe-btn more'), 'Chat.jsx must render more swipe button');
    assert.ok(CHAT_JSX.includes('conv-swipe-btn delete'), 'Chat.jsx must render delete swipe button');
});

test('Milestone 4 - Touch Disambiguation: Chat.jsx preserves vertical scrolling over swipes', () => {
    assert.ok(CHAT_JSX.includes('handleConvTouchStart'), 'Chat.jsx must implement handleConvTouchStart');
    assert.ok(CHAT_JSX.includes('handleConvTouchMove'), 'Chat.jsx must implement handleConvTouchMove');
    assert.ok(CHAT_JSX.includes('handleConvTouchEnd'), 'Chat.jsx must implement handleConvTouchEnd');
    assert.ok(CHAT_JSX.includes('Math.abs(dy) > Math.abs(dx)'), 'Touch move must check vertical dominance to preserve scrolling');
    assert.ok(CHAT_CSS.includes('touch-action: pan-y'), 'Chat.css must maintain touch-action: pan-y');
});
