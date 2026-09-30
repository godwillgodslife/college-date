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
    console.log('--- Step A: Click Three-Dot Button on Floating Pill ---');
    const clicked = await evalInPage(`(() => {
        const btn = document.querySelector('.msg-three-dot-btn');
        if (btn) { btn.click(); return true; }
        return false;
    })()`, '9222');
    console.log('Clicked .msg-three-dot-btn:', clicked);
    await sleep(800);

    const menuState = await evalInPage(`(() => {
        const dropdown = document.querySelector('.msg-dropdown-menu');
        if (!dropdown) return { found: false };
        const buttons = Array.from(dropdown.querySelectorAll('.msg-menu-item'));
        return {
            found: true,
            items: buttons.map(b => b.innerText.trim())
        };
    })()`, '9222');
    console.log('Dropdown items:', menuState);
    captureScreenshot('evidence_06_three_dot_dropdown.png');

    console.log('--- Step B: Click Info in Dropdown ---');
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.msg-menu-item'));
        const infoBtn = items.find(b => b.innerText.includes('Info'));
        if (infoBtn) infoBtn.click();
    })()`, '9222');
    await sleep(800);

    const infoState = await evalInPage(`(() => {
        const modal = document.querySelector('.message-info-content');
        if (!modal) return { found: false };
        const rows = Array.from(document.querySelectorAll('.message-info-row')).map(r => ({
            label: r.querySelector('.info-label')?.innerText,
            value: r.querySelector('.info-value')?.innerText
        }));
        return { found: true, rows };
    })()`, '9222');
    console.log('Info modal state:', infoState);
    captureScreenshot('evidence_07_info_modal.png');

    // Close info modal
    await evalInPage(`(() => {
        const closeBtn = document.querySelector('.message-info-close-btn') || document.querySelector('.message-info-backdrop');
        if (closeBtn) closeBtn.click();
    })()`, '9222');
    await sleep(800);

    console.log('--- Step C: Re-open selection and click Delete ---');
    // Long press row again
    await evalInPage(`(() => {
        const rows = document.querySelectorAll('.message-row-wrapper');
        const row = rows[rows.length - 1];
        if (row) {
            const rect = row.getBoundingClientRect();
            row.dispatchEvent(new MouseEvent('mousedown', {
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

    // Click more
    await evalInPage(`(() => {
        const btn = document.querySelector('.msg-three-dot-btn');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(600);

    // Click Delete
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.msg-menu-item'));
        const delBtn = items.find(b => b.innerText.includes('Delete'));
        if (delBtn) delBtn.click();
    })()`, '9222');
    await sleep(800);

    const deleteState = await evalInPage(`(() => {
        const modal = document.querySelector('.delete-modal-box');
        if (!modal) return { found: false };
        return {
            found: true,
            title: modal.querySelector('.delete-modal-header h3')?.innerText,
            buttons: Array.from(modal.querySelectorAll('.delete-action-btn')).map(b => b.innerText.trim())
        };
    })()`, '9222');
    console.log('Delete modal state:', deleteState);
    captureScreenshot('evidence_08_delete_modal.png');

    // Close delete modal
    await evalInPage(`(() => {
        const cancelBtn = document.querySelector('.delete-cancel-btn');
        if (cancelBtn) cancelBtn.click();
    })()`, '9222');
    await sleep(800);

    console.log('--- Step D: Re-open selection and click Edit ---');
    // Long press row again
    await evalInPage(`(() => {
        const rows = document.querySelectorAll('.message-row-wrapper');
        const row = rows[rows.length - 1];
        if (row) {
            const rect = row.getBoundingClientRect();
            row.dispatchEvent(new MouseEvent('mousedown', {
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

    // Click more
    await evalInPage(`(() => {
        const btn = document.querySelector('.msg-three-dot-btn');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(600);

    // Click Edit
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.msg-menu-item'));
        const editBtn = items.find(b => b.innerText.includes('Edit'));
        if (editBtn) editBtn.click();
    })()`, '9222');
    await sleep(800);

    const editBannerState = await evalInPage(`(() => {
        const banner = document.querySelector('.chat-editing-banner');
        const input = document.getElementById('chat-message-input') || document.querySelector('.chat-input');
        return {
            hasEditingBanner: !!banner,
            bannerText: banner?.innerText,
            inputValue: input?.value
        };
    })()`, '9222');
    console.log('Edit banner state:', editBannerState);
    captureScreenshot('evidence_09_edit_mode_active.png');

    console.log('\n=== ALL INTERACTION MODAL STEPS COMPLETED! ===');
}

main().catch(console.error);
