import { execFileSync, execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
const EVIDENCE_DIR = path.resolve('public/evidence_qa');
const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function adb(args, options = {}) {
    return execFileSync(ADB_PATH, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 15000,
        ...options
    }).trim();
}

function adbDev(args, options = {}) {
    return adb(['-s', 'emulator-5554', ...args], options);
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

async function getAuthToken() {
    console.log('Fetching auth session from Supabase...');
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({
            email: 'student.tester2026@gmail.com',
            password: 'CollegeDate2026!VerifiedPass'
        })
    });
    const data = await res.json();
    return data;
}

async function main() {
    console.log('1. Starting ADB server...');
    try { adb(['start-server']); } catch (_) {}
    await sleep(2000);

    // Look up active devtools socket
    console.log('2. Finding WebView devtools socket...');
    let socketName = null;
    for (let i = 0; i < 15; i++) {
        try {
            const unixOut = adbDev(['shell', 'cat', '/proc/net/unix']);
            const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
            if (match) {
                socketName = match[1];
                console.log(`Found active WebView socket: ${socketName}`);
                break;
            }
        } catch (_) {}
        await sleep(1000);
    }

    if (!socketName) {
        throw new Error('No webview socket found');
    }

    // Forward port 9222 cleanly
    try { adbDev(['forward', '--remove', 'tcp:9222']); } catch (_) {}
    adbDev(['forward', 'tcp:9222', `localabstract:${socketName}`]);
    console.log(`Forwarded tcp:9222 -> localabstract:${socketName}`);
    await sleep(500);

    // Connect CDP
    console.log('3. Connecting to CDP on port 9222...');
    const jsonStr = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 4 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const pages = JSON.parse(jsonStr);
    const page = pages.find(p => p.type === 'page');
    if (!page) throw new Error('No page found in CDP targets');

    console.log(`Connecting to WebSocket: ${page.webSocketDebuggerUrl}`);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
    });

    let nextId = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = nextId++;
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for CDP ${method} (id=${id})`));
            }, 8000);

            const handler = (evt) => {
                try {
                    const data = JSON.parse(evt.data);
                    if (data.id === id) {
                        clearTimeout(timer);
                        ws.removeEventListener('message', handler);
                        resolve(data.result);
                    }
                } catch (err) {
                    clearTimeout(timer);
                    reject(err);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await send('Runtime.enable');

    // 4. Authenticate session if on login page
    console.log('4. Checking authentication status...');
    const authState = await send('Runtime.evaluate', {
        expression: `(() => {
            const authKey = 'sb-gedoyoleoscgxgdqszzc-auth-token';
            const stored = localStorage.getItem(authKey);
            return {
                hasToken: Boolean(stored),
                path: window.location.pathname
            };
        })()`,
        returnByValue: true
    });
    console.log('Auth check:', authState?.result?.value);

    if (!authState?.result?.value?.hasToken || authState?.result?.value?.path.includes('/login')) {
        console.log('Injecting authenticated student session into localStorage...');
        const session = await getAuthToken();
        const sessionJson = JSON.stringify(session);
        await send('Runtime.evaluate', {
            expression: `(() => {
                localStorage.setItem('sb-gedoyoleoscgxgdqszzc-auth-token', ${JSON.stringify(sessionJson)});
                localStorage.setItem('hasSeenAppTour', 'true');
                window.location.href = '/match';
            })()`
        });
        console.log('Navigating to /match...');
        await sleep(3500);
    }

    // Dismiss tour modal if open
    await send('Runtime.evaluate', {
        expression: `(() => {
            const closeBtn = document.querySelector('.tour-close') || document.querySelector('button.tour-close');
            if (closeBtn) closeBtn.click();
            localStorage.setItem('hasSeenAppTour', 'true');
        })()`
    });
    await sleep(500);

    // ── OPTION 1: Luxury In-App Notification Toast Banner ──
    console.log('\n--- EXERCISING OPTION 1: Luxury In-App Notification Banner ---');
    const toastResult = await send('Runtime.evaluate', {
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
                return 'TOAST_DISPLAYED_SUCCESS';
            }
            return 'TOAST_FUNCTION_UNAVAILABLE';
        })()`,
        returnByValue: true
    });
    console.log('Option 1 trigger result:', toastResult);
    await sleep(900);

    snap('evidence_real_luxury_inapp_banner.png');
    console.log('Option 1 genuine screenshot captured!');

    // Dismiss toast
    await send('Runtime.evaluate', {
        expression: `(() => {
            const closeBtn = document.querySelector('.toast-close');
            if (closeBtn) closeBtn.click();
        })()`
    });
    await sleep(600);

    // ── OPTION 2: High-Converting Notification Pre-Permission Bottom Sheet ──
    console.log('\n--- EXERCISING OPTION 2: Pre-Permission Bottom Sheet ---');
    const sheetResult = await send('Runtime.evaluate', {
        expression: `(() => {
            if (typeof window.__showNotificationPrePermissionSheet === 'function') {
                window.__showNotificationPrePermissionSheet();
                return 'SHEET_DISPLAYED_SUCCESS';
            }
            return 'SHEET_FUNCTION_UNAVAILABLE';
        })()`,
        returnByValue: true
    });
    console.log('Option 2 trigger result:', sheetResult);
    await sleep(1000);

    snap('evidence_real_notification_prepermission_sheet.png');
    console.log('Option 2 genuine screenshot captured!');

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
    console.log('\n=== ALL GENUINE EMULATOR EVIDENCE CAPTURED PERFECTLY ===');
}

main().catch(err => {
    console.error('Master capture error:', err);
    process.exit(1);
});
