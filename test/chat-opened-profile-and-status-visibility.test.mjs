import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

test('Friend Status Visibility Contract in statusService.js', () => {
    const statusServicePath = path.join(rootDir, 'src/services/statusService.js');
    const content = fs.readFileSync(statusServicePath, 'utf8');

    assert.ok(content.includes('export async function getActiveUserStatuses'), 'Must export getActiveUserStatuses');
    assert.ok(content.includes('export async function getRecentStatuses'), 'Must export getRecentStatuses');
    assert.ok(content.includes('export async function getUserStatuses'), 'Must export getUserStatuses');
    
    // Check that shadow_banned is not discarding legitimate chat friend statuses
    assert.ok(!content.includes('user.is_shadow_banned || user.is_banned'), 'Must not discard shadow_banned statuses in getRecentStatuses mapping');
    assert.ok(content.includes('user?.is_banned'), 'Must filter truly banned users');
});

test('Chat-Opened Profile Redesign Contract in Profile.jsx', () => {
    const profilePath = path.join(rootDir, 'src/pages/Profile.jsx');
    const content = fs.readFileSync(profilePath, 'utf8');

    assert.ok(content.includes('isFromChat && !showGalleryView'), 'Must conditionally render chat-opened profile view when fromChat is true');
    assert.ok(content.includes('data-testid="chat-opened-profile-view"'), 'Must include testid for chat opened profile view');
    assert.ok(content.includes('chat-profile-top-bar'), 'Must include top navigation bar with back to chat');
    assert.ok(content.includes('chat-profile-gallery-toggle'), 'Must include gallery toggle button');
    assert.ok(content.includes('chat-profile-avatar-wrap'), 'Must render avatar wrapper with active status support');
    assert.ok(content.includes('chat-profile-status-banner'), 'Must render status banner when allStatuses.length > 0');
    assert.ok(content.includes('chat-profile-no-status-pill'), 'Must render subtle empty status pill when allStatuses is empty');
    assert.ok(content.includes('chat-profile-actions-bar'), 'Must render 4 core actions strip');
    assert.ok(content.includes('vibe-action-btn'), 'Must include Vibe action button');
    assert.ok(content.includes('message-action-btn'), 'Must include Message action button');
    assert.ok(content.includes('call-action-btn'), 'Must include Call action button');
    assert.ok(content.includes('gift-action-btn'), 'Must include Gift action button');
    assert.ok(content.includes('allStatuses = useMemo'), 'Must memoize allStatuses to prevent unnecessary re-renders');
});

test('Chat-Opened Profile Styles Contract in Profile.css', () => {
    const profileCssPath = path.join(rootDir, 'src/pages/Profile.css');
    const content = fs.readFileSync(profileCssPath, 'utf8');

    assert.ok(content.includes('.chat-opened-profile-view'), 'Must define .chat-opened-profile-view styling');
    assert.ok(content.includes('.chat-profile-top-bar'), 'Must define .chat-profile-top-bar styling');
    assert.ok(content.includes('.chat-profile-back-btn'), 'Must define .chat-profile-back-btn styling');
    assert.ok(content.includes('.chat-profile-hero'), 'Must define .chat-profile-hero styling');
    assert.ok(content.includes('.chat-profile-status-banner'), 'Must define .chat-profile-status-banner styling');
    assert.ok(content.includes('.chat-profile-actions-bar'), 'Must define .chat-profile-actions-bar grid styling');
    assert.ok(content.includes('@media (max-width: 600px)'), 'Must define mobile responsiveness for chat opened profile');
});

test('StatusViewer Robustness & Portal Contract', () => {
    const statusViewerPath = path.join(rootDir, 'src/components/StatusViewer.jsx');
    const content = fs.readFileSync(statusViewerPath, 'utf8');

    assert.ok(content.includes('createPortal'), 'StatusViewer must use createPortal to escape ancestor transform stacking contexts');
    assert.ok(content.includes('onCloseRef'), 'StatusViewer must use onCloseRef to avoid retriggering effects on parent re-renders');
    assert.ok(content.includes('handleNextRef'), 'StatusViewer must use handleNextRef');
    assert.ok(content.includes('markStatusAsViewed'), 'StatusViewer must mark displayed status as viewed');
});

