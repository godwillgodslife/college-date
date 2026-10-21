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
    console.log('=== Capturing Porcelain Light Theme Verifications ===');

    // Close any open modal
    await evalInChrome(`
        document.querySelector('.endorse-btn-close')?.click();
        document.querySelector('.mystery-close-btn')?.click();
        document.querySelector('.mini-game-btn-close')?.click();
        document.querySelector('.score-streak-close-btn')?.click();
    `);
    await sleep(400);

    // Toggle to Light Theme
    await evalInChrome(`
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('light-theme');
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_light_01_quests_overview_verified.png');

    // Scroll to Primetime & Mini-Games
    await evalInChrome(`
        document.querySelector('.campus-primetime-banner')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_light_02_primetime_verified.png');

    // Scroll to Would You Rather card
    await evalInChrome(`
        document.querySelector('.chat-mini-game-card')?.scrollIntoView({ behavior: 'instant', block: 'center' });
    `);
    await sleep(800);
    adbScreencap('v2.2.72_emulator_light_03_minigames_verified.png');

    // Open Score Streak Modal in Light Theme
    console.log('Opening Streak Modal (Light)...');
    await evalInChrome(`
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Score Streak'));
        if (btn) btn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_light_04_streak_modal_verified.png');

    // Close Streak Modal
    await evalInChrome(`
        const btn = document.querySelector('.score-streak-close-btn') || document.querySelector('.score-streak-action-btn');
        if (btn) btn.click();
    `);
    await sleep(500);

    // Open Mystery Match Modal in Light Theme
    console.log('Opening Mystery Match Modal (Light)...');
    await evalInChrome(`
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Launch Speed Date Modal'));
        if (btn) btn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_light_05_mystery_modal_verified.png');

    // Close Mystery Modal
    await evalInChrome(`
        document.querySelector('.mystery-close-btn')?.click();
    `);
    await sleep(500);

    // Open Endorse Vibe Modal in Light Theme
    console.log('Opening Endorse Vibe Modal (Light)...');
    await evalInChrome(`
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Endorse Amaka') || b.innerText.includes('+ Endorse'));
        if (btn) btn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_light_06_endorse_modal_verified.png');

    // Close Endorse Modal
    await evalInChrome(`
        document.querySelector('.endorse-btn-close')?.click();
    `);
    await sleep(500);

    // Open Mini-Games Launcher Modal in Light Theme
    console.log('Opening Mini-Game Launcher Modal (Light)...');
    await evalInChrome(`
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Open Game Launcher Modal'));
        if (btn) btn.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.72_emulator_light_07_gamelauncher_modal_verified.png');

    // Close modal
    await evalInChrome(`
        document.querySelector('.mini-game-btn-close')?.click();
    `);
    await sleep(500);

    console.log('=== All Light Theme captures completed successfully ===');
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
