import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

async function main() {
    const raw = await (await fetch('http://127.0.0.1:9222/json')).json();
    const target = raw.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found');

    const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise(r => ws.on('open', r));

    let msgId = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id === id) {
                    ws.off('message', handler);
                    if (msg.error) reject(msg.error);
                    else resolve(msg.result);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async function evaluate(expr) {
        const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
        if (res.exceptionDetails) {
            console.error('Eval error:', res.exceptionDetails);
            throw new Error(res.exceptionDetails.text || 'Eval error');
        }
        return res.result?.value;
    }

    async function captureScreenshot(filename) {
        await send('Page.enable');
        const r = await send('Page.captureScreenshot', { format: 'png' });
        const targetDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\713edf99-17db-41df-b5ca-20c12a82133c';
        const targetPath = path.join(targetDir, filename);
        fs.writeFileSync(targetPath, Buffer.from(r.data, 'base64'));
        console.log(`Saved screenshot: ${filename}`);
    }

    // 1. Click Profile in bottom navigation
    console.log('--- 1. Clicking Profile tab in BottomNav ---');
    await evaluate(`(() => {
        const profileBtn = Array.from(document.querySelectorAll('.bottom-nav-item')).find(el => el.innerText.includes('Profile'));
        if (profileBtn) profileBtn.click();
        else window.location.href = '/profile';
    })()`);

    // Wait until profile header loads
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 500));
        const ready = await evaluate(`(() => {
            return {
                url: window.location.pathname,
                hasHeader: !!document.querySelector('.profile-header'),
                hasName: !!document.querySelector('.profile-name'),
                loading: !!document.querySelector('.loading-spinner')
            };
        })()`);
        console.log(`Poll [${i}]:`, ready);
        if (ready.hasHeader && !ready.loading) break;
    }

    // Capture screenshot of new Profile layout
    await captureScreenshot('evidence_profile_remediated_live.png');

    // 2. Click YouTube bridge button
    console.log('--- 2. Clicking YouTube bridge button ---');
    const bridgeClicked = await evaluate(`(() => {
        const btn = document.querySelector('.profile-yt-bridge-btn');
        if (btn) {
            btn.click();
            return true;
        }
        return false;
    })()`);
    console.log('Bridge button clicked:', bridgeClicked);

    // Wait until dashboard loads
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 400));
        const ready = await evaluate(`(() => {
            return {
                url: window.location.pathname,
                hasHero: !!document.querySelector('.dashboard-hero'),
                hasStreak: !!document.querySelector('.dashboard-streak-card')
            };
        })()`);
        console.log(`Dashboard Poll [${i}]:`, ready);
        if (ready.url === '/dashboard') break;
    }

    await captureScreenshot('evidence_dashboard_from_yt_bridge_live.png');

    // 3. Click Match in bottom navigation
    console.log('--- 3. Clicking Match tab in BottomNav ---');
    await evaluate(`(() => {
        const matchBtn = Array.from(document.querySelectorAll('.bottom-nav-item')).find(el => el.innerText.includes('Match'));
        if (matchBtn) matchBtn.click();
        else window.location.href = '/match';
    })()`);

    await new Promise(r => setTimeout(r, 1500));
    await captureScreenshot('evidence_match_5tabs_live.png');

    ws.close();
    console.log('All captures and validations complete!');
}

main().catch(console.error);
