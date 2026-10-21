import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ADB = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function adbScreencap(filename) {
    const outPath = path.resolve('public/evidence_qa', filename);
    const buf = execSync(`"${ADB}" -s emulator-5554 exec-out screencap -p`, {
        maxBuffer: 20 * 1024 * 1024
    });
    fs.writeFileSync(outPath, buf);
    console.log(`[CAPTURED PROOF] ${filename} (${buf.length} bytes)`);
    return outPath;
}

async function main() {
    console.log('=== Capturing Tinder Match & Discovery Visual Proofs from Live Emulator ===');
    const pid = execSync(`"${ADB}" -s emulator-5554 shell "pidof com.collegedate.app"`).toString().trim();
    execSync(`"${ADB}" -s emulator-5554 forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

    const res = await fetch('http://127.0.0.1:9222/json');
    const tabs = await res.json();
    const tab = tabs.find(t => t.type === 'page' && t.title) || tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    let msgId = 1000;
    const evaluate = (expr) => new Promise((resolve) => {
        const id = ++msgId;
        const handler = (evt) => {
            try {
                const raw = typeof evt.data === 'string' ? evt.data : evt.toString();
                const data = JSON.parse(raw);
                if (data.id === id) {
                    ws.removeListener('message', handler);
                    resolve(data.result?.result?.value);
                }
            } catch (_) {}
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
    });

    // 1. Navigate to /match
    console.log('Navigating to /match...');
    await evaluate(`window.__reactNavigate('/match');`);
    await sleep(2000);

    // 2. Set Dark Mode
    console.log('1. Setting Dark Theme on Discovery Deck...');
    await evaluate(`
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
    `);
    await sleep(1000);
    adbScreencap('proof_01_tinder_discovery_deck_dark.png');

    // 3. Open Discovery Preferences Modal
    console.log('2. Opening Discovery Preferences Modal (Dark)...');
    await evaluate(`
        const btn = document.querySelector('.discover-prefs-btn');
        if (btn) btn.click();
    `);
    await sleep(1500);
    adbScreencap('proof_02_tinder_discovery_preferences_dark.png');

    // 4. Switch to Light Mode in Discovery Preferences
    console.log('3. Capturing Discovery Preferences in Light Mode...');
    await evaluate(`
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('theme-dark');
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('light-theme');
    `);
    await sleep(1200);
    adbScreencap('proof_03_tinder_discovery_preferences_light.png');

    // 5. Close Discovery Preferences and reset to Dark Mode
    console.log('4. Closing Discovery Preferences and resetting to Dark...');
    await evaluate(`
        const closeBtn = document.querySelector('.discovery-pref-close') || document.querySelector('.discovery-pref-overlay');
        if (closeBtn) closeBtn.click();
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
    `);
    await sleep(1200);

    // 6. Expand Top Card into Tinder Modular Profile Detail View
    console.log('5. Expanding Top Card into Modular Profile View...');
    await evaluate(`
        const card = document.querySelector('.swipe-card.top-card');
        if (card) {
            card.click();
        }
    `);
    await sleep(1500);
    adbScreencap('proof_04_tinder_modular_profile_dark.png');

    // 7. Scroll down inside the modular profile sheet
    console.log('6. Scrolling modular profile sheet down...');
    await evaluate(`
        const scroll = document.querySelector('.modular-profile-scroll');
        if (scroll) {
            scroll.scrollTop = 380;
        }
    `);
    await sleep(1200);
    adbScreencap('proof_05_tinder_modular_profile_scroll_dark.png');

    // 8. Open Contextual Prompt Reply Modal
    console.log('7. Opening Contextual [ ✈ Reply ] Icebreaker Modal...');
    await evaluate(`
        const replyBtn = document.querySelector('.modular-card-reply-btn') || document.querySelector('.modular-photo-reply-btn');
        if (replyBtn) replyBtn.click();
    `);
    await sleep(1500);
    adbScreencap('proof_06_tinder_prompt_reply_modal_dark.png');

    // 9. Switch Prompt Reply Modal to Light Theme
    console.log('8. Capturing Prompt Reply Modal in Light Mode...');
    await evaluate(`
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.remove('theme-dark');
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('light-theme');
    `);
    await sleep(1200);
    adbScreencap('proof_07_tinder_prompt_reply_modal_light.png');

    // 10. Close Prompt Reply Modal and reset
    await evaluate(`
        const closeBtn = document.querySelector('.prompt-reply-close') || document.querySelector('.prompt-reply-overlay');
        if (closeBtn) closeBtn.click();
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('theme-dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
    `);
    await sleep(1000);

    ws.close();
    console.log('=== All Live Proof Screenshots Successfully Captured! ===');
}

main().catch(console.error);
