// scripts/cdp-eval.mjs
// Execute JS in the running WebView via Chrome DevTools Protocol
const expr = process.argv[2] || 'window.location.href';

async function run() {
    const pagesRes = await fetch('http://127.0.0.1:9222/json');
    const pages = await pagesRes.json();
    const page = pages.find(p => p.type === 'page');
    if (!page) {
        console.error('No page found in CDP');
        process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onopen = () => {
        const msg = JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: {
                expression: expr,
                returnByValue: true,
                awaitPromise: true
            }
        });
        ws.send(msg);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === 1) {
            if (data.result?.exceptionDetails) {
                console.error('JS Exception:', JSON.stringify(data.result.exceptionDetails, null, 2));
            } else {
                console.log(JSON.stringify(data.result?.result?.value !== undefined ? data.result.result.value : data.result?.result, null, 2));
            }
            ws.close();
            process.exit(0);
        }
    };

    ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        process.exit(1);
    };
}

run();
