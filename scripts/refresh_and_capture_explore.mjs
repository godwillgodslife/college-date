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

    // Reset swipes for user
    const res = await evalCode(`
        (async () => {
            const sessionStr = localStorage.getItem('sb-gedoyoleoscgxgdqszzc-auth-token');
            const session = JSON.parse(sessionStr);
            const token = session.access_token;
            const userId = session.user.id;
            
            const r = await fetch('https://gedoyoleoscgxgdqszzc.supabase.co/rest/v1/swipes?swiper_id=eq.' + userId, {
                method: 'DELETE',
                headers: {
                    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys',
                    'Authorization': 'Bearer ' + token
                }
            });
            return { deleteStatus: r.status };
        })()
    `);
    console.log('Swipe deletion result:', res);

    // Reload Explore
    console.log('Navigating to Explore to trigger fetch...');
    await evalCode(`
        (() => {
            window.location.reload();
        })()
    `);

    console.log('Waiting 4s for Explore to load...');
    await sleep(4000);

    const exploreState = await evalCode(`
        (() => {
            const cards = Array.from(document.querySelectorAll('.explore-card'));
            const heights = cards.slice(0, 5).map(c => Math.round(c.getBoundingClientRect().height));
            return {
                cardCount: cards.length,
                firstFewHeights: heights,
                gridAutoRows: window.getComputedStyle(document.querySelector('.explore-grid') || document.body).gridAutoRows
            };
        })()
    `);
    console.log('Explore state after reload:', exploreState);

    captureScreenshot('public/evidence_qa/compact_cards_explore_live.png');
    ws.close();
}

main().catch(console.error);
