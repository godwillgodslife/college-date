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
    console.log('--- EDIT FLOW TEST ---');

    // 1. Close delete modal
    console.log('1. Closing delete modal...');
    await evalInPage(`(() => {
        const cancelBtn = document.querySelector('.btn-msg-delete-cancel');
        if (cancelBtn) cancelBtn.click();
        const backdrop = document.querySelector('.msg-action-backdrop');
        if (backdrop) backdrop.click();
    })()`, '9222');
    await sleep(1000);

    // 2. Select message
    console.log('2. Selecting message...');
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
    await sleep(600);

    // 3. Open three-dot menu
    console.log('3. Opening three-dot menu...');
    await evalInPage(`(() => {
        const btn = document.querySelector('.msg-three-dot-btn');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(800);

    // 4. Click Edit
    console.log('4. Clicking Edit...');
    const clickedEdit = await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.msg-menu-item'));
        const editBtn = items.find(b => b.innerText.includes('Edit'));
        if (editBtn) {
            editBtn.click();
            return true;
        }
        return false;
    })()`, '9222');
    console.log('Clicked edit button:', clickedEdit);
    await sleep(1200);

    captureScreenshot('evidence_09_edit_mode_active.png');

    const editBanner = await evalInPage(`(() => {
        const banner = document.querySelector('.chat-editing-banner');
        const input = document.getElementById('chat-message-input') || document.querySelector('.chat-input');
        return {
            hasBanner: !!banner,
            bannerText: banner ? banner.innerText : null,
            inputValue: input ? input.value : null
        };
    })()`, '9222');
    console.log('Edit banner info:', editBanner);

    // 5. Update message text and save
    console.log('5. Updating text and saving edit...');
    await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input') || document.querySelector('.chat-input');
        if (input) {
            input.value = "Updated message content! ✨ Edited live on Android emulator.";
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    })()`, '9222');
    await sleep(500);

    await evalInPage(`(() => {
        const sendBtn = document.querySelector('.chat-send-btn') || document.querySelector('button[type="submit"]');
        if (sendBtn) sendBtn.click();
    })()`, '9222');
    await sleep(2500);

    captureScreenshot('evidence_10_message_edited_live.png');

    const finalBubble = await evalInPage(`(() => {
        const bubbles = document.querySelectorAll('.message-bubble');
        const last = bubbles[bubbles.length - 1];
        return {
            text: last ? last.innerText : null,
            hasEditedIndicator: last ? last.innerText.toLowerCase().includes('edited') || !!last.querySelector('.msg-edited-tag') : false
        };
    })()`, '9222');
    console.log('Final edited message result:', finalBubble);
}

main().catch(console.error);
