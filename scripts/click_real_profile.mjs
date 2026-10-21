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
    console.log('1. Clicking exact Profile link (aria-label="Profile")...');
    const click = await evalCDP(`(() => {
        const link = document.querySelector('a[aria-label="Profile"]');
        if (link) {
            link.click();
            return 'Profile link clicked!';
        }
        return 'Link not found';
    })()`);
    console.log('Result:', click);

    await sleep(3500);

    const check = await evalCDP(`(() => {
        return {
            pathname: window.location.pathname,
            bodyTextStart: document.body.innerText.slice(0, 300),
            hasAddStatusBtn: !!document.querySelector('.avatar-add-status-btn'),
            hasVibeBadges: !!document.querySelector('.campus-vibe-endorsements-section')
        };
    })()`);
    console.log('Check on Profile:', check);

    captureScreenshot('public/evidence_qa/v2.2.73_real_profile_header.png');

    console.log('2. Clicking .avatar-add-status-btn...');
    const addClick = await evalCDP(`(() => {
        const btn = document.querySelector('.avatar-add-status-btn');
        if (btn) {
            btn.click();
            return 'Avatar add status clicked!';
        }
        return 'Not found';
    })()`);
    console.log('Add status result:', addClick);

    await sleep(1500);
    captureScreenshot('public/evidence_qa/v2.2.73_status_upload_modal_real.png');

    const modalCheck = await evalCDP(`(() => {
        const overlay = document.querySelector('.status-modal-overlay');
        const card = document.querySelector('.status-modal-card');
        const dropzone = document.querySelector('.status-dropzone');
        const closeBtn = document.querySelector('.status-close-btn');
        const bottomNav = document.querySelector('.bottom-nav');
        return {
            hasOverlay: !!overlay,
            hasCard: !!card,
            hasDropzone: !!dropzone,
            hasCloseBtn: !!closeBtn,
            bottomNavDisplay: bottomNav ? window.getComputedStyle(bottomNav).display : null,
            bodyHasModalOpen: document.body.classList.contains('has-modal-open')
        };
    })()`);
    console.log('Modal DOM Check:', modalCheck);
}

run().catch(console.error);
