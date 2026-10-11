// scripts/cdp-nav.mjs
// Navigate or execute scripts reliably in WebView

const targetPath = process.argv[2] || '/explore';

async function navigate() {
    const pagesRes = await fetch('http://127.0.0.1:9222/json');
    const pages = await pagesRes.json();
    const page = pages.find(p => p.type === 'page');
    if (!page) throw new Error('No page found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => { ws.onopen = res; });

    function evaluate(expr) {
        return new Promise((resolve) => {
            const id = Math.floor(Math.random() * 100000);
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    resolve(data.result);
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

    const script = `
        (() => {
            const link = document.querySelector('a[href="${targetPath}"]');
            if (link) {
                link.click();
                return 'Clicked link: ${targetPath}';
            }
            // Fallback: use history.pushState + popstate event if router supports it
            window.location.hash = '';
            window.history.pushState({}, '', '${targetPath}');
            window.dispatchEvent(new PopStateEvent('popstate'));
            return 'Pushed history state: ${targetPath}';
        })()
    `;

    const res = await evaluate(script);
    console.log('Result:', JSON.stringify(res, null, 2));
    ws.close();
}

navigate().catch(console.error);
