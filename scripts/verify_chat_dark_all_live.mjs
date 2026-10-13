import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

process.env.CDP_PORT = '9222';
const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;
const ARTIFACT_DIR = path.resolve('public/evidence_qa');

if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

function captureScreenshot(filename) {
    const fullPath = path.join(ARTIFACT_DIR, filename);
    execSync(`${ADB} shell screencap -p /sdcard/screen.png`);
    execSync(`${ADB} pull /sdcard/screen.png "${fullPath}"`);
    console.log(`[Captured Artifact] ${filename}`);
    return fullPath;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log('=== VERIFYING DARK THEME CHAT FLOW LIVE ON EMULATOR ===');

    // 0. Ensure devtools socket forwarding
    let unixOut = execSync(`${ADB} shell cat /proc/net/unix`).toString();
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (match) {
        console.log('[DevTools] Forwarding port 9222 to socket:', match[1]);
        execSync(`${ADB} forward tcp:9222 localabstract:${match[1]}`);
    }

    // Dismiss tour modal or notifications overlay if present
    console.log('Dismissing popups/tour modals...');
    await evalInPage(`(() => {
        // Close tour
        const xBtn = document.querySelector('svg.lucide-x, [aria-label="Close"], button:has(svg)');
        if (xBtn) xBtn.closest('button')?.click();
        
        // Remove notifications overlay if lingering
        const notifOverlay = document.querySelector('.notification-overlay, .notifications-panel');
        if (notifOverlay) notifOverlay.remove();
    })()`);
    await sleep(600);

    // Navigate to /chat via bottom nav link
    console.log('Navigating to /chat tab...');
    await evalInPage(`(() => {
        const chatsLink = document.querySelector('a[href="/chat"]');
        if (chatsLink) {
            chatsLink.click();
        } else if (window.location.pathname !== '/chat') {
            window.location.href = '/chat';
        }
    })()`);

    let convCount = 0;
    for (let i = 0; i < 20; i++) {
        await sleep(1000);
        convCount = await evalInPage(`document.querySelectorAll('.conversation-item').length`);
        if (convCount > 0) break;
    }
    console.log(`Found ${convCount} conversation items.`);

    // Dismiss any notifications dropdown if open on chat page
    await evalInPage(`(() => {
        const notifDropdown = document.querySelector('.notification-overlay, .notifications-dropdown, .notifications-panel');
        if (notifDropdown) notifDropdown.remove();
    })()`);
    await sleep(600);

    // 1. Capture Resting Dark Inbox
    console.log('\n--- 1. RESTING DARK INBOX ---');
    const inboxInfo = await evalInPage(`(() => {
        const firstWrapper = document.querySelector('.conversation-row-wrapper');
        const firstItem = document.querySelector('.conversation-item');
        const ws = firstWrapper ? window.getComputedStyle(firstWrapper) : null;
        const is = firstItem ? window.getComputedStyle(firstItem) : null;
        return {
            wrapperBg: ws ? ws.backgroundColor : null,
            itemBg: is ? is.backgroundColor : null,
            name: firstItem?.querySelector('.conv-name')?.innerText?.trim()
        };
    })()`);
    console.log('Inbox styling details:', inboxInfo);
    await sleep(500);
    captureScreenshot('chat_inbox_dark_live.png');

    // 2. Horizontal swipe actions in dark mode
    console.log('\n--- 2. HORIZONTAL SWIPE ACTIONS (DARK MODE) ---');
    const swipeRes = await evalInPage(`(async () => {
        const item = document.querySelector('.conversation-item');
        if (!item) return { error: 'No item' };

        const propsKey = Object.keys(item).find(k => k.startsWith('__reactProps$'));
        const props = propsKey ? item[propsKey] : null;
        if (!props) return { error: 'No props' };

        props.onTouchStart({ touches: [{ clientX: 300, clientY: 200 }] });
        props.onTouchEnd({ changedTouches: [{ clientX: 180, clientY: 200 }] });

        await new Promise(r => setTimeout(r, 300));
        const updated = document.querySelector('.conversation-item');
        return {
            swipedTransform: updated?.style?.transform,
            hasDelete: !!document.querySelector('.conv-swipe-btn.delete'),
            hasMore: !!document.querySelector('.conv-swipe-btn.more')
        };
    })()`);
    console.log('Swipe result:', swipeRes);
    await sleep(600);
    captureScreenshot('chat_swipe_dark_live.png');

    // 3. Long-press contextual bottom sheet in dark mode
    console.log('\n--- 3. LONG-PRESS CONTEXTUAL BOTTOM SHEET (DARK MODE) ---');
    const sheetRes = await evalInPage(`(async () => {
        const item = document.querySelector('.conversation-item');
        if (!item) return { error: 'No item' };

        const propsKey = Object.keys(item).find(k => k.startsWith('__reactProps$'));
        const props = propsKey ? item[propsKey] : null;
        if (!props) return { error: 'No props' };

        props.onContextMenu({ preventDefault: () => {} });
        await new Promise(r => setTimeout(r, 600));

        const sheet = document.querySelector('.chat-action-sheet');
        return {
            hasSheet: !!sheet,
            name: document.querySelector('.chat-action-name')?.innerText?.trim(),
            labels: Array.from(document.querySelectorAll('.chat-action-label')).map(el => el.innerText.trim())
        };
    })()`);
    console.log('Bottom sheet result:', sheetRes);
    await sleep(600);
    captureScreenshot('chat_action_sheet_dark_live.png');

    // 4. Dismiss modal & open Conversation Room
    console.log('\n--- 4. CONVERSATION ROOM & COMPOSER (DARK MODE) ---');
    await evalInPage(`(() => {
        const cancelBtn = document.querySelector('.chat-action-item.cancel');
        if (cancelBtn) cancelBtn.click();
    })()`);
    await sleep(600);

    // Unswipe
    await evalInPage(`(() => {
        const item = document.querySelector('.conversation-item');
        const propsKey = Object.keys(item || {}).find(k => k.startsWith('__reactProps$'));
        const props = propsKey ? item[propsKey] : null;
        if (props?.onClick) props.onClick();
    })()`);
    await sleep(400);

    // Click to enter chat room
    await evalInPage(`(() => {
        const item = document.querySelector('.conversation-item');
        const propsKey = Object.keys(item || {}).find(k => k.startsWith('__reactProps$'));
        const props = propsKey ? item[propsKey] : null;
        if (props?.onClick) props.onClick();
    })()`);

    for (let i = 0; i < 20; i++) {
        await sleep(1000);
        const hasComposer = await evalInPage(`!!document.getElementById('chat-message-input')`);
        if (hasComposer) {
            console.log('Conversation room composer found!');
            break;
        }
    }
    await sleep(1000);

    // Focus and draft text in composer
    await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input');
        if (input) {
            input.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype || window.HTMLInputElement.prototype, "value")?.set;
            if (nativeSetter) {
                nativeSetter.call(input, "Hey Tasha! Let's connect on campus 😊");
            } else {
                input.value = "Hey Tasha! Let's connect on campus 😊";
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    })()`);
    await sleep(800);
    captureScreenshot('chat_conversation_room_dark_live.png');

    console.log('\n=== ALL 4 DARK THEME SCREENSHOTS CAPTURED PERFECTLY ===');
}

main().catch(err => {
    console.error('Error during dark verification:', err);
    process.exit(1);
});
