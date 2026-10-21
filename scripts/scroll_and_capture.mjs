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
    console.log('--- Step 1: Scroll down to Analytics & Vibe Badges on Profile ---');
    await evalCDP(`window.scrollBy({ top: 500, behavior: 'instant' });`);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_profile_mid.png');

    console.log('--- Step 2: Scroll down to Profile Cards (Leaderboard, Escrow, etc.) ---');
    await evalCDP(`window.scrollBy({ top: 500, behavior: 'instant' });`);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_profile_bottom.png');

    console.log('--- Step 3: Click Leaderboard card to open Clash of Campuses ---');
    const lbClick = await evalCDP(`(() => {
        const cards = Array.from(document.querySelectorAll('.dashboard-card, a, button'));
        const lb = cards.find(c => c.textContent.includes('Leaderboard'));
        if (lb) {
            lb.click();
            return 'Clicked Leaderboard card';
        }
        return 'Leaderboard not found';
    })()`);
    console.log('Leaderboard click:', lbClick);
    await sleep(2500);

    // Switch to Campuses tab if on Leaderboard
    await evalCDP(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const camp = btns.find(b => b.textContent.includes('Campuses'));
        if (camp) camp.click();
    })()`);
    await sleep(1000);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_clash_of_campuses.png');

    console.log('--- Step 4: Go back to Profile / Dashboard ---');
    await evalCDP(`(() => {
        const items = Array.from(document.querySelectorAll('.bottom-nav-item, a, button'));
        const prof = items.find(el => el.textContent.includes('Profile'));
        if (prof) prof.click();
    })()`);
    await sleep(2000);

    // Scroll back to top
    await evalCDP(`window.scrollTo({ top: 0, behavior: 'instant' });`);
    await sleep(800);

    console.log('--- Step 5: Click Score Streak "View →" button ---');
    const streakClick = await evalCDP(`(() => {
        const streakBtn = Array.from(document.querySelectorAll('button, div, span, a')).find(el => el.textContent.trim() === 'View →' || el.textContent.includes('Score Streak'));
        if (streakBtn) {
            streakBtn.click();
            return 'Clicked Score Streak';
        }
        return 'Not found';
    })()`);
    console.log('Streak click:', streakClick);
    await sleep(1000);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_score_streak_modal.png');

    // Close Streak Modal
    await evalCDP(`(() => {
        const closeBtn = document.querySelector('.score-streak-close-btn') || document.querySelector('.score-streak-action-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Keep Vibing') || b.textContent.includes('Close'));
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(600);

    console.log('--- Step 6: Click Primetime Mystery Match "🎭 Speed Date" button ---');
    const mysteryClick = await evalCDP(`(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Speed Date'));
        if (btn) {
            btn.click();
            return 'Clicked Speed Date';
        }
        return 'Speed Date not found';
    })()`);
    console.log('Mystery click:', mysteryClick);
    await sleep(1200);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_mystery_modal.png');

    // Close Mystery Modal
    await evalCDP(`(() => {
        const closeBtn = document.querySelector('.mystery-close-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Exit') || b.textContent.includes('Close'));
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(600);

    console.log('--- Step 7: Switch to Dark Theme & Capture Dashboard ---');
    await evalCDP(`
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
    `);
    await sleep(600);
    await evalCDP(`window.scrollTo({ top: 0, behavior: 'instant' });`);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_dashboard_dark.png');

    // Dark Daily Quests
    await evalCDP(`
        const qCard = document.querySelector('.campus-quests-card');
        if (qCard) qCard.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_quests_dark.png');
}

run().catch(console.error);
