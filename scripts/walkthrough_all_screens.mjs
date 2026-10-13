import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

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

async function run() {
    // 1. Restart app cleanly
    console.log('Restarting app...');
    execSync(`"${adbPath}" -s emulator-5554 shell "am force-stop com.collegedate.app"`);
    await sleep(500);
    execSync(`"${adbPath}" -s emulator-5554 shell "monkey -p com.collegedate.app -c android.intent.category.LAUNCHER 1"`);
    await sleep(2500);

    // 2. Discover devtools socket
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
                    resolve(data.result);
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

    // Step A: Navigate to /match
    console.log('--- Step A: Match Deck ---');
    await evaluate(`window.location.hash = ''; window.__navigate ? window.__navigate('/match') : (window.location.href = '/match');`);
    await sleep(2500);
    captureScreenshot('public/evidence_qa/flow_1_match_deck.png');

    // Step B: Navigate to /confessions
    console.log('--- Step B: Confessions Feed ---');
    await evaluate(`window.location.href = '/confessions';`);
    await sleep(2500);
    captureScreenshot('public/evidence_qa/flow_2_confessions_feed.png');

    // Step C: Navigate to /chat
    console.log('--- Step C: Chats List ---');
    await evaluate(`window.location.href = '/chat';`);
    await sleep(2500);
    captureScreenshot('public/evidence_qa/flow_3_chats_screen.png');

    // Step D: Navigate to /profile
    console.log('--- Step D: Profile View ---');
    await evaluate(`window.location.href = '/profile';`);
    await sleep(2500);
    captureScreenshot('public/evidence_qa/flow_4_profile_screen.png');

    ws.close();
    console.log('All screen flows captured successfully!');
}

run().catch(console.error);
