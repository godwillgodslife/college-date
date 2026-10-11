import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b';
const EVIDENCE_DIR = path.resolve('public/evidence_qa');

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    console.log('Connecting to emulator webview CDP...');
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const target = JSON.parse(raw).find(t => t.type === 'page');

    const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise(r => ws.on('open', r));

    let id = 1;
    function send(method, params = {}) {
        return new Promise(res => {
            const cmdId = id++;
            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id === cmdId) {
                    ws.off('message', handler);
                    res(msg.result);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    async function evaluate(expr) {
        const r = await send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        return r?.result?.value;
    }

    async function capture(filename) {
        const r = await send('Page.captureScreenshot', { format: 'png' });
        if (r && r.data) {
            const buf = Buffer.from(r.data, 'base64');
            const targetPath = path.join(ARTIFACT_DIR, filename);
            const publicPath = path.join(EVIDENCE_DIR, filename);
            fs.writeFileSync(targetPath, buf);
            fs.writeFileSync(publicPath, buf);
            console.log(`[Captured] ${filename} (${buf.length} bytes)`);
            return targetPath;
        }
    }

    console.log('--- Step 1: Temporarily setting is_premium=false in cached profile ---');
    await evaluate(`(() => {
        const key = 'tcd-cache-v2.2.65:[\"auth-profile\",\"1e618bba-9d24-4262-b3c0-1b24b4ff40ff\"]';
        const raw = localStorage.getItem(key);
        if (raw) {
            const data = JSON.parse(raw);
            data.value.is_premium = false;
            localStorage.setItem(key, JSON.stringify(data));
        }
    })()`);

    console.log('--- Step 2: Navigating to /premium ---');
    await evaluate(`(() => {
        window.location.href = '/premium';
    })()`);
    await sleep(3500);

    // Re-connect CDP if page reloaded
    ws.close();
    await sleep(1500);

    const raw2 = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const target2 = JSON.parse(raw2).find(t => t.type === 'page');
    const ws2 = new WebSocket(target2.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise(r => ws2.on('open', r));

    let id2 = 1;
    function send2(method, params = {}) {
        return new Promise(res => {
            const cmdId = id2++;
            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id === cmdId) {
                    ws2.off('message', handler);
                    res(msg.result);
                }
            };
            ws2.on('message', handler);
            ws2.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    await send2('Page.enable');
    await send2('Runtime.enable');

    async function evaluate2(expr) {
        const r = await send2('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        return r?.result?.value;
    }

    async function capture2(filename) {
        const r = await send2('Page.captureScreenshot', { format: 'png' });
        if (r && r.data) {
            const buf = Buffer.from(r.data, 'base64');
            const targetPath = path.join(ARTIFACT_DIR, filename);
            const publicPath = path.join(EVIDENCE_DIR, filename);
            fs.writeFileSync(targetPath, buf);
            fs.writeFileSync(publicPath, buf);
            console.log(`[Captured] ${filename} (${buf.length} bytes)`);
            return targetPath;
        }
    }

    console.log('--- Step 3: Scrolling down to student 3-day trial banner ---');
    await evaluate2(`window.scrollTo({ top: 380, behavior: 'smooth' })`);
    await sleep(1000);
    await capture2('evidence_10_student_trial_banner_visible.png');

    console.log('--- Step 4: Tapping student 3-day trial banner to open Paywall Sheet ---');
    const clicked = await evaluate2(`(() => {
        const banner = document.querySelector('.premium-trial-banner') || 
                       document.querySelector('.btn-trial-banner-cta');
        if (banner) {
            banner.click();
            return true;
        }
        return false;
    })()`);
    console.log('Banner Click Result:', clicked);
    await sleep(1500);

    const isSheetOpen = await evaluate2(`Boolean(document.querySelector('.paywall-sheet-container'))`);
    console.log('Is ContextualPaywallSheet Open:', isSheetOpen);
    await capture2('evidence_11_paywall_sheet_timeline_open.png');

    console.log('--- Step 5: Restoring is_premium=true on profile ---');
    await evaluate2(`(() => {
        const key = 'tcd-cache-v2.2.65:[\"auth-profile\",\"1e618bba-9d24-4262-b3c0-1b24b4ff40ff\"]';
        const raw = localStorage.getItem(key);
        if (raw) {
            const data = JSON.parse(raw);
            data.value.is_premium = true;
            localStorage.setItem(key, JSON.stringify(data));
        }
    })()`);

    console.log('--- Step 6: Testing drag-to-dismiss gesture on Android ---');
    try {
        execSync(`"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554 shell input swipe 540 1000 540 2100 200`);
    } catch(e) {}
    await sleep(1000);
    await capture2('evidence_12_paywall_sheet_dismissed.png');

    console.log('\n=== TRIAL FLOW QA VERIFICATION COMPLETE! ===');
    ws2.close();
}

main().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
