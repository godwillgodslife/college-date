import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { adb, adbDevice, getActiveDeviceId } from './adb_tool.mjs';

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

function captureScreenshot(filename) {
    const targetPath = path.resolve(filename);
    const buf = adbDevice(['exec-out', 'screencap', '-p'], { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
    fs.writeFileSync(targetPath, buf);
    console.log(`Saved screenshot to ${targetPath} (${buf.length} bytes)`);
}

async function run() {
    const devId = getActiveDeviceId();
    console.log(`--- Using device: ${devId} ---`);

    try {
        adbDevice(['shell', 'input', 'keyevent', '82']);
    } catch (_) {}
    adbDevice(['shell', 'am', 'start', '-n', 'com.collegedate.app/.MainActivity']);
    await sleep(2000);

    // Discover devtools socket
    console.log('--- Connecting to WebView socket ---');
    const unixSockets = adbDevice(['shell', 'cat /proc/net/unix | grep webview_devtools_remote']);
    const match = unixSockets.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket found');
    const socketName = match[1];

    try { adb(['forward', '--remove', 'tcp:9222']); } catch (_) {}
    adb(['forward', 'tcp:9222', `localabstract:${socketName}`]);

    const jsonStr = execSync('curl.exe -s http://127.0.0.1:9222/json').toString();
    const pages = JSON.parse(jsonStr);
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
    if (!page) throw new Error('No active page');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => { ws.onopen = res; });

    function evaluate(expr) {
        return new Promise((resolve) => {
            const id = Math.floor(Math.random() * 100000);
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    resolve(data.result?.result?.value ?? data.result?.value);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: { expression: expr, returnByValue: true, awaitPromise: true }
            }));
        });
    }

    console.log('--- Checking current screen and authenticating ---');
    const currentPath = await evaluate(`window.location.pathname`);
    console.log('Current page pathname:', currentPath);

    if (currentPath === '/login' || currentPath === '/') {
        console.log('Filling login credentials...');
        await evaluate(`(() => {
            const emailInput = document.querySelector('input[type="email"]');
            if (emailInput) {
                emailInput.value = 'student.tester2026@gmail.com';
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const pwInput = document.querySelector('input[type="password"]');
            if (pwInput) {
                pwInput.value = 'CollegeDate2026!VerifiedPass';
                pwInput.dispatchEvent(new Event('input', { bubbles: true }));
                pwInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In'));
            if (submitBtn) submitBtn.click();
        })()`);
        await sleep(3500);
    }

    // Step A: Dashboard
    console.log('--- Step A: Dashboard ---');
    await evaluate(`window.location.href = '/dashboard';`);
    await sleep(3000);
    captureScreenshot('public/evidence_qa/compact_cards_dashboard_live.png');

    // Scroll to feature cards
    console.log('--- Step A2: Dashboard Feature Cards ---');
    await evaluate(`window.scrollBy({ top: 400, behavior: 'smooth' });`);
    await sleep(1500);
    captureScreenshot('public/evidence_qa/compact_cards_dashboard_features_live.png');

    // Step B: Explore Grid (Compact Masonry Cards)
    console.log('--- Step B: Explore Grid ---');
    await evaluate(`window.location.href = '/explore';`);
    await sleep(3500);
    captureScreenshot('public/evidence_qa/compact_cards_explore_live.png');

    // Step C: Confessions Feed (Compact Cards)
    console.log('--- Step C: Confessions Feed ---');
    await evaluate(`window.location.href = '/confessions';`);
    await sleep(3500);
    await evaluate(`window.scrollBy({ top: 320, behavior: 'smooth' });`);
    await sleep(1500);
    captureScreenshot('public/evidence_qa/compact_cards_confessions_live.png');

    // Step D: Referrals Page (Compact Ambassador League & Milestones)
    console.log('--- Step D: Referrals Ambassador League ---');
    await evaluate(`window.location.href = '/referrals';`);
    await sleep(3500);
    captureScreenshot('public/evidence_qa/compact_cards_referrals_live.png');

    ws.close();
    console.log('✅ Real login and screens captured successfully!');
}

run().catch(console.error);
