import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

function adbExec(cmd) {
    return execSync(`${ADB} ${cmd}`).toString();
}

function captureScreenshot(filename) {
    const targetPath = path.resolve(filename);
    const buf = execSync(`${ADB} exec-out screencap -p`, { maxBuffer: 15 * 1024 * 1024 });
    fs.writeFileSync(targetPath, buf);
    console.log(`[Captured Emulator Screen]: ${targetPath} (${buf.length} bytes)`);
}

async function connectCDP() {
    const unixOut = adbExec('shell cat /proc/net/unix');
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket found on emulator');
    const socketName = match[1];

    try { execSync(`${ADB} forward --remove tcp:9222`); } catch (_) {}
    execSync(`${ADB} forward tcp:9222 localabstract:${socketName}`);

    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
    if (!page) throw new Error('No active webview page target');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => { ws.onopen = res; });

    function evaluate(expr) {
        return new Promise((resolve, reject) => {
            const id = Math.floor(Math.random() * 100000);
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    if (data.error) reject(data.error);
                    else if (data.result?.exceptionDetails) reject(data.result.exceptionDetails);
                    else resolve(data.result?.result?.value ?? data.result?.value);
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

    return { ws, evaluate };
}

async function run() {
    console.log('=== Starting Comprehensive v2.2.73 Emulator QA Verification ===');

    const { ws, evaluate } = await connectCDP();

    // 1. Authenticate user if not already logged in
    console.log('1. Checking Auth State...');
    const authState = await evaluate(`(() => {
        const u = localStorage.getItem('supabase.auth.token') || localStorage.getItem('sb-gedoyoleoscgxgdqszzc-auth-token');
        return !!u;
    })()`);
    console.log('Already authenticated in webview:', authState);

    if (!authState) {
        console.log('Navigating to login page...');
        await evaluate(`window.location.href = '/login';`);
        await sleep(2500);

        console.log('Filling test credentials and signing in...');
        await evaluate(`(() => {
            const emailInput = document.querySelector('input[type="email"]');
            if (emailInput) {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(emailInput, 'student.tester2026@gmail.com');
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const pwInput = document.querySelector('input[type="password"]');
            if (pwInput) {
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(pwInput, 'CollegeDate2026!VerifiedPass');
                pwInput.dispatchEvent(new Event('input', { bubbles: true }));
                pwInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In') || b.innerText.includes('Log In'));
            if (submitBtn) submitBtn.click();
        })()`);
        await sleep(4000);
    }

    // 2. Set theme to obsidian dark
    console.log('2. Setting Obsidian Dark Theme...');
    await evaluate(`
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
    `);

    // 3. Navigate to Dashboard & Verify 360px Mobile Card Ergonomics
    console.log('3. Navigating to Dashboard (360px Mobile Grid Verification)...');
    await evaluate(`window.location.href = '/dashboard';`);
    await sleep(3500);

    // Scroll to top
    await evaluate(`window.scrollTo({ top: 0, behavior: 'instant' });`);
    await sleep(600);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_dark_01_dashboard_hero.png');

    // Scroll to Daily Quests & Primetime Surge Banner
    console.log('3b. Scrolling to Daily Quests & Primetime Banner...');
    await evaluate(`
        const qCard = document.querySelector('.campus-quests-card') || document.querySelector('.campus-primetime-banner');
        if (qCard) qCard.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_dark_02_daily_quests_and_primetime.png');

    // 4. Navigate to Leaderboard / Clash of Campuses
    console.log('4. Navigating to Leaderboard & Clash of Campuses...');
    await evaluate(`window.location.href = '/leaderboard';`);
    await sleep(3000);

    // Switch to Campuses tab
    await evaluate(`
        const btns = Array.from(document.querySelectorAll('button'));
        const campusTab = btns.find(b => b.textContent.includes('Campuses'));
        if (campusTab) campusTab.click();
    `);
    await sleep(1000);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_dark_03_clash_of_campuses.png');

    // 5. Navigate to Profile (Vibe Badges & Status Modal)
    console.log('5. Navigating to Profile Page...');
    await evaluate(`window.location.href = '/profile';`);
    await sleep(3000);

    // Scroll to Vibe Badges cluster
    await evaluate(`
        const vibeSection = document.querySelector('.campus-vibe-endorsements-section') || document.querySelector('.vibe-badges-container');
        if (vibeSection) vibeSection.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_dark_04_profile_vibe_badges.png');

    // Scroll to Profile Status Trigger / Story row
    console.log('5b. Scrolling to Profile Status / Story Trigger...');
    await evaluate(`
        window.scrollTo({ top: 0, behavior: 'instant' });
    `);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_dark_05_profile_status_header.png');

    // 6. Navigate to Gamification Lab to test modals on 360px native screen
    console.log('6. Navigating to Gamification Lab for Modals & Interactive Proofs...');
    await evaluate(`window.location.href = '/gamification-lab';`);
    await sleep(3000);

    // Trigger Score Streak Modal
    console.log('6a. Triggering Score Streak Perks Modal...');
    await evaluate(`
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Score Streak Perks Modal'));
        if (btn) btn.click();
    `);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_dark_06_score_streak_modal.png');

    // Close Streak Modal
    await evaluate(`
        const closeBtn = document.querySelector('.score-streak-close-btn') || document.querySelector('.score-streak-action-btn');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(500);

    // Trigger Primetime Mystery Match Modal
    console.log('6b. Triggering Primetime Mystery Match Speed Date Modal...');
    await evaluate(`
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Speed Date') || b.textContent.includes('Mystery Match'));
        if (btn) btn.click();
    `);
    await sleep(1000);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_dark_07_mystery_match_modal.png');

    // Close Mystery Modal
    await evaluate(`
        const closeBtn = document.querySelector('.mystery-close-btn');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(500);

    // Trigger Peer Vibe Endorsement Modal
    console.log('6c. Triggering Peer Vibe Endorsement Modal...');
    await evaluate(`
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Endorse') || b.textContent.includes('Vibe Modal'));
        if (btn) btn.click();
    `);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_dark_08_endorse_vibe_modal.png');

    // Close Endorse Modal
    await evaluate(`
        const closeBtn = document.querySelector('.endorse-btn-close');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(500);

    // Trigger In-Chat Mini-Game Launcher Modal
    console.log('6d. Triggering Mini-Game Launcher Modal...');
    await evaluate(`
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Open Game Launcher') || b.textContent.includes('Launcher Modal'));
        if (btn) btn.click();
    `);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_dark_09_minigame_launcher_modal.png');

    // Close Game Launcher Modal
    await evaluate(`
        const closeBtn = document.querySelector('.mini-game-btn-close');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(500);

    // 7. Porcelain Light Mode Verification Suite
    console.log('7. Switching to Porcelain Light Theme...');
    await evaluate(`
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('light-theme');
    `);
    await sleep(600);

    // Light Theme Dashboard Hero
    await evaluate(`window.location.href = '/dashboard';`);
    await sleep(3000);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_light_01_dashboard_hero.png');

    // Light Theme Quests & Primetime
    await evaluate(`
        const qCard = document.querySelector('.campus-quests-card') || document.querySelector('.campus-primetime-banner');
        if (qCard) qCard.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_light_02_daily_quests_and_primetime.png');

    // Light Theme Clash of Campuses
    await evaluate(`window.location.href = '/leaderboard';`);
    await sleep(3000);
    await evaluate(`
        const btns = Array.from(document.querySelectorAll('button'));
        const campusTab = btns.find(b => b.textContent.includes('Campuses'));
        if (campusTab) campusTab.click();
    `);
    await sleep(1000);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_light_03_clash_of_campuses.png');

    ws.close();
    console.log('=== ALL EMULATOR QA SCREENSHOTS CAPTURED SUCCESSFULLY ===');
}

run().catch(err => {
    console.error('Fatal QA error:', err);
    process.exit(1);
});
