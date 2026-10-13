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
    const unixSockets = adbDevice(['shell', 'cat', '/proc/net/unix']);
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

    // Force system light mode for clear contrast
    try {
        adbDevice(['shell', 'cmd', 'uimode', 'night', 'no']);
    } catch (_) {}

    let currentPath = await evaluate(`window.location.pathname`);
    console.log('Current page pathname:', currentPath);

    if (currentPath === '/' || currentPath === '/login') {
        if (currentPath === '/') {
            console.log('On landing page, navigating to /login...');
            await evaluate(`window.location.href = '/login';`);
            await sleep(2000);
        }

        console.log('Filling login credentials via React prototype setter...');
        const loginRes = await evaluate(`(() => {
            const emailInput = document.querySelector('input[type="email"]');
            const pwInput = document.querySelector('input[type="password"]');
            const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Sign In'));

            if (!emailInput || !pwInput || !submitBtn) return { error: 'Inputs not found' };

            const setVal = (input, val) => {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                setter.call(input, val);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            };

            setVal(emailInput, 'student.tester2026@gmail.com');
            setVal(pwInput, 'CollegeDate2026!VerifiedPass');
            submitBtn.click();
            return { success: true };
        })()`);
        console.log('Login attempt result:', loginRes);

        // Wait for auth & redirect to complete
        await sleep(4000);
        currentPath = await evaluate(`window.location.pathname`);
        console.log('Post-login pathname:', currentPath);
    }

    // Step A: Dashboard
    console.log('--- Step A: Dashboard (2-Column Action Cards) ---');
    await evaluate(`window.location.href = '/dashboard';`);
    await sleep(3500);
    const dashboardMetrics = await evaluate(`(() => {
        const grid = document.querySelector('.features-grid');
        const cards = Array.from(document.querySelectorAll('.feature-card'));
        const gridCols = grid ? window.getComputedStyle(grid).gridTemplateColumns : '';
        const cardH = cards[0] ? Math.round(cards[0].getBoundingClientRect().height) : 0;
        return { count: cards.length, gridCols, cardHeight: cardH };
    })()`);
    console.log('Dashboard feature card metrics:', dashboardMetrics);
    captureScreenshot('public/evidence_qa/compact_cards_dashboard_live.png');

    // Scroll to action cards on Dashboard
    console.log('--- Step A2: Dashboard Scrolled to Features ---');
    await evaluate(`window.scrollBy({ top: 380, behavior: 'smooth' });`);
    await sleep(1500);
    captureScreenshot('public/evidence_qa/compact_cards_dashboard_features_live.png');

    // Step B: Explore Grid (Compact Masonry Cards)
    console.log('--- Step B: Explore Grid (Compact Masonry Cards) ---');
    await evaluate(`window.location.href = '/explore';`);
    await sleep(3500);
    const exploreMetrics = await evaluate(`(() => {
        const grid = document.querySelector('.explore-grid');
        const cards = Array.from(document.querySelectorAll('.explore-card'));
        const autoRows = grid ? window.getComputedStyle(grid).gridAutoRows : '';
        const cardHeights = cards.slice(0, 4).map(c => Math.round(c.getBoundingClientRect().height));
        return { count: cards.length, autoRows, cardHeights };
    })()`);
    console.log('Explore grid metrics:', exploreMetrics);
    captureScreenshot('public/evidence_qa/compact_cards_explore_live.png');

    // Step C: Confessions Feed (Compact Cards)
    console.log('--- Step C: Confessions Feed (Compact Cards) ---');
    await evaluate(`window.location.href = '/confessions';`);
    await sleep(3500);
    await evaluate(`window.scrollBy({ top: 300, behavior: 'smooth' });`);
    await sleep(1500);
    const confessionsMetrics = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.confession-card-premium'));
        const cardHeights = cards.slice(0, 3).map(c => Math.round(c.getBoundingClientRect().height));
        return { count: cards.length, cardHeights };
    })()`);
    console.log('Confessions metrics:', confessionsMetrics);
    captureScreenshot('public/evidence_qa/compact_cards_confessions_live.png');

    // Step D: Referrals Page (Compact Ambassador League & Milestones)
    console.log('--- Step D: Referrals Ambassador League ---');
    await evaluate(`window.location.href = '/referrals';`);
    await sleep(3500);
    const referralsMetrics = await evaluate(`(() => {
        const milestone = document.querySelector('.referral-milestone-card');
        const milestoneH = milestone ? Math.round(milestone.getBoundingClientRect().height) : 0;
        const podium = document.querySelector('.podium-grid');
        return { milestoneHeight: milestoneH, hasPodium: !!podium };
    })()`);
    console.log('Referrals metrics:', referralsMetrics);
    captureScreenshot('public/evidence_qa/compact_cards_referrals_live.png');

    ws.close();
    console.log('✅ All compact card evidence captured successfully!');
}

run().catch(console.error);
