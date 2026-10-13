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

function adbDev(args) {
    return adb(['-s', 'emulator-5554', ...args]);
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
    adb(['start-server']);
    await sleep(1500);

    const unixOut = adbDev(['shell', 'cat', '/proc/net/unix']);
    const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket');
    const socketName = match[1];

    try { adbDev(['forward', '--remove', 'tcp:9222']); } catch (_) {}
    adbDev(['forward', 'tcp:9222', `localabstract:${socketName}`]);
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
            const t = setTimeout(() => reject(new Error('Timeout ' + method)), 8000);
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

    console.log('Inspecting DOM tree...');
    const domInfo = await send('Runtime.evaluate', {
        expression: `(() => {
            return {
                url: window.location.href,
                hasToastFn: typeof window.__showNotificationToast === 'function',
                hasSheetFn: typeof window.__showNotificationPrePermissionSheet === 'function',
                toastContainer: Boolean(document.querySelector('.toast-container')),
                bodyChildren: Array.from(document.body.children).map(c => c.className || c.tagName),
                rootChildren: Array.from(document.getElementById('root')?.children || []).map(c => c.className || c.tagName)
            };
        })()`,
        returnByValue: true
    });
    console.log('DOM Info:', JSON.stringify(domInfo?.result?.value, null, 2));

    // ── STEP 1: Option 1 - Trigger Toast with long duration ──
    console.log('\nTriggering Option 1 Luxury In-App Toast...');
    const toastRes = await send('Runtime.evaluate', {
        expression: `(() => {
            if (window.__showNotificationToast) {
                window.__showNotificationToast(
                    'Amaka sent you a message',
                    'Hey! Just saw your profile, are you on campus today? 😊',
                    'now',
                    'info',
                    {
                        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                        actorName: 'Amaka',
                        campusTag: 'UNILAG',
                        badgeIcon: '💬',
                        action: {
                            label: 'Reply',
                            onClick: () => {}
                        }
                    }
                );
            }
            return {
                toastEl: Boolean(document.querySelector('.toast')),
                toastNotifEl: Boolean(document.querySelector('.toast-notification')),
                containerRect: document.querySelector('.toast-container')?.getBoundingClientRect()
            };
        })()`,
        returnByValue: true
    });
    console.log('Toast DOM check:', JSON.stringify(toastRes?.result?.value, null, 2));
    await sleep(700);
    snap('evidence_real_luxury_inapp_banner.png');

    // Dismiss toast
    await send('Runtime.evaluate', {
        expression: `(() => {
            const btn = document.querySelector('.toast-close');
            if (btn) btn.click();
        })()`
    });
    await sleep(500);

    // ── STEP 2: Option 2 - Trigger Pre-Permission Bottom Sheet ──
    console.log('\nTriggering Option 2 Pre-Permission Bottom Sheet...');
    const sheetRes = await send('Runtime.evaluate', {
        expression: `(() => {
            if (window.__showNotificationPrePermissionSheet) {
                window.__showNotificationPrePermissionSheet();
            }
            return {
                softPromptOverlay: Boolean(document.querySelector('.soft-prompt-overlay')),
                softPromptCard: Boolean(document.querySelector('.soft-prompt-card')),
                isVisible: document.querySelector('.soft-prompt-overlay')?.classList.contains('visible')
            };
        })()`,
        returnByValue: true
    });
    console.log('Sheet DOM check:', JSON.stringify(sheetRes?.result?.value, null, 2));
    await sleep(800);
    snap('evidence_real_notification_prepermission_sheet.png');

    ws.close();
    console.log('Done!');
}

main().catch(console.error);
