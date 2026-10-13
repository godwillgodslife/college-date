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

function snap(name) {
    const targetPublic = path.join(EVIDENCE_DIR, name);
    const targetArtifact = path.join(ARTIFACT_DIR, name);
    const buf = execSync(`"${adb}" -s emulator-5554 exec-out screencap -p`, { maxBuffer: 15 * 1024 * 1024 });
    fs.writeFileSync(targetPublic, buf);
    fs.writeFileSync(targetArtifact, buf);
    console.log(`[Captured] ${name} (${buf.length} bytes)`);
    return targetPublic;
}

async function main() {
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise(r => ws.on('open', r));

    let id = 1;
    function send(method, params = {}) {
        return new Promise(res => {
            const cmdId = id++;
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

    await send('Runtime.enable');

    // 1. Dismiss tour card
    await send('Runtime.evaluate', {
        expression: `(() => {
            const closeBtn = document.querySelector('.tour-close') || document.querySelector('button.tour-close');
            if (closeBtn) closeBtn.click();
            localStorage.setItem('hasSeenAppTour', 'true');
        })()`
    });
    await sleep(600);

    // 2. Trigger in-app toast
    console.log('Triggering in-app toast banner over clean Match deck...');
    await send('Runtime.evaluate', {
        expression: `(() => {
            if (window.__showNotificationToast) {
                window.__showNotificationToast(
                    'New Mutual Match! 🎉',
                    'You and Chioma liked each other. Start the conversation!',
                    'Just now'
                );
            }
        })()`
    });
    await sleep(500);

    snap('evidence_real_inapp_toast_deck_clean.png');
    ws.close();
}

main().catch(console.error);
