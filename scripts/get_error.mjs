import WebSocket from 'ws';

async function main() {
    const targets = await fetch('http://localhost:9222/json').then(r => r.json());
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    const id = 1;
    ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: {
            expression: 'sessionStorage.getItem("tcd_last_error")',
            returnByValue: true
        }
    }));

    ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 1) {
            console.log('Error caught by ErrorBoundary:\n', msg.result?.result?.value);
            ws.close();
            process.exit(0);
        }
    });
}

main().catch(console.error);
