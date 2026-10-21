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
    console.log('1. Close notification tray if open');
    await evalCDP(`(() => {
        const notifBtn = document.querySelector('button[aria-label*="Notifications"][aria-expanded="true"]');
        if (notifBtn) notifBtn.click();
    })()`);
    await sleep(600);

    console.log('2. Click Campuses tab on Leaderboard');
    const tabResult = await evalCDP(`(() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const campTab = tabs.find(b => b.textContent.includes('Campuses'));
        if (campTab) {
            campTab.click();
            return 'Campuses tab clicked';
        }
        return 'Campuses tab not found';
    })()`);
    console.log('Tab click result:', tabResult);
    await sleep(1500);

    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_clash_of_campuses_clean.png');

    // Scroll down to see contenders
    await evalCDP(`window.scrollBy({ top: 400, behavior: 'instant' });`);
    await sleep(600);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_clash_of_campuses_contenders.png');
}

run().catch(console.error);
