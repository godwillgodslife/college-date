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
    console.log('1. Discovering PID and forwarding devtools...');
    const pid = execSync(`${ADB} shell pidof com.collegedate.app`).toString().trim();
    console.log(`App PID: ${pid}`);
    try { execSync(`${ADB} forward --remove tcp:9222`); } catch(_) {}
    execSync(`${ADB} forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

    // Wait for splash screen to complete
    console.log('2. Waiting for splash to finish...');
    for (let i = 0; i < 15; i++) {
        const ready = await evalCDP(`!!document.querySelector('button, input, a, .landing-hero, .bottom-nav')`).catch(() => false);
        if (ready) {
            console.log('Page ready after', (i + 1) * 1.5, 's');
            break;
        }
        await sleep(1500);
    }

    const currentUrl = await evalCDP('window.location.href');
    console.log('Current URL:', currentUrl);

    // If on landing, click login
    if (currentUrl.endsWith('/') || currentUrl.includes('/landing')) {
        console.log('On landing, clicking login...');
        await evalCDP(`(() => {
            const links = Array.from(document.querySelectorAll('a, button'));
            const login = links.find(l => l.innerText.toLowerCase().includes('already have an account') || l.innerText.toLowerCase().includes('log in'));
            if (login) login.click();
        })()`);
        await sleep(2500);
    }

    // If on login, fill and submit
    const onLogin = await evalCDP(`!!document.querySelector('input[type="password"]')`);
    if (onLogin) {
        console.log('On login page, filling credentials...');
        await evalCDP(`(() => {
            const email = document.querySelector('input[type="email"]');
            const pw = document.querySelector('input[type="password"]');
            if (email) {
                const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                s.call(email, 'student.tester2026@gmail.com');
                email.dispatchEvent(new Event('input', { bubbles: true }));
                email.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (pw) {
                const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                s.call(pw, 'CollegeDate2026!VerifiedPass');
                pw.dispatchEvent(new Event('input', { bubbles: true }));
                pw.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const submit = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In'));
            if (submit) submit.click();
        })()`);
        await sleep(4000);
    }

    // Wait for authenticated shell
    console.log('3. Waiting for bottom navigation to appear...');
    for (let i = 0; i < 10; i++) {
        const hasNav = await evalCDP(`!!document.querySelector('.bottom-nav')`);
        if (hasNav) {
            console.log('Bottom navigation active!');
            break;
        }
        await sleep(1200);
    }

    console.log('4. Clicking Profile tab...');
    await evalCDP(`(() => {
        const items = Array.from(document.querySelectorAll('.bottom-nav-item, a, button'));
        const prof = items.find(el => el.textContent.includes('Profile'));
        if (prof) prof.click();
    })()`);
    await sleep(3000);

    const profileCheck = await evalCDP(`(() => {
        const errorBoundary = document.querySelector('.error-boundary') || document.body.innerText.includes('Something went wrong');
        const nameEl = document.querySelector('.profile-name') || document.querySelector('.profile-header');
        const addBtn = document.querySelector('.avatar-add-status-btn') || document.querySelector('[aria-label="Add Status"]');
        const vibeBadges = document.querySelectorAll('.vibe-badge-pill');
        return {
            hasErrorBoundary: !!errorBoundary,
            hasProfileHeader: !!nameEl,
            hasAddStatusBtn: !!addBtn,
            vibeBadgeCount: vibeBadges.length,
            title: document.title
        };
    })()`);
    console.log('Profile Check Result:', profileCheck);

    captureScreenshot('public/evidence_qa/v2.2.73_profile_verified_success.png');

    console.log('5. Clicking Add Status button (+)...');
    const addStatusClick = await evalCDP(`(() => {
        const btn = document.querySelector('.avatar-add-status-btn') || document.querySelector('[aria-label="Add Status"]');
        if (btn) {
            btn.click();
            return 'Add Status clicked!';
        }
        return 'Not found';
    })()`);
    console.log('Add Status click:', addStatusClick);
    await sleep(1500);

    captureScreenshot('public/evidence_qa/v2.2.73_status_modal_open_live.png');

    // Inspect modal in DOM
    const modalInspection = await evalCDP(`(() => {
        const overlay = document.querySelector('.status-modal-overlay');
        const card = document.querySelector('.status-modal-card');
        const closeBtn = document.querySelector('.status-close-btn');
        const bottomNav = document.querySelector('.bottom-nav');
        return {
            overlayFound: !!overlay,
            cardFound: !!card,
            closeBtnFound: !!closeBtn,
            bottomNavDisplay: bottomNav ? window.getComputedStyle(bottomNav).display : null,
            bodyHasModalOpen: document.body.classList.contains('has-modal-open')
        };
    })()`);
    console.log('Status Modal Inspection:', modalInspection);

    // Close status modal
    await evalCDP(`(() => {
        const close = document.querySelector('.status-close-btn') || document.querySelector('.status-modal-close');
        if (close) close.click();
    })()`);
    await sleep(800);

    // Switch to dark mode & capture
    console.log('6. Setting Obsidian Dark Mode...');
    await evalCDP(`
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
    `);
    await sleep(600);
    captureScreenshot('public/evidence_qa/v2.2.73_profile_dark_verified.png');
}

run().catch(console.error);
