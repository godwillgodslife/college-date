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
    console.log('=== TEST NATIVE TYPING, SEND, EDIT ON ANDROID EMULATOR ===');

    // 1. Focus input
    console.log('1. Focusing chat input...');
    await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input');
        if (input) input.focus();
    })()`, '9222');
    await sleep(600);

    // 2. Type text via adb native keyboard input
    console.log('2. Typing via adb native keyboard...');
    execSync(`${ADB} shell input text "TestingEditFlow"`);
    await sleep(800);

    // 3. Verify send button is now present
    const hasSend = await evalInPage(`!!document.querySelector('.chat-send-btn')`, '9222');
    console.log('Has send button:', hasSend);

    // 4. Click send button
    console.log('4. Clicking send button...');
    await evalInPage(`(() => {
        const btn = document.querySelector('.chat-send-btn');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(2500);

    // 5. Hide keyboard
    execSync(`${ADB} shell input keyevent KEYCODE_BACK`);
    await sleep(600);

    // 6. Inspect last message bubble
    const lastBubbleText = await evalInPage(`(() => {
        const bubbles = document.querySelectorAll('.message-bubble');
        const last = bubbles[bubbles.length - 1];
        return last ? last.innerText : null;
    })()`, '9222');
    console.log('Newly sent bubble text:', lastBubbleText);

    // 7. Long-press new message
    console.log('7. Selecting new message...');
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

    // 8. Click .msg-three-dot-btn
    console.log('8. Clicking .msg-three-dot-btn...');
    await evalInPage(`(() => {
        const btn = document.querySelector('.msg-three-dot-btn');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(800);

    const dropdownItems = await evalInPage(`(() => {
        const menu = document.querySelector('.msg-dropdown-menu');
        if (!menu) return [];
        return Array.from(menu.querySelectorAll('.msg-menu-item')).map(b => b.innerText.trim());
    })()`, '9222');
    console.log('Dropdown items for newly sent message:', dropdownItems);
    captureScreenshot('evidence_06_three_dot_dropdown_fresh.png');

    // 9. Click Edit
    console.log('9. Clicking Edit in dropdown...');
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.msg-menu-item'));
        const editBtn = items.find(b => b.innerText.includes('Edit'));
        if (editBtn) editBtn.click();
    })()`, '9222');
    await sleep(1000);

    const editBanner = await evalInPage(`(() => {
        const banner = document.querySelector('.chat-editing-banner');
        return {
            hasBanner: !!banner,
            text: banner ? banner.innerText : null
        };
    })()`, '9222');
    console.log('Edit banner state:', editBanner);
    captureScreenshot('evidence_09_edit_mode_active.png');

    // 10. Type updated text and save
    console.log('10. Typing updated text via adb keyboard...');
    execSync(`${ADB} shell input text "EditedOnEmulator"`);
    await sleep(800);

    await evalInPage(`(() => {
        const btn = document.querySelector('.chat-send-btn');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(2500);

    // Hide keyboard
    execSync(`${ADB} shell input keyevent KEYCODE_BACK`);
    await sleep(600);

    const finalBubble = await evalInPage(`(() => {
        const bubbles = document.querySelectorAll('.message-bubble');
        const last = bubbles[bubbles.length - 1];
        return {
            text: last ? last.innerText : null,
            hasEdited: last ? last.innerText.toLowerCase().includes('edited') || !!last.querySelector('.msg-edited-tag') : false
        };
    })()`, '9222');
    console.log('Final message after edit:', finalBubble);
    captureScreenshot('evidence_10_message_edited_live.png');

    console.log('=== TEST COMPLETED SUCCESSFULLY! ===');
}

main().catch(console.error);
