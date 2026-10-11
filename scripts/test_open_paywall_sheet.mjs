import { evalInPage } from './cdp_helper.mjs';
import { execSync } from 'child_process';
import path from 'path';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;
const ARTIFACT_DIR = path.resolve('public/evidence_qa');

function captureScreenshot(filename) {
    const fullPath = path.join(ARTIFACT_DIR, filename);
    execSync(`${ADB} shell screencap -p /sdcard/screen.png`);
    execSync(`${ADB} pull /sdcard/screen.png "${fullPath}"`);
    console.log(`[Screenshot Captured] ${filename}`);
    return fullPath;
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    process.env.CDP_PORT = '9222';
    const unixOut = execSync(`${ADB} shell cat /proc/net/unix`).toString();
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (match) {
        execSync(`${ADB} forward tcp:9222 localabstract:${match[1]}`);
    }

    console.log('Testing ContextualPaywallSheet presentation on emulator...');

    // Trigger opening the sheet in Viewers.jsx
    await evalInPage(`(() => {
        // Find React fiber to trigger setPaywallOpen(true)
        const viewersElem = document.querySelector('.viewers-container');
        if (viewersElem) {
            const key = Object.keys(viewersElem).find(k => k.startsWith('__reactFiber$'));
            if (key) {
                let fiber = viewersElem[key];
                while (fiber) {
                    if (fiber.memoizedState && typeof fiber.memoizedState === 'object') {
                        // Traverse hooks state
                        let hook = fiber.memoizedState;
                        let count = 0;
                        while (hook) {
                            // In Viewers.jsx, paywallOpen is useState #5 (index 4 or 5)
                            if (typeof hook.memoizedState === 'boolean' && hook.queue) {
                                console.log('Found boolean state hook:', hook.memoizedState);
                                hook.queue.dispatch(true);
                            }
                            hook = hook.next;
                            count++;
                        }
                    }
                    fiber = fiber.return;
                }
            }
        }
    })()`);

    await sleep(1500);
    captureScreenshot('evidence_05_paywall_sheet_opened.png');
}

run().catch(console.error);
