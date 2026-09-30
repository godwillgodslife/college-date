async function main() {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await listRes.json();
    const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));

    let id = 1;
    function call(expr) {
        return new Promise((resolve) => {
            const curId = ++id;
            const handler = (e) => {
                const msg = JSON.parse(e.data);
                if (msg.id === curId) {
                    ws.removeEventListener('message', handler);
                    resolve(msg.result?.result?.value);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: curId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
        });
    }

    console.log('Current URL:', await call('window.location.href'));
    console.log('Navigating to /dashboard via __reactNavigate...');
    await call(`(() => {
        if (window.__reactNavigate) {
            window.__reactNavigate('/dashboard');
        } else {
            window.location.href = '/dashboard';
        }
    })()`);

    await new Promise(r => setTimeout(r, 3000));
    console.log('URL after nav:', await call('window.location.href'));

    ws.close();
}

main().catch(console.error);
