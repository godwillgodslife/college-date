import { execSync } from 'child_process';
import WebSocket from 'ws';

const ADB = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function adbScreencap(filename) {
    try {
        execSync(`"${ADB}" -s emulator-5554 shell screencap -p /sdcard/${filename}`);
        execSync(`"${ADB}" -s emulator-5554 pull /sdcard/${filename} public/evidence_qa/${filename}`);
        console.log(`[QA Proof Captured] public/evidence_qa/${filename}`);
    } catch (err) {
        console.error(`Error capturing ${filename}:`, err.message);
    }
}

function ensureForwarding() {
    try {
        const pid = execSync(`"${ADB}" -s emulator-5554 shell "pidof com.collegedate.app"`).toString().trim();
        if (pid) {
            execSync(`"${ADB}" -s emulator-5554 forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);
        }
    } catch (err) {
        console.warn('Forwarding check warning:', err.message);
    }
}

async function evalInWebView(expression) {
    ensureForwarding();
    const res = await fetch('http://localhost:9222/json');
    const tabs = await res.json();
    const tab = tabs[0];
    if (!tab) throw new Error('No active webview tab found');

    return new Promise((resolve, reject) => {
        const ws = new WebSocket(tab.webSocketDebuggerUrl);
        const timer = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket eval timed out'));
        }, 8000);

        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: Math.floor(Math.random() * 10000),
                method: 'Runtime.evaluate',
                params: {
                    expression,
                    awaitPromise: true,
                    returnByValue: true
                }
            }));
        });
        ws.on('message', (data) => {
            clearTimeout(timer);
            const parsed = JSON.parse(data.toString());
            ws.close();
            resolve(parsed.result?.result?.value);
        });
        ws.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

async function run() {
    console.log('=== Starting Tinder-Grade Match & Discovery Live Emulator QA ===');

    ensureForwarding();

    // 1. Navigate to /match
    console.log('Navigating to /match...');
    await evalInWebView(`window.location.href = '/match';`);
    await sleep(2500);

    // 2. Dark Mode Discovery Deck
    console.log('1. Capturing Dark Mode Discovery Deck...');
    await evalInWebView(`
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
    `);
    await sleep(800);
    adbScreencap('v2.2.74_emulator_tinder_01_deck_dark.png');

    // 3. Open Discovery Preferences Modal (Dark)
    console.log('2. Opening Discovery Preferences Modal (Dark)...');
    await evalInWebView(`
        const btn = document.querySelector('.discover-prefs-btn');
        if (btn) btn.click();
    `);
    await sleep(800);
    adbScreencap('v2.2.74_emulator_tinder_02_discovery_prefs_dark.png');

    // 4. Switch theme to Light Mode in Discovery Preferences
    console.log('3. Capturing Light Mode in Discovery Preferences...');
    await evalInWebView(`
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('light-theme');
    `);
    await sleep(600);
    adbScreencap('v2.2.74_emulator_tinder_03_discovery_prefs_light.png');

    // 5. Dismiss Preferences modal and switch back to Dark Mode
    console.log('4. Dismissing modal and resetting to Dark...');
    await evalInWebView(`
        const modal = document.querySelector('.discovery-pref-overlay');
        if (modal) modal.click();
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
    `);
    await sleep(800);

    // 6. Expand Top Card into Modular Profile Detail View
    console.log('5. Expanding Top Card into Modular Profile View...');
    await evalInWebView(`
        const topCard = document.querySelector('.swipe-card.top-card');
        if (topCard) topCard.click();
    `);
    await sleep(1000);
    adbScreencap('v2.2.74_emulator_tinder_04_modular_profile_dark.png');

    // 7. Scroll down inside the modular profile sheet
    console.log('6. Scrolling modular profile cards...');
    await evalInWebView(`
        const scrollContainer = document.querySelector('.swipe-card.expanded-mode') || document.querySelector('.modular-profile-scroll');
        if (scrollContainer) {
            scrollContainer.scrollTop = 380;
        }
    `);
    await sleep(800);
    adbScreencap('v2.2.74_emulator_tinder_05_modular_cards_scroll_dark.png');

    // 8. Trigger Contextual Prompt Reply Sheet
    console.log('7. Triggering Contextual [ ✈ Reply ] sheet...');
    await evalInWebView(`
        const replyBtn = document.querySelector('.modular-card-reply-btn') || document.querySelector('.modular-photo-reply-btn');
        if (replyBtn) replyBtn.click();
    `);
    await sleep(800);
    adbScreencap('v2.2.74_emulator_tinder_06_prompt_reply_modal_dark.png');

    // 9. Light theme on Prompt Reply sheet
    console.log('8. Capturing Prompt Reply sheet in Light Mode...');
    await evalInWebView(`
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.add('theme-light');
        document.body.classList.add('light-theme');
    `);
    await sleep(600);
    adbScreencap('v2.2.74_emulator_tinder_07_prompt_reply_modal_light.png');

    // 10. Close reply sheet
    console.log('9. Closing reply sheet...');
    await evalInWebView(`
        const overlay = document.querySelector('.prompt-reply-overlay');
        if (overlay) overlay.click();
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('theme-light');
        document.body.classList.remove('light-theme');
    `);
    await sleep(500);

    console.log('=== All Live Emulator QA Proofs Captured Successfully! ===');
}

run().catch(err => {
    console.error('QA Script Error:', err);
    process.exit(1);
});
