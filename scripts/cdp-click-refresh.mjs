// scripts/cdp-click-refresh.mjs
async function refreshAndCatch() {
    const pagesRes = await fetch('http://127.0.0.1:9222/json');
    const pages = await pagesRes.json();
    const page = pages.find(p => p.type === 'page');
    if (!page) throw new Error('No page found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => { ws.onopen = res; });

    ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.method === 'Runtime.consoleAPICalled') {
            const type = data.params.type;
            const args = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
            console.log(`[CONSOLE ${type.toUpperCase()}]:`, args);
        } else if (data.method === 'Runtime.exceptionThrown') {
            console.error('[EXCEPTION]:', JSON.stringify(data.params.exceptionDetails, null, 2));
        }
    };

    ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({
        id: 2,
        method: 'Runtime.evaluate',
        params: {
            expression: `
                (() => {
                    const btn = document.querySelector('button');
                    if (btn && btn.innerText.includes('Refresh')) {
                        btn.click();
                        return 'Clicked Refresh button';
                    }
                    window.location.reload();
                    return 'Called reload';
                })()
            `,
            returnByValue: true
        }
    }));

    await new Promise(r => setTimeout(r, 4000));
    ws.close();
}

refreshAndCatch().catch(console.error);
