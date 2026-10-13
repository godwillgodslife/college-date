import WebSocket from 'ws';
import http from 'http';
import fs from 'fs';
import { adbDevice } from './adb_tool.mjs';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function captureScreenshot(filename) {
    const buf = adbDevice(['exec-out', 'screencap', '-p'], { encoding: 'buffer', maxBuffer: 15 * 1024 * 1024 });
    fs.writeFileSync(filename, buf);
    console.log(`Saved screenshot to ${filename} (${buf.length} bytes)`);
}

async function getPage() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                const list = JSON.parse(data);
                const page = list.find(t => t.type === 'page');
                if (page) resolve(page);
                else reject(new Error('No page'));
            });
        }).on('error', reject);
    });
}

async function main() {
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

    // ── 1. Confessions Feed ──
    console.log('--- Step 1: Navigate to Confessions via BottomNav ---');
    const clickConfRes = await evalCode(`(() => {
        const link = document.querySelector('a[href="/confessions"]') || document.querySelector('a[aria-label="Confessions"]');
        if (link) { link.click(); return 'Clicked Confessions link'; }
        return 'Link not found';
    })()`);
    console.log('Confessions click result:', clickConfRes);

    await sleep(3500);

    // Scroll slightly past banner to center confessions feed
    console.log('Scrolling down past top hero on confessions...');
    await evalCode(`window.scrollBy({ top: 340, behavior: 'smooth' });`);
    await sleep(1500);

    const confMetrics = await evalCode(`(() => {
        const cards = Array.from(document.querySelectorAll('.confession-card-premium'));
        return {
            count: cards.length,
            cardHeights: cards.slice(0, 3).map(c => Math.round(c.getBoundingClientRect().height))
        };
    })()`);
    console.log('Confessions metrics:', confMetrics);
    captureScreenshot('public/evidence_qa/compact_cards_confessions_live.png');

    // ── 2. Dashboard ──
    console.log('--- Step 2: Navigate to Dashboard ---');
    await evalCode(`(() => {
        const brand = document.querySelector('.navbar-brand') || document.querySelector('a[href="/dashboard"]');
        if (brand) { brand.click(); return 'Clicked Dashboard brand link'; }
        window.location.href = '/dashboard';
        return 'Navigated via href';
    })()`);

    await sleep(3500);

    // Scroll to feature action cards
    console.log('Scrolling to features-grid on Dashboard...');
    await evalCode(`window.scrollBy({ top: 380, behavior: 'smooth' });`);
    await sleep(1500);

    const dashMetrics = await evalCode(`(() => {
        const grid = document.querySelector('.features-grid');
        const cards = Array.from(document.querySelectorAll('.feature-card'));
        return {
            gridCols: grid ? window.getComputedStyle(grid).gridTemplateColumns : '',
            count: cards.length,
            cardHeights: cards.slice(0, 4).map(c => Math.round(c.getBoundingClientRect().height))
        };
    })()`);
    console.log('Dashboard feature card metrics:', dashMetrics);
    captureScreenshot('public/evidence_qa/compact_cards_dashboard_live.png');

    ws.close();
    console.log('Done!');
}

main().catch(console.error);
