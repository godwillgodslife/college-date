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
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9223/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found');

    console.log('Connecting to WebSocket: ' + page.webSocketDebuggerUrl);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
    });

    let id = 1;
    function send(method, params = {}) {
        return new Promise(res => {
            const cmdId = id++;
            const h = (evt) => {
                const msg = JSON.parse(evt.data);
                if (msg.id === cmdId) {
                    ws.removeEventListener('message', h);
                    res(msg.result);
                }
            };
            ws.addEventListener('message', h);
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    await send('Runtime.enable');

    // Dismiss tour modal if open
    await send('Runtime.evaluate', {
        expression: `(() => {
            const closeBtn = document.querySelector('.tour-close') || document.querySelector('button.tour-close');
            if (closeBtn) closeBtn.click();
            localStorage.setItem('hasSeenAppTour', 'true');
        })()`
    });
    await sleep(400);

    // ── OPTION 1: Luxury In-App Notification Toast Banner ──
    console.log('Exercising Option 1: Luxury In-App Notification Toast Banner...');
    const toastRes = await send('Runtime.evaluate', {
        expression: `(() => {
            if (typeof window.__showNotificationToast === 'function') {
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
                return 'SUCCESS_TOAST';
            }
            return 'MISSING_TOAST_FUNCTION';
        })()`,
        returnByValue: true
    });
    console.log('Toast trigger status:', toastRes);
    await sleep(900);

    snap('evidence_real_luxury_inapp_banner.png');

    // Dismiss toast
    await send('Runtime.evaluate', {
        expression: `(() => {
            const closeBtn = document.querySelector('.toast-close');
            if (closeBtn) closeBtn.click();
        })()`
    });
    await sleep(600);

    // ── OPTION 2: High-Converting Notification Pre-Permission Bottom Sheet ──
    console.log('Exercising Option 2: Pre-Permission Bottom Sheet...');
    const sheetRes = await send('Runtime.evaluate', {
        expression: `(() => {
            if (typeof window.__showNotificationPrePermissionSheet === 'function') {
                window.__showNotificationPrePermissionSheet();
                return 'SUCCESS_SHEET';
            }
            return 'MISSING_SHEET_FUNCTION';
        })()`,
        returnByValue: true
    });
    console.log('Sheet trigger status:', sheetRes);
    await sleep(1000);

    snap('evidence_real_notification_prepermission_sheet.png');

    // Dismiss bottom sheet cleanly
    await send('Runtime.evaluate', {
        expression: `(() => {
            if (typeof window.__hideNotificationPrePermissionSheet === 'function') {
                window.__hideNotificationPrePermissionSheet();
            }
        })()`
    });
    await sleep(400);

    ws.close();
    console.log('Completed capturing genuine Option 1 and Option 2 evidence!');
}

main().catch(err => {
    console.error('Run error:', err);
    process.exit(1);
});
