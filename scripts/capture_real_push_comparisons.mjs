import WebSocket from 'ws';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
const EVIDENCE_DIR = path.resolve('public/evidence_qa');
const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function adbExec(args) {
    return execSync(`"${adb}" -s emulator-5554 ${args}`, { encoding: 'utf8', maxBuffer: 15 * 1024 * 1024 });
}

function snap(name) {
    const targetPublic = path.join(EVIDENCE_DIR, name);
    const targetArtifact = path.join(ARTIFACT_DIR, name);
    const buf = execSync(`"${adb}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 15 * 1024 * 1024 });
    fs.writeFileSync(targetPublic, buf);
    fs.writeFileSync(targetArtifact, buf);
    console.log(`[Captured] ${name} (${buf.length} bytes)`);
    return targetPublic;
}

async function getWs() {
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No webview target found');
    const ws = new WebSocket(page.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise(r => ws.on('open', r));
    return ws;
}

function cdpSend(ws, method, params = {}) {
    return new Promise(res => {
        const cmdId = Math.floor(Math.random() * 100000);
        const h = (d) => {
            const msg = JSON.parse(d.toString());
            if (msg.id === cmdId) {
                ws.off('message', h);
                res(msg.result);
            }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: cmdId, method, params }));
    });
}

async function main() {
    console.log('--- Step 1: Triggering Real In-App Notification Toast ---');
    const ws = await getWs();
    await cdpSend(ws, 'Runtime.enable');

    // Trigger in-app toast
    const toastRes = await cdpSend(ws, 'Runtime.evaluate', {
        expression: `(() => {
            if (window.__showNotificationToast) {
                window.__showNotificationToast('New Mutual Match! 🎉', 'You and Chioma liked each other. Start the conversation!', 'Just now', 'info');
                return 'Triggered in-app toast';
            }
            return '__showNotificationToast not found';
        })()`,
        returnByValue: true
    });
    console.log('In-App Toast trigger:', toastRes?.value);
    await sleep(600);
    snap('evidence_real_inapp_toast.png');
    ws.close();

    console.log('--- Step 2: Triggering Real Android System Notification ---');
    // Clear any old ones
    try { adbExec('shell cmd notification cancel tcd_demo'); } catch (_) {}
    
    // Post high-priority system notification using Android cmd notification
    adbExec('shell cmd notification post -t "The College Date • UNILAG" -i @com.collegedate.app:mipmap/ic_launcher tcd_demo "Amaka: Hey! Are you free after lectures today? 😊"');
    await sleep(400);

    // Pull down notification shade
    console.log('--- Step 3: Expanding Notification Shade ---');
    adbExec('shell cmd statusbar expand-notifications');
    await sleep(1000);
    snap('evidence_real_android_notification_shade.png');
    
    // Collapse shade
    adbExec('shell cmd statusbar collapse');
    await sleep(500);

    console.log('--- Step 4: Lock Screen Real Notification ---');
    // Lock screen
    adbExec('shell input keyevent 26'); // Sleep / screen off
    await sleep(1000);
    adbExec('shell input keyevent 224'); // Wake up
    await sleep(1000);
    snap('evidence_real_lockscreen_notification.png');

    // Unlock back
    adbExec('shell wm dismiss-keyguard');
    await sleep(500);

    console.log('All real notification screenshots captured successfully!');
}

main().catch(console.error);
