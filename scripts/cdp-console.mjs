// scripts/cdp-console.mjs
// Listen or fetch log entries from CDP

async function fetchLogs() {
    const pagesRes = await fetch('http://127.0.0.1:9222/json');
    const pages = await pagesRes.json();
    const page = pages.find(p => p.type === 'page');
    if (!page) throw new Error('No page found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => { ws.onopen = res; });

    ws.onmessage = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.method === 'Runtime.consoleAPICalled' || data.method === 'Log.entryAdded' || data.method === 'Runtime.exceptionThrown') {
            console.log('LOG EVENT:', JSON.stringify(data, null, 2));
        }
    };

    ws.send(JSON.stringify({ id: 1, method: 'Log.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
    ws.send(JSON.stringify({
        id: 3,
        method: 'Runtime.evaluate',
        params: {
            expression: 'console.error.toString()',
            returnByValue: true
        }
    }));

    await new Promise(r => setTimeout(r, 2000));
    ws.close();
}

fetchLogs().catch(console.error);
