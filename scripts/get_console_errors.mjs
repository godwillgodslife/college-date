import WebSocket from 'ws';

async function run() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
    if (!page) throw new Error('No page target');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    ws.send(JSON.stringify({ id: 1, method: 'Log.enable' }));
    ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));

    const logs = [];

    ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.method === 'Runtime.consoleAPICalled') {
            logs.push({ type: msg.params.type, args: msg.params.args.map(a => a.value || a.description) });
        } else if (msg.method === 'Runtime.exceptionThrown') {
            logs.push({ type: 'EXCEPTION', desc: msg.params.exceptionDetails });
        }
    };

    // Click "Try Again" to reproduce the error
    setTimeout(() => {
        ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
                expression: `(() => {
                    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Try Again'));
                    if (btn) btn.click();
                })()`
            }
        }));
    }, 500);

    setTimeout(() => {
        ws.close();
        console.log('Captured Console & Exceptions:\n', JSON.stringify(logs, null, 2));
    }, 2500);
}

run().catch(console.error);
