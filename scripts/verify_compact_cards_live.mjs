import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

function captureScreenshot(filename) {
    const targetPath = path.resolve(filename);
    const buf = execSync(`"${adbPath}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 10 * 1024 * 1024 });
    fs.writeFileSync(targetPath, buf);
    console.log(`Saved screenshot to ${targetPath} (${buf.length} bytes)`);
}

async function getSession(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

async function run() {
    console.log('--- 1. Waking and launching app ---');
    try {
        execSync(`"${adbPath}" -s emulator-5554 shell input keyevent 82`);
    } catch (_) {}
    execSync(`"${adbPath}" -s emulator-5554 shell "am start -n com.collegedate.app/.MainActivity"`);
    await sleep(2000);

    // 2. Discover devtools socket
    console.log('--- 2. Connecting to WebView socket ---');
    const unixSockets = execSync(`"${adbPath}" -s emulator-5554 shell "cat /proc/net/unix | grep webview_devtools_remote"`).toString();
    const match = unixSockets.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket found');
    const socketName = match[1];

    try { execSync(`"${adbPath}" -s emulator-5554 forward --remove tcp:9222`); } catch (_) {}
    execSync(`"${adbPath}" -s emulator-5554 forward tcp:9222 localabstract:${socketName}`);

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
                    resolve(data.result?.value);
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

    // Force system light theme
    try {
        execSync(`"${adbPath}" -s emulator-5554 shell "cmd uimode night no"`);
    } catch (_) {}

    // Authenticate test user
    console.log('--- 3. Authenticating test user ---');
    const authData = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    const sessionObj = authData.session || (authData.access_token ? authData : null);
    if (!sessionObj) throw new Error('Failed to get session');

    await evaluate(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(JSON.stringify(sessionObj))});
        localStorage.setItem("hasSeenAppTour", "true");
        window.location.href = '/dashboard';
    })()`);
    await sleep(3000);

    // Step A: Dashboard (2-Column Action Cards)
    console.log('--- Step A: Dashboard (2-Column Action Cards) ---');
    const dashboardMetrics = await evaluate(`(() => {
        const grid = document.querySelector('.features-grid');
        const cards = Array.from(document.querySelectorAll('.feature-card'));
        const gridCols = grid ? window.getComputedStyle(grid).gridTemplateColumns : '';
        const cardH = cards[0] ? cards[0].getBoundingClientRect().height : 0;
        return { count: cards.length, gridCols, cardHeight: cardH };
    })()`);
    console.log('Dashboard feature card metrics:', dashboardMetrics);
    captureScreenshot('public/evidence_qa/compact_cards_dashboard_live.png');

    // Step B: Explore Grid (Compact Cards)
    console.log('--- Step B: Explore Grid (Compact Masonry) ---');
    await evaluate(`window.location.href = '/explore';`);
    await sleep(3000);
    const exploreMetrics = await evaluate(`(() => {
        const grid = document.querySelector('.explore-grid');
        const cards = Array.from(document.querySelectorAll('.explore-card'));
        const autoRows = grid ? window.getComputedStyle(grid).gridAutoRows : '';
        const firstCardH = cards[0] ? cards[0].getBoundingClientRect().height : 0;
        return { count: cards.length, autoRows, firstCardHeight: firstCardH };
    })()`);
    console.log('Explore card metrics:', exploreMetrics);
    captureScreenshot('public/evidence_qa/compact_cards_explore_live.png');

    // Step C: Confessions Feed (Compact Cards)
    console.log('--- Step C: Confessions Feed ---');
    await evaluate(`window.location.href = '/confessions';`);
    await sleep(3000);
    // Scroll down past hero to show 2-3 confession cards simultaneously
    await evaluate(`window.scrollBy({ top: 320, behavior: 'smooth' });`);
    await sleep(1500);
    const confessionsMetrics = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.confession-card-premium'));
        const firstCardH = cards[0] ? cards[0].getBoundingClientRect().height : 0;
        return { count: cards.length, firstCardHeight: firstCardH };
    })()`);
    console.log('Confessions card metrics:', confessionsMetrics);
    captureScreenshot('public/evidence_qa/compact_cards_confessions_live.png');

    // Step D: Referrals Page (Compact Ambassador League & Milestones)
    console.log('--- Step D: Referrals Ambassador League ---');
    await evaluate(`window.location.href = '/referrals';`);
    await sleep(3000);
    const referralsMetrics = await evaluate(`(() => {
        const milestone = document.querySelector('.referral-milestone-card');
        const milestoneH = milestone ? milestone.getBoundingClientRect().height : 0;
        const podium = document.querySelector('.podium-grid');
        return { milestoneHeight: milestoneH, hasPodium: !!podium };
    })()`);
    console.log('Referrals metrics:', referralsMetrics);
    captureScreenshot('public/evidence_qa/compact_cards_referrals_live.png');

    ws.close();
    console.log('✅ All compact card evidence captured successfully!');
}

run().catch(console.error);
