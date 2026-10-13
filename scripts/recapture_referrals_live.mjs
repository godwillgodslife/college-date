import WebSocket from 'ws';
import http from 'http';
import fs from 'fs';
import { adbDevice, adb } from './adb_tool.mjs';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function captureScreenshot(filename) {
    const buf = adbDevice(['exec-out', 'screencap', '-p'], { encoding: 'buffer', maxBuffer: 15 * 1024 * 1024 });
    fs.writeFileSync(filename, buf);
    console.log(`Saved screenshot to ${filename} (${buf.length} bytes)`);
}

async function setupForwarding() {
    const unixSockets = adbDevice(['shell', 'cat', '/proc/net/unix']);
    const match = unixSockets.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket found');
    const socketName = match[1];

    try { adb(['forward', '--remove', 'tcp:9222']); } catch (_) {}
    adb(['forward', 'tcp:9222', `localabstract:${socketName}`]);
    console.log(`Forwarded tcp:9222 to localabstract:${socketName}`);
}

async function getPage() {
    await setupForwarding();
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const list = JSON.parse(data);
                const page = list.find(t => t.type === 'page');
                if (page) resolve(page);
                else reject(new Error('No page target found'));
            });
        }).on('error', reject);
    });
}

async function main() {
    console.log('Connecting to WebView...');
    const page = await getPage();
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    let msgId = 1;
    function evalCode(expr) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (d) => {
                const msg = JSON.parse(d.toString());
                if (msg.id === id) {
                    ws.off('message', handler);
                    if (msg.error) reject(msg.error);
                    else resolve(msg.result?.result?.value);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
        });
    }

    // Force system light mode
    try {
        adbDevice(['shell', 'cmd', 'uimode', 'night', 'no']);
    } catch (_) {}

    console.log('Navigating to /referrals...');
    await evalCode(`(() => {
        window.history.pushState({}, '', '/referrals');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);

    // Poll until loaded
    console.log('Waiting for Referrals content to mount...');
    let loaded = false;
    for (let i = 0; i < 20; i++) {
        await sleep(500);
        const state = await evalCode(`(() => {
            const milestone = document.querySelector('.referral-milestone-card');
            const podium = document.querySelector('.podium-grid');
            const loading = document.querySelector('.loading');
            return { hasMilestone: !!milestone, hasPodium: !!podium, isLoading: !!loading };
        })()`);
        console.log(`Poll ${i + 1}:`, state);
        if (state?.hasMilestone && !state?.isLoading) {
            loaded = true;
            break;
        }
    }

    if (!loaded) {
        console.log('Reloading /referrals page directly...');
        await evalCode(`window.location.href = '/referrals';`);
        await sleep(4000);
    }

    // Allow CSS animations and avatars to paint
    await sleep(2000);

    const metrics = await evalCode(`(() => {
        const title = document.querySelector('.ambassador-title')?.textContent;
        const campusBadge = document.querySelector('.ambassador-campus-badge')?.textContent;
        const milestone = document.querySelector('.referral-milestone-card');
        const podiumCards = Array.from(document.querySelectorAll('.top-connector-card'));
        const whatsappBtn = document.querySelector('.ambassador-whatsapp-btn');
        return {
            title,
            campusBadge,
            milestoneHeight: milestone ? Math.round(milestone.getBoundingClientRect().height) : 0,
            podiumCount: podiumCards.length,
            hasWhatsappBtn: !!whatsappBtn
        };
    })()`);
    console.log('Referrals page metrics:', metrics);

    captureScreenshot('public/evidence_qa/compact_cards_referrals_live.png');
    ws.close();
    console.log('Done recapturing referrals!');
}

main().catch(console.error);
