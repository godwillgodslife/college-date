import { execFileSync, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
const EVIDENCE_DIR = path.resolve('public/evidence_qa');
const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function adb(args) {
    return execFileSync(ADB_PATH, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function snap(name) {
    const targetPublic = path.join(EVIDENCE_DIR, name);
    const targetArtifact = path.join(ARTIFACT_DIR, name);
    const buf = execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'exec-out', 'screencap', '-p'], {
        maxBuffer: 15 * 1024 * 1024
    });
    fs.writeFileSync(targetPublic, buf);
    fs.writeFileSync(targetArtifact, buf);
    console.log(`[Captured Real Screen] ${name} (${buf.length} bytes)`);
    return targetPublic;
}

async function main() {
    execFileSync(ADB_PATH, ['start-server']);
    execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'wait-for-device']);
    const unixOut = execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'shell', 'cat', '/proc/net/unix'], { encoding: 'utf8' });
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket');
    const socketName = match[1];

    try { execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'forward', '--remove', 'tcp:9222'], { stdio: 'ignore' }); } catch (_) {}
    execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'forward', 'tcp:9222', `localabstract:${socketName}`]);
    await sleep(500);

    const jsonStr = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 4 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const pages = JSON.parse(jsonStr);
    const page = pages.find(p => p.type === 'page');
    if (!page) throw new Error('No page target');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
    });

    let nextId = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = nextId++;
            const t = setTimeout(() => reject(new Error('Timeout ' + method)), 10000);
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === id) {
                    clearTimeout(t);
                    ws.removeEventListener('message', handler);
                    resolve(data.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await send('Runtime.enable');

    const inspectRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const hasFunc = typeof window.__showNotificationPrePermissionSheet;
            const overlayBefore = document.querySelector('.soft-prompt-overlay');
            if (typeof window.__showNotificationPrePermissionSheet === 'function') {
                window.__showNotificationPrePermissionSheet();
            }
            return {
                hasFunc,
                overlayBefore: !!overlayBefore,
                bodyHtmlSample: document.body.innerHTML.substring(0, 300)
            };
        })()`,
        returnByValue: true
    });
    console.log('Inspect before sleep:', inspectRes?.result?.value);

    await sleep(1500);

    const inspectAfter = await send('Runtime.evaluate', {
        expression: `(() => {
            const overlay = document.querySelector('.soft-prompt-overlay');
            const card = document.querySelector('.soft-prompt-card');
            return {
                overlay: overlay ? {
                    className: overlay.className,
                    display: window.getComputedStyle(overlay).display,
                    opacity: window.getComputedStyle(overlay).opacity,
                    zIndex: window.getComputedStyle(overlay).zIndex,
                    visibility: window.getComputedStyle(overlay).visibility
                } : null,
                card: card ? {
                    className: card.className,
                    transform: window.getComputedStyle(card).transform,
                    rect: card.getBoundingClientRect()
                } : null
            };
        })()`,
        returnByValue: true
    });
    console.log('Inspect after sleep:', inspectAfter?.result?.value);

    snap('evidence_real_notification_prepermission_sheet.png');

    ws.close();
}

main().catch(console.error);
