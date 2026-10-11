import WebSocket from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';

async function getPageTarget() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
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
    const page = await getPageTarget();
    console.log(`Connecting to page: ${page.title} (${page.url})`);
    const ws = new WebSocket(page.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    let msgId = 1;
    function send(method, params = {}) {
        return new Promise((resolve) => {
            const id = msgId++;
            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id === id) {
                    ws.off('message', handler);
                    resolve(msg.result);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async function evaluate(expression) {
        const res = await send('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        return res?.result?.value;
    }

    async function captureScreenshot(filename) {
        await send('Page.enable');
        const res = await send('Page.captureScreenshot', { format: 'png' });
        const brainPath = path.join('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\5f4983c3-95fd-4576-aeb7-98414136103b', filename);
        const publicPath = path.resolve('public/evidence_qa', filename);
        fs.writeFileSync(brainPath, Buffer.from(res.data, 'base64'));
        fs.writeFileSync(publicPath, Buffer.from(res.data, 'base64'));
        console.log(`Saved screenshot: ${filename}`);
    }

    // Step 0: Navigate to /explore
    console.log('0. Navigating to /explore and waiting for hydration...');
    await evaluate(`window.history.pushState({}, '', '/explore'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await new Promise(r => setTimeout(r, 2500));

    // Step 1: Open filter panel
    console.log('1. Tapping ⚙️ Filter button to open panel...');
    await evaluate(`(() => {
        const btn = document.querySelector('.explore-filter-btn');
        if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    // Step 2: Select 'Women' filter in .explore-filter-options
    console.log('2. Selecting "Women" filter option...');
    const selected = await evaluate(`(() => {
        const options = Array.from(document.querySelectorAll('.explore-filter-options button'));
        const womenBtn = options.find(b => b.textContent.trim() === 'Women');
        if (womenBtn) {
            womenBtn.click();
            return 'Selected Women';
        }
        return 'Options available: ' + options.map(o => o.textContent.trim()).join(', ');
    })()`);
    console.log('Result:', selected);
    await new Promise(r => setTimeout(r, 800));

    // Step 3: Capture screenshot of filter panel open showing "1 active" pill and Reset button
    await captureScreenshot('evidence_52_filter_panel_open_active_1.png');

    // Step 4: Close the filter panel
    console.log('3. Closing filter panel...');
    await evaluate(`(() => {
        const btn = document.querySelector('.explore-filter-btn');
        if (btn) btn.click();
    })()`);
    await new Promise(r => setTimeout(r, 800));

    // Step 5: Check DOM for .filter-badge on closed button
    const closedAudit = await evaluate(`(() => {
        const btn = document.querySelector('.explore-filter-btn');
        const badge = btn ? btn.querySelector('.filter-badge') : null;
        return {
            btnClasses: btn ? btn.className : null,
            hasBadge: Boolean(badge),
            badgeText: badge ? badge.textContent.trim() : null,
            ariaLabel: btn ? btn.getAttribute('aria-label') : null,
            title: btn ? btn.getAttribute('title') : null
        };
    })()`);
    console.log('Closed Button Badge Audit:', JSON.stringify(closedAudit, null, 2));

    // Step 6: Capture screenshot of discovery grid showing filter button with active "1" badge!
    await captureScreenshot('evidence_53_explore_filter_badge_active_1.png');

    ws.close();
    console.log('Filter badge evidence captured successfully!');
}

main().catch(console.error);
