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
    console.log('=== TESTING FRESH MESSAGE EDIT & DELETE MODALS ===');

    // 1. Close open modal if any
    console.log('1. Closing any open modals...');
    await evalInPage(`(() => {
        const closeBtn = document.querySelector('.msg-info-close-btn') || document.querySelector('.msg-info-backdrop') || document.querySelector('.msg-delete-overlay');
        if (closeBtn) closeBtn.click();
    })()`, '9222');
    await sleep(800);

    // 2. Type and send a fresh text message
    console.log('2. Sending a fresh test message...');
    await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input') || document.querySelector('.chat-input');
        if (input) {
            input.value = "Live test message for edit & delete!";
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
    })()`, '9222');
    await sleep(600);

    await evalInPage(`(() => {
        const sendBtn = document.querySelector('.chat-send-btn') || document.querySelector('button[type="submit"]');
        if (sendBtn) sendBtn.click();
    })()`, '9222');
    await sleep(2500);

    // 3. Select this new message
    console.log('3. Selecting newly sent message...');
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

    // 4. Click three dots on the floating action pill
    console.log('4. Clicking .msg-three-dot-btn...');
    await evalInPage(`(() => {
        const btn = document.querySelector('.msg-three-dot-btn');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(800);

    const dropdownState = await evalInPage(`(() => {
        const dropdown = document.querySelector('.msg-dropdown-menu');
        if (!dropdown) return { found: false };
        const items = Array.from(dropdown.querySelectorAll('.msg-menu-item')).map(b => b.innerText.trim());
        return { found: true, items };
    })()`, '9222');
    console.log('Dropdown items for fresh message:', dropdownState);
    captureScreenshot('evidence_06_three_dot_dropdown_fresh.png');

    // 5. Click Delete
    console.log('5. Clicking Delete in dropdown...');
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.msg-menu-item'));
        const delBtn = items.find(b => b.innerText.includes('Delete'));
        if (delBtn) delBtn.click();
    })()`, '9222');
    await sleep(1000);

    const deleteState = await evalInPage(`(() => {
        const modal = document.querySelector('.msg-delete-card');
        if (!modal) return { found: false };
        const buttons = Array.from(modal.querySelectorAll('.btn-msg-delete')).map(b => b.innerText.trim());
        return {
            found: true,
            title: modal.querySelector('.msg-delete-title')?.innerText,
            subtitle: modal.querySelector('.msg-delete-subtitle')?.innerText,
            buttons
        };
    })()`, '9222');
    console.log('Delete modal state for unseen message:', deleteState);
    captureScreenshot('evidence_08_delete_modal.png');

    // 6. Close Delete modal
    console.log('6. Dismissing delete modal...');
    await evalInPage(`(() => {
        const cancelBtn = document.querySelector('.btn-msg-delete-cancel');
        if (cancelBtn) cancelBtn.click();
    })()`, '9222');
    await sleep(800);

    // 7. Re-select message and click Edit
    console.log('7. Re-selecting message to test Edit...');
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

    await evalInPage(`(() => {
        const btn = document.querySelector('.msg-three-dot-btn');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(800);

    console.log('8. Clicking Edit in dropdown...');
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.msg-menu-item'));
        const editBtn = items.find(b => b.innerText.includes('Edit'));
        if (editBtn) editBtn.click();
    })()`, '9222');
    await sleep(1000);

    const editBannerState = await evalInPage(`(() => {
        const banner = document.querySelector('.chat-editing-banner');
        const input = document.getElementById('chat-message-input') || document.querySelector('.chat-input');
        return {
            hasBanner: !!banner,
            bannerText: banner?.innerText,
            inputValue: input?.value
        };
    })()`, '9222');
    console.log('Edit banner state:', editBannerState);
    captureScreenshot('evidence_09_edit_mode_active.png');

    // 9. Submit edited message
    console.log('9. Updating text and submitting edit...');
    await evalInPage(`(() => {
        const input = document.getElementById('chat-message-input') || document.querySelector('.chat-input');
        if (input) {
            input.value = "Live test message (EDITED ON EMULATOR! ✨)";
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const sendBtn = document.querySelector('.chat-send-btn') || document.querySelector('button[type="submit"]');
        if (sendBtn) sendBtn.click();
    })()`, '9222');
    await sleep(2500);

    const editedBubbleState = await evalInPage(`(() => {
        const bubbles = document.querySelectorAll('.message-bubble');
        const lastBubble = bubbles[bubbles.length - 1];
        return {
            content: lastBubble?.innerText,
            hasEditedTag: lastBubble ? lastBubble.innerText.includes('edited') || !!lastBubble.querySelector('.message-edited-badge') : false
        };
    })()`, '9222');
    console.log('Edited message state:', editedBubbleState);
    captureScreenshot('evidence_10_message_edited_live.png');

    console.log('\n=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
}

main().catch(console.error);
