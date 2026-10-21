import WebSocket from 'ws';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const ADB = `"${adbPath}" -s emulator-5554`;

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function screencap(filename) {
    const outPath = path.resolve('public/evidence_qa', filename);
    const buf = execSync(`${ADB} exec-out screencap -p`, { maxBuffer: 20 * 1024 * 1024 });
    fs.writeFileSync(outPath, buf);
    console.log(`[Captured]: public/evidence_qa/${filename} (${buf.length} bytes)`);
    return outPath;
}

async function getCDPClient() {
    const pid = execSync(`${ADB} shell pidof com.collegedate.app`).toString().trim();
    if (!pid) throw new Error('com.collegedate.app not running');

    try { execSync(`${ADB} forward --remove tcp:9222`); } catch(_) {}
    execSync(`${ADB} forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages.find(p => p.type === 'page') || pages[0];
    if (!page) throw new Error('No page target found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    let msgId = 50000;
    function evaluate(expr) {
        return new Promise((resolve, reject) => {
            const id = ++msgId;
            const handler = (data) => {
                const parsed = JSON.parse(data.toString());
                if (parsed.id === id) {
                    ws.removeListener('message', handler);
                    if (parsed.error) reject(parsed.error);
                    else if (parsed.result?.exceptionDetails) reject(parsed.result.exceptionDetails);
                    else resolve(parsed.result?.result?.value);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: {
                    expression: expr,
                    returnByValue: true,
                    awaitPromise: true
                }
            }));
        });
    }

    async function setTheme(mode) {
        await evaluate(`
            (() => {
                const isDark = ${mode === 'dark'};
                try {
                    localStorage.setItem('tcd_theme_preference', isDark ? 'dark' : 'light');
                    localStorage.setItem('theme', isDark ? 'dark' : 'light');
                } catch (_) {}
                document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                if (isDark) {
                    document.documentElement.classList.add('theme-dark');
                    document.documentElement.classList.remove('theme-light');
                    document.body.classList.remove('light-theme');
                } else {
                    document.documentElement.classList.add('theme-light');
                    document.documentElement.classList.remove('theme-dark');
                    document.body.classList.add('light-theme');
                }
                window.dispatchEvent(new Event('storage'));
            })()
        `);
        await sleep(500);
    }

    async function click(selector) {
        return await evaluate(`
            (() => {
                const el = document.querySelector('${selector}');
                if (el) {
                    el.click();
                    return true;
                }
                return false;
            })()
        `);
    }

    async function navigateViaNav(tabName) {
        return await evaluate(`
            (() => {
                const items = Array.from(document.querySelectorAll('.bottom-nav-item, .bottom-nav a, .nav-item'));
                const target = items.find(el => el.innerText.toLowerCase().includes('${tabName.toLowerCase()}'));
                if (target) {
                    target.click();
                    return true;
                }
                return false;
            })()
        `);
    }

    async function scrollTo(selector) {
        return await evaluate(`
            (() => {
                const el = document.querySelector('${selector}');
                if (el) {
                    el.scrollIntoView({ behavior: 'instant', block: 'center' });
                    return true;
                }
                return false;
            })()
        `);
    }

    return { ws, evaluate, setTheme, click, navigateViaNav, scrollTo };
}

async function run() {
    console.log('Connecting to Android WebView DevTools on emulator...');
    const client = await getCDPClient();

    // ── 1. MATCH SCREEN ──
    console.log('\n--- 1. MATCH SCREEN ---');
    await client.setTheme('dark');
    await sleep(600);
    screencap('v2.2.74_android_dark_01_match.png');

    await client.setTheme('light');
    await sleep(600);
    screencap('v2.2.74_android_light_01_match.png');

    // ── 2. DASHBOARD ──
    console.log('\n--- 2. DASHBOARD ---');
    // Navigate to dashboard via Profile -> Command Center or direct pushState
    await client.evaluate(`
        (() => {
            window.history.pushState({}, '', '/dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);
    await sleep(2000);

    // If pushState didn't load dashboard, click Profile then Command center
    const onDash = await client.evaluate(`!!document.querySelector('.dashboard-hero')`);
    if (!onDash) {
        await client.navigateViaNav('profile');
        await sleep(1500);
        await client.click('.profile-yt-bridge-btn');
        await sleep(1500);
    }

    await client.setTheme('dark');
    await client.evaluate('window.scrollTo(0, 0)');
    await sleep(600);
    screencap('v2.2.74_android_dark_02_dashboard_top.png');

    await client.scrollTo('.campus-quests-card');
    await sleep(600);
    screencap('v2.2.74_android_dark_03_dashboard_quests.png');

    await client.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await sleep(600);
    screencap('v2.2.74_android_dark_04_dashboard_bottom.png');

    await client.setTheme('light');
    await client.evaluate('window.scrollTo(0, 0)');
    await sleep(600);
    screencap('v2.2.74_android_light_02_dashboard_top.png');

    await client.scrollTo('.campus-quests-card');
    await sleep(600);
    screencap('v2.2.74_android_light_03_dashboard_quests.png');

    await client.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await sleep(600);
    screencap('v2.2.74_android_light_04_dashboard_bottom.png');

    // ── 3. SCORE STREAK MODAL ──
    console.log('\n--- 3. SCORE STREAK MODAL ---');
    await client.evaluate('window.scrollTo(0, 0)');
    await sleep(500);
    await client.click('.dashboard-streak-card');
    await sleep(1000);
    screencap('v2.2.74_android_light_05_streak_modal.png');

    await client.setTheme('dark');
    await sleep(600);
    screencap('v2.2.74_android_dark_05_streak_modal.png');

    await client.click('.score-streak-close-btn');
    await sleep(600);

    // ── 4. PRIMETIME MYSTERY MATCH MODAL ──
    console.log('\n--- 4. PRIMETIME MYSTERY MATCH MODAL ---');
    await client.click('.primetime-mystery-btn');
    await sleep(1000);
    screencap('v2.2.74_android_dark_06_mystery_modal.png');

    await client.setTheme('light');
    await sleep(600);
    screencap('v2.2.74_android_light_06_mystery_modal.png');

    await client.click('.mystery-close-btn');
    await sleep(600);

    // ── 5. CONFESSIONS ──
    console.log('\n--- 5. CONFESSIONS ---');
    await client.navigateViaNav('confessions');
    await sleep(2000);
    await client.setTheme('light');
    await sleep(600);
    screencap('v2.2.74_android_light_07_confessions.png');

    await client.setTheme('dark');
    await sleep(600);
    screencap('v2.2.74_android_dark_07_confessions.png');

    // ── 6. LEADERBOARD (CLASH OF CAMPUSES) ──
    console.log('\n--- 6. LEADERBOARD ---');
    await client.evaluate(`
        (() => {
            window.history.pushState({}, '', '/leaderboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);
    await sleep(2000);

    await client.setTheme('dark');
    await sleep(600);
    screencap('v2.2.74_android_dark_08_leaderboard.png');

    // Click Campuses tab
    await client.evaluate(`
        (() => {
            const btns = Array.from(document.querySelectorAll('button, .segment-btn, .tab-button'));
            const b = btns.find(btn => btn.innerText.includes('Campuses'));
            if (b) b.click();
        })()
    `);
    await sleep(800);
    screencap('v2.2.74_android_dark_09_leaderboard_campuses.png');

    await client.setTheme('light');
    await sleep(600);
    screencap('v2.2.74_android_light_09_leaderboard_campuses.png');

    // ── 7. PROFILE ──
    console.log('\n--- 7. PROFILE ---');
    await client.navigateViaNav('profile');
    await sleep(2000);

    await client.setTheme('light');
    await client.evaluate('window.scrollTo(0, 0)');
    await sleep(600);
    screencap('v2.2.74_android_light_10_profile_top.png');

    await client.setTheme('dark');
    await sleep(600);
    screencap('v2.2.74_android_dark_10_profile_top.png');

    await client.evaluate('window.scrollTo(0, 350)');
    await sleep(600);
    screencap('v2.2.74_android_dark_11_profile_cards.png');

    client.ws.close();
    console.log('\nALL 20 REAL ANDROID EMULATOR SCREENSHOTS SUCCESSFULLY CAPTURED!');
}

run().catch(console.error);
