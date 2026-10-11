import WebSocket from 'ws';

export async function getWebviewPage() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No page target found on 127.0.0.1:9222');
    return page;
}

export async function evaluateInWebview(expression) {
    const page = await getWebviewPage();
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('Evaluation timed out: ' + expression));
        }, 10000);

        ws.on('open', () => {
            ws.send(JSON.stringify({
                id: 1,
                method: 'Runtime.evaluate',
                params: {
                    expression,
                    returnByValue: true,
                    awaitPromise: true
                }
            }));
        });

        ws.on('message', (msg) => {
            clearTimeout(timeout);
            const res = JSON.parse(msg.toString());
            ws.close();
            if (res.error) reject(res.error);
            else if (res.result?.exceptionDetails) reject(res.result.exceptionDetails);
            else resolve(res.result?.result?.value);
        });

        ws.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

// Run direct if called from CLI
if (process.argv[1]?.endsWith('webview_client.mjs')) {
    const expr = process.argv[2] || '({ path: window.location.pathname, theme: document.documentElement.getAttribute("data-theme") })';
    evaluateInWebview(expr)
        .then(result => console.log('Webview Result:', JSON.stringify(result, null, 2)))
        .catch(err => console.error('Webview Error:', err));
}