test('WhatsApp-Style Status Viewed State Contract in statusService.js, Chat.jsx, and Profile.jsx', () => {
    const statusServicePath = path.join(rootDir, 'src/services/statusService.js');
    const serviceContent = fs.readFileSync(statusServicePath, 'utf8');

    assert.ok(serviceContent.includes('export function getViewedStatusIds'), 'statusService must export getViewedStatusIds');
    assert.ok(serviceContent.includes('export function markStatusAsViewedLocally'), 'statusService must export markStatusAsViewedLocally');
    assert.ok(serviceContent.includes('export async function markStatusAsViewed'), 'statusService must export markStatusAsViewed');
    assert.ok(serviceContent.includes("'cd:status-viewed'"), 'statusService must dispatch cd:status-viewed custom event');

    const chatPath = path.join(rootDir, 'src/pages/Chat.jsx');
    const chatContent = fs.readFileSync(chatPath, 'utf8');

    assert.ok(chatContent.includes('usersWithUnviewedStatus'), 'Chat.jsx must track usersWithUnviewedStatus');
    assert.ok(chatContent.includes("'cd:status-viewed'"), 'Chat.jsx must listen for cd:status-viewed event');
    assert.ok(chatContent.includes('has-viewed-status'), 'Chat.jsx must support has-viewed-status class');
    assert.ok(chatContent.includes('is-viewed'), 'Chat.jsx must support is-viewed dot status');

    const chatCssPath = path.join(rootDir, 'src/pages/Chat.css');
    const chatCssContent = fs.readFileSync(chatCssPath, 'utf8');

    assert.ok(chatCssContent.includes('.avatar-wrapper.has-viewed-status'), 'Chat.css must define .avatar-wrapper.has-viewed-status');
    assert.ok(chatCssContent.includes('.status-story-indicator.is-viewed'), 'Chat.css must define .status-story-indicator.is-viewed');

    const profilePath = path.join(rootDir, 'src/pages/Profile.jsx');
    const profileContent = fs.readFileSync(profilePath, 'utf8');

    assert.ok(profileContent.includes('hasUnviewedStatus'), 'Profile.jsx must calculate hasUnviewedStatus');
    assert.ok(profileContent.includes("'cd:status-viewed'"), 'Profile.jsx must listen for cd:status-viewed event');
    assert.ok(profileContent.includes('has-viewed-status'), 'Profile.jsx must apply has-viewed-status class');

    const profileCssPath = path.join(rootDir, 'src/pages/Profile.css');
    const profileCssContent = fs.readFileSync(profileCssPath, 'utf8');

    assert.ok(profileCssContent.includes('.chat-profile-avatar-wrap.has-viewed-status'), 'Profile.css must style .chat-profile-avatar-wrap.has-viewed-status');
    assert.ok(profileCssContent.includes('.chat-profile-status-banner.is-viewed'), 'Profile.css must style .chat-profile-status-banner.is-viewed');
});

test('Friend Notification on Status Upload Contract', () => {
    const statusServicePath = path.join(rootDir, 'src/services/statusService.js');
    const serviceContent = fs.readFileSync(statusServicePath, 'utf8');

    assert.ok(serviceContent.includes('export async function notifyFriendsOfNewStatus'), 'statusService must export notifyFriendsOfNewStatus');
    assert.ok(serviceContent.includes("from('matches')"), 'notifyFriendsOfNewStatus must query matches for mutual friends');
    assert.ok(serviceContent.includes("type: 'status_update'"), 'notifyFriendsOfNewStatus must create status_update notification');
    assert.ok(serviceContent.includes('sendEmailNotification'), 'notifyFriendsOfNewStatus must dispatch email notification to friends');

    const uploadModalPath = path.join(rootDir, 'src/components/StatusUploadModal.jsx');
    const uploadModalContent = fs.readFileSync(uploadModalPath, 'utf8');

    assert.ok(uploadModalContent.includes('notifyFriendsOfNewStatus'), 'StatusUploadModal must trigger notifyFriendsOfNewStatus on successful upload');
});

test('High-Priority Notification for Public Campus Confessions Contract', () => {
    const confessionServicePath = path.join(rootDir, 'src/services/confessionService.js');
    const confessionContent = fs.readFileSync(confessionServicePath, 'utf8');

    assert.ok(confessionContent.includes('export async function notifyFriendsOfPublicConfession'), 'confessionService must export notifyFriendsOfPublicConfession');
    assert.ok(confessionContent.includes("priority: 'high'"), 'notifyFriendsOfPublicConfession must use high priority for public confessions');
    assert.ok(confessionContent.includes('sendEmailNotification'), 'notifyFriendsOfPublicConfession must send email notification');
    assert.ok(confessionContent.includes('notifyFriendsOfPublicConfession('), 'postConfession must invoke notifyFriendsOfPublicConfession when post is not anonymous');
});

