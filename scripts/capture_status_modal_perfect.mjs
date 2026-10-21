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

async function main() {
    console.log('1. Navigating to /profile...');
    await evalCDP(`(() => {
        const link = document.querySelector('a[href="/profile"]');
        if (link) link.click();
        else {
            window.history.pushState({}, '', '/profile');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    })()`);
    await sleep(2000);

    console.log('2. Scrolling to top...');
    await evalCDP(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await sleep(1000);

    console.log('3. Checking and clicking .avatar-add-status-btn...');
    const btnInfo = await evalCDP(`(() => {
        const btn = document.querySelector('.avatar-add-status-btn');
        if (!btn) return { found: false };
        const rect = btn.getBoundingClientRect();
        btn.click();
        return { found: true, rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height } };
    })()`);
    console.log('Button info & clicked:', btnInfo);
    await sleep(1500);

    console.log('4. Checking if modal opened...');
    const modalInfo = await evalCDP(`(() => {
        const overlay = document.querySelector('.status-modal-overlay');
        const card = document.querySelector('.status-modal-card');
        const bottomNav = document.querySelector('.bottom-nav');
        if (!overlay || !card) return { found: false };
        const cardRect = card.getBoundingClientRect();
        return {
            found: true,
            cardTitle: card.querySelector('.status-modal-title')?.textContent,
            cardDaily: card.querySelector('.status-daily-pill')?.textContent,
            cardRect: { top: cardRect.top, left: cardRect.left, width: cardRect.width, height: cardRect.height },
            bodyHasModalOpen: document.body.classList.contains('has-modal-open'),
            bottomNavDisplay: bottomNav ? window.getComputedStyle(bottomNav).display : null
        };
    })()`);
    console.log('Modal Info:', JSON.stringify(modalInfo, null, 2));

    console.log('5. Capturing screenshot...');
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_status_modal_open.png');
}

main().catch(console.error);
