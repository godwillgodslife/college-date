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

    // 1. Navigate to /explore
    console.log('Navigating to /explore...');
    await evaluate(`window.history.pushState({}, '', '/explore'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await new Promise(r => setTimeout(r, 2000));

    // 2. Capture default Explore state (0 active filters)
    console.log('Capturing default Explore state...');
    await captureScreenshot('evidence_49_explore_default_no_badge.png');

    // 3. Open filter panel by clicking .explore-filter-btn
    console.log('Opening filter panel...');
    await evaluate(`(() => {
        const filterBtn = document.querySelector('.explore-filter-btn');
        if (filterBtn) filterBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    // 4. Select a filter option (e.g. Women/Female or Men)
    console.log('Selecting a filter option in panel...');
    const filterApplied = await evaluate(`(() => {
        const genderButtons = Array.from(document.querySelectorAll('.filter-gender-options button, .gender-selector button, .filter-chip'));
        // Find a button that is not 'All'
        const targetBtn = genderButtons.find(b => b.textContent.includes('Women') || b.textContent.includes('Men') || b.textContent.includes('Female'));
        if (targetBtn) {
            targetBtn.click();
            return targetBtn.textContent.trim();
        }
        // Fallback: check select dropdowns
        const select = document.querySelector('.explore-filter-panel select');
        if (select && select.options.length > 1) {
            select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return select.value;
        }
        return null;
    })()`);
    console.log('Applied filter:', filterApplied);
    await new Promise(r => setTimeout(r, 1500));

    // Check button state & badge
    const badgeAudit = await evaluate(`(() => {
        const btn = document.querySelector('.explore-filter-btn');
        const badge = btn ? btn.querySelector('.filter-badge') : null;
        return {
            btnClasses: btn ? btn.className : null,
            hasBadge: Boolean(badge),
            badgeText: badge ? badge.textContent.trim() : null,
            ariaLabel: btn ? btn.getAttribute('aria-label') : null,
            ariaExpanded: btn ? btn.getAttribute('aria-expanded') : null
        };
    })()`);
    console.log('Badge Audit Results with filter open:', JSON.stringify(badgeAudit, null, 2));

    // Capture screenshot with filter panel open and badge active
    await captureScreenshot('evidence_50_explore_filter_panel_with_badge.png');

    // 5. Close filter panel to see filter button with badge on discovery grid
    console.log('Closing filter panel...');
    await evaluate(`(() => {
        const filterBtn = document.querySelector('.explore-filter-btn');
        if (filterBtn) filterBtn.click();
    })()`);
    await new Promise(r => setTimeout(r, 1200));

    // Check closed button state
    const closedAudit = await evaluate(`(() => {
        const btn = document.querySelector('.explore-filter-btn');
        const badge = btn ? btn.querySelector('.filter-badge') : null;
        return {
            btnClasses: btn ? btn.className : null,
            hasBadge: Boolean(badge),
            badgeText: badge ? badge.textContent.trim() : null,
            ariaLabel: btn ? btn.getAttribute('aria-label') : null
        };
    })()`);
    console.log('Closed Button Audit Results:', JSON.stringify(closedAudit, null, 2));

    // Capture screenshot of Explore grid with active filter badge on the button
    await captureScreenshot('evidence_51_explore_active_filter_badge_closed.png');

    ws.close();
    console.log('Verification of Explore active filter badge complete!');
}

main().catch(console.error);
