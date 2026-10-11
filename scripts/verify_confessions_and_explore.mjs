import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';

async function main() {
    const raw = await (await fetch('http://127.0.0.1:9222/json')).json();
    const target = raw.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found on port 9222');

    console.log('Connecting to page:', target.title, target.url);
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

    // 1. Navigate to Confessions via window.location or router
    console.log('--- 1. Navigating to /confessions ---');
    const startNav = Date.now();
    await evaluate(`
        (() => {
            window.location.hash = '';
            window.history.pushState({}, '', '/confessions');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);

    // Wait a brief moment for render
    await new Promise(r => setTimeout(r, 1200));
    const navTime = Date.now() - startNav;

    // Check DOM state
    const confessionState = await evaluate(`
        (() => {
            return {
                url: window.location.pathname,
                title: document.title,
                hasConfessionsContainer: !!document.querySelector('.confessions-container, .confession-feed, .confessions-header, .confession-card'),
                feedItemsCount: document.querySelectorAll('.confession-card, [class*="confession"]').length,
                hasComposer: !!document.querySelector('.confession-fab, .confession-compose-btn, [aria-label*="confess" i], [aria-label*="compose" i]'),
                hasError: !!document.querySelector('.error-boundary, .error-container') || document.body.innerText.includes('Something went wrong'),
                bodyTextSample: document.body.innerText.slice(0, 300)
            };
        })()
    `);
    console.log('Confessions state:', JSON.stringify(confessionState, null, 2));
    console.log(`Navigation time: ${navTime}ms`);

    await captureScreenshot('release_confessions_screen.png');

    // 2. Navigate to Explore
    console.log('--- 2. Navigating to /explore ---');
    await evaluate(`
        (() => {
            window.history.pushState({}, '', '/explore');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);

    await new Promise(r => setTimeout(r, 1200));

    const exploreState = await evaluate(`
        (() => {
            return {
                url: window.location.pathname,
                searchInput: !!document.querySelector('input[type="search"]'),
                searchInputValue: document.querySelector('input[type="search"]')?.value,
                filterButtonsCount: document.querySelectorAll('.filter-chip, .filter-pill, .discover-rail-btn').length,
                hasError: !!document.querySelector('.error-boundary, .error-container')
            };
        })()
    `);
    console.log('Explore state:', JSON.stringify(exploreState, null, 2));

    await captureScreenshot('release_explore_screen.png');

    // 3. Return to Dashboard
    console.log('--- 3. Returning to /dashboard ---');
    await evaluate(`
        (() => {
            window.history.pushState({}, '', '/dashboard');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);
    await new Promise(r => setTimeout(r, 800));

    ws.close();
    console.log('All checks completed successfully!');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
