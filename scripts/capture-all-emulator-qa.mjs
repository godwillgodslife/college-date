import { execSync } from 'child_process';
import WebSocket from 'ws';

const ADB = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function adbScreencap(filename) {
    execSync(`"${ADB}" -s emulator-5554 shell screencap -p /sdcard/${filename}`);
    execSync(`"${ADB}" -s emulator-5554 pull /sdcard/${filename} public/evidence_qa/${filename}`);
    console.log(`[CAPTURED] public/evidence_qa/${filename}`);
}

async function evalInChrome(expression) {
    const res = await fetch('http://localhost:9222/json');
    const tabs = await res.json();
    const tab = tabs.find(t => t.url.includes('gamification-lab')) || tabs[0];
    
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: Date.now(),
                method: 'Runtime.evaluate',
                params: {
                    expression,
                    awaitPromise: true,
                    returnByValue: true
                }
            }));
        });
        ws.on('message', (data) => {
            const parsed = JSON.parse(data.toString());
            ws.close();
            resolve(parsed.result?.result?.value);
        });
        ws.on('error', reject);
    });
}

async function run() {
    console.log('=== College Date Gamification QA: Android Emulator Visual Verification ===');

    // ── DARK THEME SUITE ──
    console.log('\n--- PHASE 1: Obsidian Dark Theme Captures ---');
    
    // Ensure dark theme and scroll to top
    await evalInChrome(`
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_dark_01_quests_overview.png');

    // Scroll to Primetime & Mini-Games
    await evalInChrome(`
        document.querySelector('.campus-primetime-banner')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_dark_02_primetime_banner.png');

    // Scroll to Would You Rather & 2 Truths & a Lie
    await evalInChrome(`
        document.querySelector('.chat-mini-game-card')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_dark_03_minigame_cards.png');

    // Scroll to Vibe Badges
    await evalInChrome(`
        document.querySelector('.campus-vibe-endorsements-section')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_dark_04_vibe_endorsements.png');

    // Scroll to Clash of Campuses & activate Campuses tab
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const campusTab = btns.find(b => b.innerText.includes('Campuses'));
        if (campusTab) {
            campusTab.click();
            campusTab.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    `);
    await sleep(1000);
    // Scroll down 180px so the banner and leaderboard content are nicely visible
    await evalInChrome(`window.scrollBy(0, 220);`);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_dark_05_campus_clash_league.png');

    // Modal 1: Score Streak Perks Modal
    console.log('\n--- Opening Score Streak Modal (Dark) ---');
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const streakBtn = btns.find(b => b.innerText.includes('Score Streak Perks Modal'));
        if (streakBtn) streakBtn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_dark_06_score_streak_modal.png');
    // Close modal
    await evalInChrome(`
        const closeBtn = document.querySelector('.score-streak-close-btn') || document.querySelector('.score-streak-action-btn');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(600);

    // Modal 2: Primetime Mystery Match Speed Date Modal
    console.log('\n--- Opening Primetime Mystery Match Modal (Dark) ---');
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const mysteryBtn = btns.find(b => b.innerText.includes('Speed Date Modal') || b.innerText.includes('Speed Date'));
        if (mysteryBtn) mysteryBtn.click();
    `);
    await sleep(1200);
    adbScreencap('v2.2.72_emulator_dark_07_mystery_match_modal.png');
    // Close modal
    await evalInChrome(`
        document.querySelector('.mystery-close-btn')?.click();
    `);
    await sleep(600);

    // Modal 3: Mini-Game Launcher Modal
    console.log('\n--- Opening Mini-Game Launcher Modal (Dark) ---');
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const gameBtn = btns.find(b => b.innerText.includes('Open Game Launcher Modal'));
        if (gameBtn) gameBtn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_dark_08_minigame_launcher_modal.png');
    // Close modal
    await evalInChrome(`
        document.querySelector('.mini-game-btn-close')?.click();
    `);
    await sleep(600);

    // Modal 4: Endorse Vibe Modal
    console.log('\n--- Opening Endorse Vibe Modal (Dark) ---');
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const endorseBtn = btns.find(b => b.innerText.includes('Endorse Amaka') || b.innerText.includes('+ Endorse'));
        if (endorseBtn) endorseBtn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_dark_09_endorse_vibe_modal.png');
    // Close modal
    await evalInChrome(`
        document.querySelector('.endorse-btn-close')?.click();
    `);
    await sleep(600);

    // Modal 5: Match Celebration & 1-Tap Icebreakers
    console.log('\n--- Opening Match Celebration Icebreakers Modal (Dark) ---');
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const celebBtn = btns.find(b => b.innerText.includes('Match Icebreakers'));
        if (celebBtn) celebBtn.click();
    `);
    await sleep(1200);
    adbScreencap('v2.2.72_emulator_dark_10_match_celebration_icebreakers.png');
    // Close modal
    await evalInChrome(`
        document.querySelector('.match-celebration-close')?.click() || document.querySelector('.btn-match-chat')?.click();
    `);
    await sleep(600);

    // ── LIGHT THEME SUITE ──
    console.log('\n--- PHASE 2: Porcelain Light Theme Captures ---');
    await evalInChrome(`
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const btns = Array.from(document.querySelectorAll('button'));
        const themeBtn = btns.find(b => b.innerText.includes('Switch to Light Theme'));
        if (themeBtn) themeBtn.click();
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('light-theme');
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_light_01_quests_overview.png');

    // Light Theme: Primetime Banner
    await evalInChrome(`
        document.querySelector('.campus-primetime-banner')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_light_02_primetime_banner.png');

    // Light Theme: Mini-Games Cards
    await evalInChrome(`
        document.querySelector('.chat-mini-game-card')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_light_03_minigame_cards.png');

    // Light Theme: Clash of Campuses
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const campusTab = btns.find(b => b.innerText.includes('Campuses'));
        if (campusTab) {
            campusTab.click();
            campusTab.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    `);
    await sleep(1000);
    await evalInChrome(`window.scrollBy(0, 220);`);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_light_04_campus_clash_league.png');

    // Light Theme: Score Streak Modal
    console.log('\n--- Opening Score Streak Modal (Light) ---');
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const streakBtn = btns.find(b => b.innerText.includes('Score Streak Perks Modal'));
        if (streakBtn) streakBtn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_light_05_score_streak_modal.png');
    await evalInChrome(`
        const closeBtn = document.querySelector('.score-streak-close-btn') || document.querySelector('.score-streak-action-btn');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(600);

    // Light Theme: Mystery Match Modal
    console.log('\n--- Opening Mystery Match Modal (Light) ---');
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const mysteryBtn = btns.find(b => b.innerText.includes('Speed Date Modal') || b.innerText.includes('Speed Date'));
        if (mysteryBtn) mysteryBtn.click();
    `);
    await sleep(1200);
    adbScreencap('v2.2.72_emulator_light_06_mystery_match_modal.png');
    await evalInChrome(`
        document.querySelector('.mystery-close-btn')?.click();
    `);
    await sleep(600);

    // Light Theme: Endorse Vibe Modal
    console.log('\n--- Opening Endorse Vibe Modal (Light) ---');
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const endorseBtn = btns.find(b => b.innerText.includes('Endorse Amaka') || b.innerText.includes('+ Endorse'));
        if (endorseBtn) endorseBtn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_light_07_endorse_vibe_modal.png');
    await evalInChrome(`
        document.querySelector('.endorse-btn-close')?.click();
    `);
    await sleep(600);

    console.log('\n🎉 ALL 17 HIGH-FIDELITY EMULATOR PROOFS CAPTURED SUCCESSFULLY!');
}

run().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});
