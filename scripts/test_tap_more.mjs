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
    console.log('1. Querying .menu-action-more-btn bounding rect...');
    const rect = await evalInPage(`(() => {
        const btn = document.querySelector('.menu-action-more-btn');
        if (!btn) return null;
        const r = btn.getBoundingClientRect();
        return {
            x: r.x, y: r.y, width: r.width, height: r.height,
            top: r.top, left: r.left,
            dpr: window.devicePixelRatio
        };
    })()`, '9222');

    console.log('More button rect:', rect);

    if (rect) {
        // Calculate Android screen coordinates (multiplying by devicePixelRatio)
        const screenX = Math.round((rect.left + rect.width / 2) * rect.dpr);
        const screenY = Math.round((rect.top + rect.height / 2) * rect.dpr);
        console.log(`Tapping screen at (${screenX}, ${screenY})...`);
        execSync(`${ADB} shell input tap ${screenX} ${screenY}`);
    } else {
        console.log('Dispatching click directly in DOM...');
        await evalInPage(`document.querySelector('.menu-action-more-btn')?.click()`, '9222');
    }

    await sleep(1000);
    captureScreenshot('evidence_06_three_dot_dropdown.png');

    const dropdownState = await evalInPage(`(() => {
        const menu = document.querySelector('.action-menu-dropdown');
        if (!menu) return { open: false };
        return {
            open: true,
            items: Array.from(menu.querySelectorAll('.dropdown-item-btn')).map(b => b.innerText.trim())
        };
    })()`, '9222');
    console.log('Dropdown state:', dropdownState);

    // Click Info
    console.log('2. Clicking Info in dropdown...');
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.dropdown-item-btn'));
        const info = items.find(b => b.innerText.includes('Info'));
        if (info) info.click();
    })()`, '9222');

    await sleep(1000);
    captureScreenshot('evidence_07_info_modal.png');

    const infoState = await evalInPage(`(() => {
        const modal = document.querySelector('.message-info-content');
        if (!modal) return { open: false };
        return {
            open: true,
            title: modal.querySelector('.message-info-header h3')?.innerText,
            rows: Array.from(modal.querySelectorAll('.message-info-row')).map(r => ({
                label: r.querySelector('.info-label')?.innerText,
                value: r.querySelector('.info-value')?.innerText
            }))
        };
    })()`, '9222');
    console.log('Info modal state:', infoState);

    // Close Info modal
    await evalInPage(`(() => {
        const btn = document.querySelector('.message-info-close-btn') || document.querySelector('.message-info-backdrop');
        if (btn) btn.click();
    })()`, '9222');
    await sleep(800);

    // Re-open more menu
    if (rect) {
        const screenX = Math.round((rect.left + rect.width / 2) * rect.dpr);
        const screenY = Math.round((rect.top + rect.height / 2) * rect.dpr);
        execSync(`${ADB} shell input tap ${screenX} ${screenY}`);
    }
    await sleep(800);

    // Click Delete
    console.log('3. Clicking Delete in dropdown...');
    await evalInPage(`(() => {
        const items = Array.from(document.querySelectorAll('.dropdown-item-btn'));
        const del = items.find(b => b.innerText.includes('Delete'));
        if (del) del.click();
    })()`, '9222');

    await sleep(1000);
    captureScreenshot('evidence_08_delete_modal.png');

    const deleteState = await evalInPage(`(() => {
        const modal = document.querySelector('.delete-modal-box');
        if (!modal) return { open: false };
        return {
            open: true,
            title: modal.querySelector('.delete-modal-header h3')?.innerText,
            buttons: Array.from(modal.querySelectorAll('.delete-action-btn')).map(b => b.innerText.trim())
        };
    })()`, '9222');
    console.log('Delete modal state:', deleteState);
}

main().catch(console.error);
