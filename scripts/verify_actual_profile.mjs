import WebSocket from 'ws';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
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
    console.log('1. Navigating to /profile...');
    await evalCDP(`(() => {
        const items = Array.from(document.querySelectorAll('.bottom-nav-item, a, button'));
        const prof = items.find(el => el.textContent.includes('Profile'));
        if (prof) prof.click();
    })()`);
    await sleep(3500);

    const bodyText = await evalCDP('document.body.innerText');
    console.log('Profile page body text:\n', bodyText.slice(0, 600));

    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_profile_actual.png');

    // Check for add status button
    const btnCheck = await evalCDP(`(() => {
        const btn = document.querySelector('.avatar-add-status-btn') || document.querySelector('[aria-label="Add Status"]');
        return {
            exists: !!btn,
            className: btn ? btn.className : null,
            aria: btn ? btn.getAttribute('aria-label') : null,
            title: btn ? btn.getAttribute('title') : null
        };
    })()`);
    console.log('Add status button in DOM:', btnCheck);

    if (btnCheck.exists) {
        console.log('2. Clicking Add Status button...');
        await evalCDP(`(() => {
            const btn = document.querySelector('.avatar-add-status-btn') || document.querySelector('[aria-label="Add Status"]');
            if (btn) btn.click();
        })()`);
        await sleep(1500);

        captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_status_modal_open.png');

        const modalDOM = await evalCDP(`(() => {
            const overlay = document.querySelector('.status-modal-overlay');
            const card = document.querySelector('.status-modal-card');
            const bottomNav = document.querySelector('.bottom-nav');
            return {
                hasOverlay: !!overlay,
                hasCard: !!card,
                bodyHasModalOpen: document.body.classList.contains('has-modal-open'),
                bottomNavDisplay: bottomNav ? window.getComputedStyle(bottomNav).display : null,
                cardMaxHeight: card ? window.getComputedStyle(card).maxHeight : null
            };
        })()`);
        console.log('Modal DOM Inspection:', modalDOM);
    }
}

run().catch(console.error);
