import { execSync } from 'child_process';
import WebSocket from 'ws';

const ADB = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function adbScreencap(filename) {
    execSync(`"${ADB}" -s emulator-5554 shell screencap -p /sdcard/${filename}`);
    execSync(`"${ADB}" -s emulator-5554 pull /sdcard/${filename} public/evidence_qa/${filename}`);
    console.log(`Captured: public/evidence_qa/${filename}`);
}

async function evalInChrome(expression) {
    const res = await fetch('http://localhost:9222/json');
    const tabs = await res.json();
    const tab = tabs.find(t => t.url.includes('gamification-lab')) || tabs[0];
    
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: 1,
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
    console.log('--- Starting Automated Emulator Gamification QA Verification ---');

    // 1. Reset theme to dark and scroll to top
    await evalInChrome(`
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
    `);
    await sleep(600);
    adbScreencap('v2.2.72_emulator_gamification_overview_dark.png');

    // 2. Scroll to Daily Quests & Primetime
    await evalInChrome(`
        const el = document.querySelector('.campus-primetime-banner');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(600);
    adbScreencap('v2.2.72_emulator_primetime_dark.png');

    // 3. Scroll to In-chat Mini-Games
    await evalInChrome(`
        const el = document.querySelector('.chat-mini-game-card');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(600);
    adbScreencap('v2.2.72_emulator_minigames_dark.png');

    // 4. Scroll to Vibe Badges
    await evalInChrome(`
        const el = document.querySelector('.campus-vibe-endorsements-section');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(600);
    adbScreencap('v2.2.72_emulator_vibebadges_dark.png');

    // 5. Scroll to Clash of Campuses and activate Campuses tab
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const campusTab = btns.find(b => b.textContent.includes('Campuses'));
        if (campusTab) {
            campusTab.click();
            campusTab.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_campuses_clash_dark.png');

    // 6. Trigger Score Streak Modal
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const streakBtn = btns.find(b => b.textContent.includes('Score Streak Perks Modal'));
        if (streakBtn) streakBtn.click();
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_streak_modal_dark.png');

    // Close streak modal
    await evalInChrome(`
        const closeBtn = document.querySelector('.score-streak-close-btn') || document.querySelector('.score-streak-action-btn');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(600);

    // 7. Trigger Mystery Match Modal
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const mysteryBtn = btns.find(b => b.textContent.includes('Launch Speed Date Modal') || b.textContent.includes('Speed Date'));
        if (mysteryBtn) mysteryBtn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_mystery_modal_dark.png');

    // Close mystery modal
    await evalInChrome(`
        const closeBtn = document.querySelector('.mystery-close-btn');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(600);

    // 8. Trigger Mini-Game Launcher Modal
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const gameBtn = btns.find(b => b.textContent.includes('Open Game Launcher Modal'));
        if (gameBtn) gameBtn.click();
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_gamelauncher_modal_dark.png');

    // Close game launcher modal
    await evalInChrome(`
        const closeBtn = document.querySelector('.mini-game-btn-close');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(600);

    // 9. Trigger Endorse Vibe Modal
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const endorseBtn = btns.find(b => b.textContent.includes('Endorse Amaka') || b.textContent.includes('+ Endorse'));
        if (endorseBtn) endorseBtn.click();
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_endorse_modal_dark.png');

    // Close endorse modal
    await evalInChrome(`
        const closeBtn = document.querySelector('.endorse-btn-close');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(600);

    // 10. Switch to Light Theme
    console.log('--- Switching to Porcelain Light Theme ---');
    await evalInChrome(`
        window.scrollTo({ top: 0, behavior: 'instant' });
        const btns = Array.from(document.querySelectorAll('button'));
        const themeBtn = btns.find(b => b.textContent.includes('Switch to Light Theme'));
        if (themeBtn) {
            themeBtn.click();
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.classList.add('theme-light');
            document.body.classList.add('light-theme');
        }
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_gamification_overview_light.png');

    // 11. Light Theme: Primetime & Quests
    await evalInChrome(`
        const el = document.querySelector('.campus-primetime-banner');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(600);
    adbScreencap('v2.2.72_emulator_primetime_light.png');

    // 12. Light Theme: Mini-Games
    await evalInChrome(`
        const el = document.querySelector('.chat-mini-game-card');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(600);
    adbScreencap('v2.2.72_emulator_minigames_light.png');

    // 13. Light Theme: Clash of Campuses
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const campusTab = btns.find(b => b.textContent.includes('Campuses'));
        if (campusTab) {
            campusTab.click();
            campusTab.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_campuses_clash_light.png');

    // 14. Light Theme: Mystery Match Modal
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const mysteryBtn = btns.find(b => b.textContent.includes('Launch Speed Date Modal') || b.textContent.includes('Speed Date'));
        if (mysteryBtn) mysteryBtn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_mystery_modal_light.png');

    // Close modal
    await evalInChrome(`
        const closeBtn = document.querySelector('.mystery-close-btn');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(600);

    // 15. Light Theme: Endorse Vibe Modal
    await evalInChrome(`
        const btns = Array.from(document.querySelectorAll('button'));
        const endorseBtn = btns.find(b => b.textContent.includes('Endorse Amaka') || b.textContent.includes('+ Endorse'));
        if (endorseBtn) endorseBtn.click();
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_endorse_modal_light.png');

    // Close modal
    await evalInChrome(`
        const closeBtn = document.querySelector('.endorse-btn-close');
        if (closeBtn) closeBtn.click();
    `);
    await sleep(600);

    console.log('--- ALL EMULATOR QA CAPTURES COMPLETED SUCCESSFULLY ---');
}

run().catch(err => {
    console.error('Error during execution:', err);
    process.exit(1);
});
