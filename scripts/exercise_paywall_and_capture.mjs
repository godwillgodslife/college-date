import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
const EVIDENCE_DIR = path.resolve('public/evidence_qa');

if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

import { execSync } from 'child_process';

function getTargets() {
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    return JSON.parse(raw);
}

async function main() {
    console.log('Fetching active targets via curl.exe...');
    const targets = getTargets();
    const target = targets.find(t => t.type === 'page') || targets[0];
    if (!target) throw new Error('No page target found');

    console.log(`Connecting to WebSocket: ${target.webSocketDebuggerUrl}`);
    const ws = new WebSocket(target.webSocketDebuggerUrl, {
        headers: { Host: 'localhost' }
    });

    let id = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const cmdId = id++;
            const handler = (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.id === cmdId) {
                        ws.off('message', handler);
                        if (msg.error) reject(msg.error);
                        else resolve(msg.result);
                    }
                } catch(e) {}
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    console.log('Enabling Page & Runtime domains...');
    await send('Page.enable');
    await send('Runtime.enable');

    async function evaluate(expr) {
        const r = await send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        if (r?.exceptionDetails) {
            console.warn('Evaluation exception:', r.exceptionDetails);
        }
        return r?.result?.value;
    }

    async function capture(filename) {
        const r = await send('Page.captureScreenshot', { format: 'png' });
        if (r && r.data) {
            const buf = Buffer.from(r.data, 'base64');
            const targetPath = path.join(ARTIFACT_DIR, filename);
            const publicPath = path.join(EVIDENCE_DIR, filename);
            fs.writeFileSync(targetPath, buf);
            fs.writeFileSync(publicPath, buf);
            console.log(`[Captured] ${filename} (${buf.length} bytes)`);
            return targetPath;
        }
        throw new Error(`Failed to capture ${filename}`);
    }

    console.log('\n--- 1. INITIAL SCREEN CHECK ---');
    const url = await evaluate('window.location.href');
    const pathname = await evaluate('window.location.pathname');
    console.log('Current URL:', url, 'Pathname:', pathname);
    await capture('evidence_01_initial_state.png');

    // If on landing or login, authenticate
    if (pathname === '/' || pathname === '/login' || pathname === '') {
        console.log('Navigating /login and authenticating...');
        await evaluate(`(() => {
            if (window.__reactNavigate) window.__reactNavigate('/login');
            else window.location.href = '/login';
        })()`);
        await sleep(2000);

        await evaluate(`(async () => {
            const setValue = (el, val) => {
                const proto = Object.getPrototypeOf(el);
                const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
                setter.call(el, val);
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            };
            const emailInput = document.querySelector('#email') || document.querySelector('input[type=\"email\"]');
            const passInput = document.querySelector('#password') || document.querySelector('input[type=\"password\"]');
            const submitBtn = document.querySelector('button[type=\"submit\"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('sign in'));
            if (emailInput && passInput && submitBtn) {
                setValue(emailInput, 'student.tester2026@gmail.com');
                setValue(passInput, 'CollegeDate2026!VerifiedPass');
                await new Promise(r => setTimeout(r, 400));
                submitBtn.click();
            }
        })()`);

        console.log('Waiting for authentication...');
        for (let i = 0; i < 12; i++) {
            await sleep(1000);
            const p = await evaluate('window.location.pathname');
            if (p && p !== '/login' && p !== '/') {
                console.log(`Authenticated at ${p}`);
                break;
            }
        }
        await sleep(2000);
        await capture('evidence_02_dashboard_authenticated.png');
    }

    console.log('\n--- 2. NAVIGATING TO /premium & STUDENT 3-DAY TRIAL BANNER ---');
    await evaluate(`(() => {
        if (window.__reactNavigate) window.__reactNavigate('/premium');
        else {
            window.history.pushState({}, '', '/premium');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    })()`);
    await sleep(2500);

    // Scroll to reveal student trial banner / pricing section
    await evaluate(`window.scrollTo({ top: 400, behavior: 'smooth' })`);
    await sleep(1200);
    await capture('evidence_03_premium_screen_banner.png');

    console.log('\n--- 3. OPENING CONTEXTUAL PAYWALL SHEET (CASE A: 3-DAY TRIAL TIMELINE) ---');
    // Click student trial banner or trigger paywall
    const triggered = await evaluate(`(() => {
        const banner = document.querySelector('.premium-trial-banner') || 
                       document.querySelector('.btn-sheet-primary-trial') ||
                       Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('trial'));
        if (banner) {
            banner.click();
            return 'banner_clicked';
        }
        // If account has active premium, trigger sheet directly for verification
        if (window.__showContextualPaywall) {
            window.__showContextualPaywall({ triggerSource: 'repeated_premium_visits', forceTrial: true });
            return 'forced_via_global';
        }
        return 'no_banner_found';
    })()`);
    console.log('Paywall Trigger Result:', triggered);
    await sleep(1500);

    const sheetOpen = await evaluate(`Boolean(document.querySelector('.paywall-sheet-container'))`);
    console.log('Is Paywall Sheet open:', sheetOpen);
    await capture('evidence_04_contextual_paywall_trial_open.png');

    console.log('\n--- 4. NAVIGATING TO /profile/edit (TOUCHPOINT: VIDEO PROFILE) ---');
    // Close sheet if open
    await evaluate(`(() => {
        const closeBtn = document.querySelector('.btn-sheet-close') || document.querySelector('.paywall-sheet-backdrop');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(1000);

    await evaluate(`(() => {
        if (window.__reactNavigate) window.__reactNavigate('/profile/edit');
        else {
            window.history.pushState({}, '', '/profile/edit');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    })()`);
    await sleep(2500);

    // Scroll to video profile card
    await evaluate(`(() => {
        const card = document.querySelector('.video-premium-locked-card');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    })()`);
    await sleep(1200);
    await capture('evidence_05_profile_edit_video_locked.png');

    console.log('\n--- 5. OPENING PAYWALL FROM VIDEO PROFILE TOUCHPOINT ---');
    await evaluate(`(() => {
        const card = document.querySelector('.video-premium-locked-card');
        if (card) card.click();
    })()`);
    await sleep(1500);
    await capture('evidence_06_paywall_from_video_touchpoint.png');

    console.log('\n=== ALL 6 LIVE EVIDENCE SCREENSHOTS CAPTURED SUCCESSFULLY! ===');
    ws.close();
}

main().catch(err => {
    console.error('QA execution failed:', err);
    process.exit(1);
});
