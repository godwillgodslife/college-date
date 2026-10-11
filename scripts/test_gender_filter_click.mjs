import WebSocket from 'ws';

async function evalInWebview(expression) {
    const targets = await fetch('http://localhost:9222/json').then(r => r.json());
    const page = targets.find(t => t.type === 'page');
    if (!page) {
        throw new Error('No page found');
    }
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    const id = Math.floor(Math.random() * 100000);
    const msg = JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: {
            expression,
            returnByValue: true,
            awaitPromise: true
        }
    });

    ws.send(msg);

    const result = await new Promise((resolve) => {
        ws.on('message', (data) => {
            const parsed = JSON.parse(data.toString());
            if (parsed.id === id) {
                resolve(parsed.result);
            }
        });
    });

    ws.close();
    return result?.result?.value;
}

async function main() {
    console.log('1. Checking current page buttons...');
    const info = await evalInWebview(`
        (() => {
            const railBtns = Array.from(document.querySelectorAll('.discover-rail-btn')).map(b => b.innerText);
            return {
                url: window.location.href,
                railBtns,
                bodySnippet: document.body.innerText.slice(0, 200)
            };
        })()
    `);
    console.log('Page info:', JSON.stringify(info, null, 2));

    console.log('2. Clicking gender filter button...');
    const click1 = await evalInWebview(`
        (() => {
            const btns = Array.from(document.querySelectorAll('.discover-rail-btn'));
            const gBtn = btns.find(b => b.innerText.includes('Women') || b.innerText.includes('Men') || b.innerText.includes('All'));
            if (gBtn) {
                const prev = gBtn.innerText;
                gBtn.click();
                return { success: true, prev };
            }
            return { success: false, available: btns.map(b => b.innerText) };
        })()
    `);
    console.log('Click 1 result:', JSON.stringify(click1, null, 2));

    await new Promise(r => setTimeout(r, 600));

    const textAfter1 = await evalInWebview(`
        (() => {
            const btns = Array.from(document.querySelectorAll('.discover-rail-btn'));
            const gBtn = btns.find(b => b.innerText.includes('Women') || b.innerText.includes('Men') || b.innerText.includes('All'));
            return gBtn ? gBtn.innerText : null;
        })()
    `);
    console.log('Text after click 1:', textAfter1);

    console.log('3. Clicking gender filter button (Click 2)...');
    await evalInWebview(`
        (() => {
            const btns = Array.from(document.querySelectorAll('.discover-rail-btn'));
            const gBtn = btns.find(b => b.innerText.includes('Women') || b.innerText.includes('Men') || b.innerText.includes('All'));
            gBtn?.click();
        })()
    `);

    await new Promise(r => setTimeout(r, 600));

    const textAfter2 = await evalInWebview(`
        (() => {
            const btns = Array.from(document.querySelectorAll('.discover-rail-btn'));
            const gBtn = btns.find(b => b.innerText.includes('Women') || b.innerText.includes('Men') || b.innerText.includes('All'));
            return gBtn ? gBtn.innerText : null;
        })()
    `);
    console.log('Text after click 2:', textAfter2);

    console.log('4. Clicking gender filter button (Click 3)...');
    await evalInWebview(`
        (() => {
            const btns = Array.from(document.querySelectorAll('.discover-rail-btn'));
            const gBtn = btns.find(b => b.innerText.includes('Women') || b.innerText.includes('Men') || b.innerText.includes('All'));
            gBtn?.click();
        })()
    `);

    await new Promise(r => setTimeout(r, 600));

    const textAfter3 = await evalInWebview(`
        (() => {
            const btns = Array.from(document.querySelectorAll('.discover-rail-btn'));
            const gBtn = btns.find(b => b.innerText.includes('Women') || b.innerText.includes('Men') || b.innerText.includes('All'));
            return gBtn ? gBtn.innerText : null;
        })()
    `);
    console.log('Text after click 3:', textAfter3);
}

main().catch(console.error);
