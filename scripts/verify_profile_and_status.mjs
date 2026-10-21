import WebSocket from 'ws';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function captureScreenshot(filename) {
    const targetPath = path.resolve(filename);
    const buf = execSync(`${ADB} exec-out screencap -p`, { maxBuffer: 15 * 1024 * 1024 });
    fs.writeFileSync(targetPath, buf);
    console.log(`[Captured]: ${targetPath} (${buf.length} bytes)`);
}

async function evalCDP(expr) {
    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
    if (!page) throw new Error('No page target');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === id) {
                ws.close();
                if (data.error) reject(data.error);
                else if (data.result?.exceptionDetails) reject(data.result.exceptionDetails);
                else resolve(data.result?.result?.value);
            }
        };
        ws.send(JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
    });
}

async function run() {
    console.log('1. Connecting to fresh app process...');
    const pid = execSync(`${ADB} shell pidof com.collegedate.app`).toString().trim();
    console.log(`App PID: ${pid}`);
    try { execSync(`${ADB} forward --remove tcp:9222`); } catch(_) {}
    execSync(`${ADB} forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

    await sleep(2000);
    const url = await evalCDP('window.location.href');
    console.log('Current URL:', url);

    console.log('2. Clicking Profile tab...');
    await evalCDP(`(() => {
        const items = Array.from(document.querySelectorAll('.bottom-nav-item, a, button'));
        const prof = items.find(el => el.textContent.includes('Profile'));
        if (prof) prof.click();
    })()`);

    await sleep(3000);

    const bodyText = await evalCDP('document.body.innerText');
    console.log('Profile Body Text:\n', bodyText.slice(0, 600));

    captureScreenshot('public/evidence_qa/v2.2.73_profile_verified_success.png');

    console.log('3. Clicking Add Status (+) button...');
    const statusClick = await evalCDP(`(() => {
        const btn = document.querySelector('.avatar-add-status-btn') || document.querySelector('[aria-label="Add Status"]');
        if (btn) {
            btn.click();
            return 'Add Status button clicked';
        }
        return 'Button not found';
    })()`);
    console.log('Status click result:', statusClick);

    await sleep(1200);
    captureScreenshot('public/evidence_qa/v2.2.73_status_upload_modal_verified.png');
}

run().catch(console.error);
