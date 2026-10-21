import WebSocket from 'ws';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function evalCDP(expr) {
    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
    if (!page) throw new Error('No page target');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === id) {
                ws.close();
                if (data.error) reject(data.error);
                else if (data.result?.exceptionDetails) reject(data.result.exceptionDetails);
                else resolve(data.result?.result?.value);
            }
        };
        ws.send(JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
    });
}

async function run() {
    console.log('1. Clicking Profile tab on bottom navigation...');
    const navClick = await evalCDP(`(() => {
        const items = Array.from(document.querySelectorAll('.bottom-nav-item, a, button'));
        const prof = items.find(el => el.textContent.includes('Profile') || el.href?.includes('/profile'));
        if (prof) {
            prof.click();
            return 'Clicked Profile tab';
        }
        return 'Profile tab not found';
    })()`);
    console.log('Nav click:', navClick);

    await sleep(2000);
    console.log('Current URL:', await evalCDP('window.location.href'));

    console.log('2. Clicking Campus Dashboard link on Profile...');
    const dashClick = await evalCDP(`(() => {
        const btn = document.querySelector('[aria-label="Go to Campus Dashboard and view streaks and balance"]') || Array.from(document.querySelectorAll('button, a, div')).find(el => el.textContent.includes('Dashboard'));
        if (btn) {
            btn.click();
            return 'Clicked Dashboard link: ' + btn.textContent.trim();
        }
        return 'Dashboard link not found';
    })()`);
    console.log('Dash click:', dashClick);

    await sleep(2000);
    console.log('Current URL after Dash click:', await evalCDP('window.location.href'));
}

run().catch(console.error);
