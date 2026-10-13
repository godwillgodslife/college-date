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
    console.log('=== VERIFYING LIVE CHAT SYSTEM ON EMULATOR ===');

    // 0. Ensure devtools socket forwarding
    let unixOut = execSync(`${ADB} shell cat /proc/net/unix`).toString();
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (match) {
        console.log('[DevTools] Forwarding port 9222 to socket:', match[1]);
        execSync(`${ADB} forward tcp:9222 localabstract:${match[1]}`);
    }

    // 1. Navigate to /chat
    console.log('\n--- 1. INBOX LISTING & ZERO MARGIN LEAK VERIFICATION ---');
    await evalInPage(`(() => {
        if (window.location.pathname !== '/chat') {
            window.location.href = '/chat';
        }
    })()`);

    let convCount = 0;
    for (let i = 0; i < 15; i++) {
        await sleep(1000);
        convCount = await evalInPage(`document.querySelectorAll('.conversation-item').length`);
        if (convCount > 0) break;
    }
    console.log(`Found ${convCount} conversation items.`);

    const restingCheck = await evalInPage(`(() => {
        const firstWrapper = document.querySelector('.conversation-row-wrapper');
        const firstItem = document.querySelector('.conversation-item');
        const ws = firstWrapper ? window.getComputedStyle(firstWrapper) : null;
        const is = firstItem ? window.getComputedStyle(firstItem) : null;
        return {
            wrapperMargin: ws ? ws.margin : null,
            wrapperBorderRadius: ws ? ws.borderRadius : null,
            itemMargin: is ? is.margin : null,
            itemBorderRadius: is ? is.borderRadius : null,
            itemWidth: is ? is.width : null,
            name: firstItem?.querySelector('.conv-name')?.innerText?.trim()
        };
    })()`);
    console.log('Resting styling check:', restingCheck);
    await sleep(600);
    captureScreenshot('chat_inbox_live.png');

    // 2. Test horizontal swipe action (reveal right swipe buttons: More + Delete)
    console.log('\n--- 2. HORIZONTAL SWIPE-TO-REVEAL ACTIONS ---');
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
    captureScreenshot('chat_swipe_revealed_live.png');

    // 3. Test contextual bottom sheet (ChatActionModal)
    console.log('\n--- 3. LONG-PRESS CONTEXTUAL BOTTOM SHEET ---');
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
    captureScreenshot('chat_action_sheet_live.png');

    // 4. Dismiss modal & open Conversation Room
    console.log('\n--- 4. CONVERSATION ROOM & COMPOSER ERGONOMICS ---');
    await evalInPage(`(() => {
        const cancelBtn = document.querySelector('.chat-action-item.cancel');
        if (cancelBtn) cancelBtn.click();
    })()`);
    await sleep(600);

    // Unswipe and open room
    await evalInPage(`(() => {
        const item = document.querySelector('.conversation-item');
        const propsKey = Object.keys(item || {}).find(k => k.startsWith('__reactProps$'));
        const props = propsKey ? item[propsKey] : null;
        if (props?.onClick) props.onClick(); // Unswipes
    })()`);
    await sleep(400);

    await evalInPage(`(() => {
        const item = document.querySelector('.conversation-item');
        const propsKey = Object.keys(item || {}).find(k => k.startsWith('__reactProps$'));
        const props = propsKey ? item[propsKey] : null;
        if (props?.onClick) props.onClick(); // Opens room
    })()`);

    for (let i = 0; i < 15; i++) {
        await sleep(1000);
        const hasComposer = await evalInPage(`!!document.getElementById('chat-message-input')`);
        if (hasComposer) break;
    }
    await sleep(1000);

    // Draft message in composer
    await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input');
        if (input) {
            input.focus();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype || window.HTMLInputElement.prototype, "value")?.set;
            if (nativeSetter) {
                nativeSetter.call(input, "Hey! Let's connect on campus 😊");
            } else {
                input.value = "Hey! Let's connect on campus 😊";
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    })()`);
    await sleep(800);
    captureScreenshot('chat_conversation_room_live.png');

    console.log('\n=== ALL 4 SCREENSHOT ARTIFACTS CAPTURED SUCCESSFULLY ===');
}

main().catch(err => {
    console.error('Verification failed:', err);
    process.exit(1);
});
