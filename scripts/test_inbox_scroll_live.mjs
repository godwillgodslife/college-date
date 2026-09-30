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
    console.log('1. Scrolling .chat-sidebar down by 200px...');
    const res = await evalInPage(`(() => {
        const sidebar = document.querySelector('.chat-sidebar');
        if (sidebar) {
            sidebar.scrollTop = 220;
            return {
                scrollTop: sidebar.scrollTop,
                scrollHeight: sidebar.scrollHeight,
                clientHeight: sidebar.clientHeight
            };
        }
        return null;
    })()`, '9222');
    console.log('Scroll metrics:', res);
    await sleep(800);
    captureScreenshot('evidence_inbox_scrolled_live.png');
}

main().catch(console.error);
