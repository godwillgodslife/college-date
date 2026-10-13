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
    console.log(`[Captured Real Screen] ${name} (${buf.length} bytes)`);
    return targetPublic;
}

async function main() {
    console.log('Finding active webview socket on emulator-5554...');
    const unixSockets = execSync(`"${adb}" -s emulator-5554 shell "cat /proc/net/unix"`, { encoding: 'utf8' });
    const match = unixSockets.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket found');
    const socketName = match[1];
    console.log(`Socket: ${socketName}`);

    try { execSync(`"${adb}" -s emulator-5554 forward --remove tcp:9222`); } catch (_) {}
    execSync(`"${adb}" -s emulator-5554 forward tcp:9222 localabstract:${socketName}`);
    console.log(`Forwarded tcp:9222 to ${socketName}`);

    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found');

    console.log('Connecting to WebSocket ' + page.webSocketDebuggerUrl);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
    });
    console.log('Connected to CDP successfully!');

    let nextId = 1;
    function send(method, params = {}) {
        return new Promise((resolve) => {
            const id = nextId++;
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    resolve(data.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await send('Runtime.enable');
    await send('Page.enable');

    console.log('Reloading page to ensure freshly bundled scripts are live...');
    await send('Page.reload', { ignoreCache: true });
    await sleep(2800);

    // Dismiss tour if present
    await send('Runtime.evaluate', {
        expression: `(() => {
            const closeBtn = document.querySelector('.tour-close') || document.querySelector('button.tour-close');
            if (closeBtn) closeBtn.click();
            localStorage.setItem('hasSeenAppTour', 'true');
        })()`
    });
    await sleep(500);

    // ── OPTION 1: Luxury In-App Notification Banner ──
    console.log('Triggering Option 1: Luxury in-app notification banner...');
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
                            onClick: () => console.log('Clicked Reply')
                        }
                    }
                );
                return 'TOAST_TRIGGERED';
            }
            return 'TOAST_FUNCTION_MISSING';
        })()`,
        returnByValue: true
    });
    console.log('Toast trigger result:', toastRes);
    await sleep(900);

    snap('evidence_real_luxury_inapp_banner.png');
    console.log('Option 1 screenshot captured.');

    // Dismiss toast
    await send('Runtime.evaluate', {
        expression: `(() => {
            const closeBtn = document.querySelector('.toast-close');
            if (closeBtn) closeBtn.click();
        })()`
    });
    await sleep(600);

    // ── OPTION 2: High-Converting Notification Pre-Permission Bottom Sheet ──
    console.log('Triggering Option 2: Pre-permission bottom sheet...');
    const sheetRes = await send('Runtime.evaluate', {
        expression: `(() => {
            if (window.__showNotificationPrePermissionSheet) {
                window.__showNotificationPrePermissionSheet();
                return 'SHEET_TRIGGERED';
            }
            return 'SHEET_FUNCTION_MISSING';
        })()`,
        returnByValue: true
    });
    console.log('Sheet trigger result:', sheetRes);
    await sleep(1000);

    snap('evidence_real_notification_prepermission_sheet.png');
    console.log('Option 2 screenshot captured.');

    // Dismiss bottom sheet cleanly
    await send('Runtime.evaluate', {
        expression: `(() => {
            if (window.__hideNotificationPrePermissionSheet) {
                window.__hideNotificationPrePermissionSheet();
            }
        })()`
    });
    await sleep(400);

    ws.close();
    console.log('Completed all captures successfully!');
}

main().catch(err => {
    console.error('Main error:', err);
    process.exit(1);
});
