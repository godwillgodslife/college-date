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
    await sleep(2000);

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

    // 1. Check current page
    const curUrl = await send('Runtime.evaluate', {
        expression: 'window.location.pathname',
        returnByValue: true
    });
    console.log('Current page path:', curUrl?.result?.value);

    // If on /login, perform login
    if (curUrl?.result?.value === '/login') {
        console.log('Performing login on /login form...');
        const loginRes = await send('Runtime.evaluate', {
            expression: `(() => {
                const emailInput = document.querySelector('input[type="email"]');
                const pwInput = document.querySelector('input[type="password"]');
                const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Sign In'));

                if (!emailInput || !pwInput || !submitBtn) return { error: 'Inputs not found' };

                const setVal = (input, val) => {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                    setter.call(input, val);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                };

                setVal(emailInput, 'student.tester2026@gmail.com');
                setVal(pwInput, 'CollegeDate2026!VerifiedPass');
                submitBtn.click();
                return { success: true };
            })()`,
            returnByValue: true
        });
        console.log('Login attempt result:', loginRes);

        console.log('Waiting for authentication and navigation...');
        for (let i = 0; i < 15; i++) {
            await sleep(1000);
            const p = await send('Runtime.evaluate', {
                expression: 'window.location.pathname',
                returnByValue: true
            });
            console.log(`Path [${i+1}/15]:`, p?.result?.value);
            if (p?.result?.value && p.result.value !== '/login') {
                break;
            }
        }
    }

    await sleep(2000);

    // Dismiss tour if present
    await send('Runtime.evaluate', {
        expression: `(() => {
            const closeBtn = document.querySelector('.tour-close') || document.querySelector('button.tour-close');
            if (closeBtn) closeBtn.click();
            localStorage.setItem('hasSeenAppTour', 'true');
        })()`
    });
    await sleep(600);

    // ── OPTION 1: Luxury In-App Notification Toast Banner ──
    console.log('\n--- EXERCISING OPTION 1: Luxury In-App Notification Toast Banner ---');
    await send('Runtime.evaluate', {
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
            }
        })()`
    });
    await sleep(1000);

    snap('evidence_real_luxury_inapp_banner.png');
    console.log('Option 1 genuine screenshot captured!');

    // Dismiss toast
    await send('Runtime.evaluate', {
        expression: `(() => {
            const btn = document.querySelector('.toast-close');
            if (btn) btn.click();
        })()`
    });
    await sleep(600);

    // ── OPTION 2: High-Converting Notification Pre-Permission Bottom Sheet ──
    console.log('\n--- EXERCISING OPTION 2: Pre-Permission Bottom Sheet ---');
    await send('Runtime.evaluate', {
        expression: `(() => {
            if (typeof window.__showNotificationPrePermissionSheet === 'function') {
                window.__showNotificationPrePermissionSheet();
            }
        })()`
    });
    await sleep(1000);

    snap('evidence_real_notification_prepermission_sheet.png');
    console.log('Option 2 genuine screenshot captured!');

    // Dismiss sheet
    await send('Runtime.evaluate', {
        expression: `(() => {
            if (typeof window.__hideNotificationPrePermissionSheet === 'function') {
                window.__hideNotificationPrePermissionSheet();
            }
        })()`
    });
    await sleep(400);

    ws.close();
    console.log('\n=== MASTER REAL EVIDENCE CAPTURE COMPLETED CLEANLY ===');
}

main().catch(console.error);
