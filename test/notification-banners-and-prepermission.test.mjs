import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Option 1: Luxury In-App Notification Banner with Student Avatars & Quick Actions', () => {
    const toastJsx = fs.readFileSync(path.resolve('src/components/Toast.jsx'), 'utf8');
    const toastCss = fs.readFileSync(path.resolve('src/components/Toast.css'), 'utf8');
    const notifContextJsx = fs.readFileSync(path.resolve('src/contexts/NotificationContext.jsx'), 'utf8');

    test('Toast.jsx renders student avatar image and badge when avatarUrl is present', () => {
        assert.ok(toastJsx.includes('activeToast.avatarUrl'), 'Toast must check activeToast.avatarUrl');
        assert.ok(toastJsx.includes('toast-notification-avatar-wrap'), 'Toast must have avatar wrap container');
        assert.ok(toastJsx.includes('toast-notification-avatar-img'), 'Toast must have avatar img element');
        assert.ok(toastJsx.includes('toast-notification-avatar-badge'), 'Toast must have avatar badge indicator');
    });

    test('Toast.jsx renders campus tag when campusTag is present', () => {
        assert.ok(toastJsx.includes('activeToast.campusTag'), 'Toast must check activeToast.campusTag');
        assert.ok(toastJsx.includes('toast-notification-campus'), 'Toast must have campus pill element');
    });

    test('Toast.jsx renders 1-tap quick action button when action is provided', () => {
        assert.ok(toastJsx.includes('activeToast.action'), 'Toast must check activeToast.action');
        assert.ok(toastJsx.includes('toast-notification-action-btn'), 'Toast must render 1-tap action button');
        assert.ok(toastJsx.includes('activeToast.action.onClick'), 'Toast action button must call action.onClick');
    });

    test('Toast.css contains luxury obsidian styling and glowing pink accents', () => {
        assert.ok(toastCss.includes('rgba(17, 24, 39, 0.96)'), 'Toast background must use deep obsidian shade');
        assert.ok(toastCss.includes('rgba(255, 45, 85'), 'Toast must use brand pink glow accents');
        assert.ok(toastCss.includes('.toast-notification-avatar-img'), 'Avatar img styling must exist');
        assert.ok(toastCss.includes('.toast-notification-action-btn'), 'Action button styling must exist');
    });

    test('NotificationContext.jsx passes avatarUrl, campusTag, and quick action to addToast', () => {
        assert.ok(notifContextJsx.includes('avatarUrl'), 'NotificationContext must pass avatarUrl');
        assert.ok(notifContextJsx.includes('campusTag'), 'NotificationContext must pass campusTag');
        assert.ok(notifContextJsx.includes('action: {'), 'NotificationContext must provide quick action object');
        assert.ok(notifContextJsx.includes('badgeIcon'), 'NotificationContext must provide badgeIcon');
    });
});

describe('Option 2: High-Converting Notification Pre-Permission Bottom Sheet', () => {
    const softPromptJsx = fs.readFileSync(path.resolve('src/components/NotificationSoftPrompt.jsx'), 'utf8');
    const softPromptCss = fs.readFileSync(path.resolve('src/components/NotificationSoftPrompt.css'), 'utf8');

    test('NotificationSoftPrompt.jsx contains high-converting campus copy and benefit points', () => {
        assert.ok(softPromptJsx.includes('Never miss a campus connection'), 'Must have compelling headline');
        assert.ok(softPromptJsx.includes('Mutual Matches & Chats'), 'Must highlight matches benefit');
        assert.ok(softPromptJsx.includes('Profile Views & Admirers'), 'Must highlight views benefit');
        assert.ok(softPromptJsx.includes('Campus Confessions & Q&A'), 'Must highlight confessions benefit');
    });

    test('NotificationSoftPrompt.jsx renders simulated preview toast card', () => {
        assert.ok(softPromptJsx.includes('soft-prompt-preview-card'), 'Must render preview toast card');
        assert.ok(softPromptJsx.includes('Amaka • UNILAG'), 'Must render student preview example');
        assert.ok(softPromptJsx.includes('preview-reply-chip'), 'Must render interactive reply preview chip');
    });

    test('NotificationSoftPrompt.jsx exposes debug hooks for QA and emulator verification', () => {
        assert.ok(softPromptJsx.includes('window.__showNotificationPrePermissionSheet'), 'Must expose open hook');
        assert.ok(softPromptJsx.includes('window.__hideNotificationPrePermissionSheet'), 'Must expose close hook');
        assert.ok(softPromptJsx.includes('soft_prompt'), 'Must support query parameter preview');
    });

    test('NotificationSoftPrompt.css has luxury bottom sheet styling and drag handle', () => {
        assert.ok(softPromptCss.includes('soft-prompt-drag-handle'), 'Must include native drag handle');
        assert.ok(softPromptCss.includes('btn-enable-notif'), 'Must style enable CTA button');
        assert.ok(softPromptCss.includes('border-radius: 28px 28px 0 0'), 'Must have rounded bottom sheet top');
    });
});
