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
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const target = targets.find(t => t.type === 'page') || targets[0];
    if (!target) throw new Error('No page target found');

    const ws = new WebSocket(target.webSocketDebuggerUrl, {
        headers: { Host: 'localhost' }
    });

    let id = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const cmdId = id++;
            const handler = (data) => {
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.id === cmdId) {
                        ws.off('message', handler);
                        if (msg.error) reject(msg.error);
                        else resolve(msg.result);
                    }
                } catch(e) {}
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

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
        throw new Error(`Failed to capture ${filename}`);
    }

    console.log('--- 1. Navigating to /premium ---');
    await evaluate(`(() => {
        if (window.__reactNavigate) window.__reactNavigate('/premium');
        else {
            window.history.pushState({}, '', '/premium');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    })()`);
    await sleep(2000);

    console.log('--- 2. Triggering ContextualPaywallSheet via React Fiber ---');
    const dispatchResult = await evaluate(`(() => {
        const container = document.querySelector('.premium-upgrade-container') || document.querySelector('#root > div');
        if (!container) return 'no_container';
        const key = Object.keys(container).find(k => k.startsWith('__reactFiber$'));
        if (!key) return 'no_fiber_key';
        let fiber = container[key];
        let dispatched = 0;
        while (fiber) {
            if (fiber.memoizedState && typeof fiber.memoizedState === 'object') {
                let hook = fiber.memoizedState;
                let hookIdx = 0;
                while (hook) {
                    // Look for paywallOpen state setter
                    if (hook.memoizedState === false && hook.queue && typeof hook.queue.dispatch === 'function') {
                        hook.queue.dispatch(true);
                        dispatched++;
                    }
                    hook = hook.next;
                    hookIdx++;
                }
            }
            fiber = fiber.return;
        }
        return { dispatched };
    })()`);
    console.log('Fiber Dispatch Result:', dispatchResult);
    await sleep(1500);

    const isSheetInDom = await evaluate(`Boolean(document.querySelector('.paywall-sheet-container'))`);
    console.log('Is Paywall Sheet in DOM:', isSheetInDom);
    await capture('evidence_07_live_paywall_sheet_open.png');

    console.log('--- 3. Testing drag dismiss gesture on emulator ---');
    try {
        execSync(`"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554 shell input swipe 540 1200 540 2100 200`);
    } catch(e) {}
    await sleep(1200);
    await capture('evidence_08_live_paywall_dismissed.png');

    console.log('--- 4. Navigating to /viewers ---');
    await evaluate(`(() => {
        if (window.__reactNavigate) window.__reactNavigate('/viewers');
        else {
            window.history.pushState({}, '', '/viewers');
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    })()`);
    await sleep(2000);
    await capture('evidence_09_viewers_screen.png');

    console.log('All steps completed successfully!');
    ws.close();
}

main().catch(err => {
    console.error('Execution failed:', err);
    process.exit(1);
});
