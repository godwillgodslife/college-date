import { execSync } from 'node:child_process';
import path from 'node:path';
import { adbDevice, adb } from './adb_tool.mjs';

function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function run() {
    const unixSockets = adbDevice(['shell', 'cat', '/proc/net/unix']);
    const match = unixSockets.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket');
    
    try { adb(['forward', '--remove', 'tcp:9222']); } catch (_) {}
    adb(['forward', 'tcp:9222', `localabstract:${match[1]}`]);

    const jsonStr = execSync('curl.exe -s http://127.0.0.1:9222/json').toString();
    const pages = JSON.parse(jsonStr);
    const page = pages.find(p => p.type === 'page') || pages[0];

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    function evaluate(expr) {
        return new Promise((resolve) => {
            const id = Math.floor(Math.random() * 100000);
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    resolve(data.result?.result?.value);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: { expression: expr, returnByValue: true, awaitPromise: true }
            }));
        });
    }

    const current = await evaluate('window.location.pathname');
    console.log('Current path:', current);

    // Let's click Explore tab!
    console.log('Clicking Explore tab in BottomNav...');
    const clickExploreRes = await evaluate(`(() => {
        const exploreLink = document.querySelector('a[href="/explore"]') || document.querySelector('a[aria-label="Explore"]');
        if (exploreLink) {
            exploreLink.click();
            return { clicked: true, text: exploreLink.innerText };
        }
        return { clicked: false, availableLinks: Array.from(document.querySelectorAll('a')).map(a => a.href) };
    })()`);
    console.log('Click explore result:', clickExploreRes);

    await sleep(3500);
    const newPath = await evaluate('window.location.pathname');
    console.log('New path after click:', newPath);

    const exploreContent = await evaluate(`(() => {
        const cards = Array.from(document.querySelectorAll('.explore-card'));
        const grid = document.querySelector('.explore-grid');
        return {
            cardCount: cards.length,
            hasGrid: !!grid,
            cardHeights: cards.slice(0, 4).map(c => Math.round(c.getBoundingClientRect().height))
        };
    })()`);
    console.log('Explore DOM state:', exploreContent);

    ws.close();
}

run().catch(console.error);
