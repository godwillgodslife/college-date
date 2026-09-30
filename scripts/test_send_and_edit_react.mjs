import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import path from 'path';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;

function captureScreenshot(filename) {
    const fullPath = path.resolve('public/evidence_qa', filename);
    execSync(`${ADB} shell screencap -p /sdcard/screen.png`);
    execSync(`${ADB} pull /sdcard/screen.png "${fullPath}"`);
    console.log(`[Screenshot Captured] ${filename}`);
    return fullPath;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log('=== REACT CONTROLLED INPUT TEST: SEND -> EDIT -> VERIFY ===');

    // 1. Close any modal
    await evalInPage(`(() => {
        const btn = document.querySelector('.btn-msg-delete-cancel') || document.querySelector('.msg-info-close-btn') || document.querySelector('.msg-action-backdrop');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(800);

    // 2. Type message using React native value setter
    console.log('Typing message with native setter...');
    const typed = await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input');
        if (!input) return false;
        const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        setVal.call(input, "Hello from Android Studio Light Emulator! Testing Edit.");
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return input.value;
    })()`, '9222');
    console.log('Typed value:', typed);
    await sleep(600);

    // 3. Click send button
    console.log('Clicking send button...');
    await evalInPage(`(() => {
        const sendBtn = document.querySelector('.chat-send-btn');
        if (sendBtn) sendBtn.click();
    })()`, '9222');
    await sleep(2500);

    // 4. Inspect bubbles
    const bubbleTexts = await evalInPage(`(() => {
        return Array.from(document.querySelectorAll('.message-bubble')).map(b => b.innerText);
    })()`, '9222');
    console.log('Message bubbles after send:', bubbleTexts);

    // 5. Select this newly sent message
    console.log('Selecting newly sent message...');
    await evalInPage(`(() => {
        const rows = document.querySelectorAll('.message-row-wrapper');
        const lastRow = rows[rows.length - 1];
        if (lastRow) {
            const rect = lastRow.getBoundingClientRect();
            lastRow.dispatchEvent(new MouseEvent('mousedown', {
                bubbles: true, cancelable: true,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
                button: 0
            }));
        }
    })()`, '9222');
    await sleep(600);
    await evalInPage(`window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))`, '9222');
    await sleep(800);

    // 6. Click three-dot button
    console.log('Clicking three-dot button on floating pill...');
    await evalInPage(`(() => {
        const btn = document.querySelector('.msg-three-dot-btn');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(800);

    const dropdownItems = await evalInPage(`(() => {
        const dropdown = document.querySelector('.msg-dropdown-menu');
        if (!dropdown) return { found: false };
        return {
            found: true,
            items: Array.from(dropdown.querySelectorAll('.msg-menu-item')).map(b => b.innerText.trim())
        };
    })()`, '9222');
    console.log('Dropdown items for newly sent message:', dropdownItems);
    captureScreenshot('evidence_06_three_dot_dropdown_fresh.png');

    // 7. Click Edit
    console.log('Clicking Edit in dropdown...');
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.msg-menu-item'));
        const editBtn = items.find(b => b.innerText.includes('Edit'));
        if (editBtn) editBtn.click();
    })()`, '9222');
    await sleep(1000);

    const editBanner = await evalInPage(`(() => {
        const banner = document.querySelector('.chat-editing-banner');
        const input = document.getElementById('chat-message-input');
        return {
            hasBanner: !!banner,
            bannerText: banner ? banner.innerText : null,
            inputValue: input ? input.value : null
        };
    })()`, '9222');
    console.log('Edit banner active state:', editBanner);
    captureScreenshot('evidence_09_edit_mode_active.png');

    // 8. Update text and submit edit
    console.log('Updating text and submitting edit...');
    await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input');
        if (input) {
            const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            setVal.call(input, "Hello from Android Studio Light Emulator! (EDITED LIVE ✨)");
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    })()`, '9222');
    await sleep(500);

    await evalInPage(`(() => {
        const sendBtn = document.querySelector('.chat-send-btn');
        if (sendBtn) sendBtn.click();
    })()`, '9222');
    await sleep(2500);

    const editedBubble = await evalInPage(`(() => {
        const bubbles = document.querySelectorAll('.message-bubble');
        const last = bubbles[bubbles.length - 1];
        return {
            text: last ? last.innerText : null,
            hasEditedBadge: last ? last.innerText.toLowerCase().includes('edited') || !!last.querySelector('.message-edited-badge') : false
        };
    })()`, '9222');
    console.log('Edited bubble state:', editedBubble);
    captureScreenshot('evidence_10_message_edited_live.png');

    console.log('=== REACT CONTROLLED INPUT TEST COMPLETE ===');
}

main().catch(console.error);
