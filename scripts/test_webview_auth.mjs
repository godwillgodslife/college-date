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
                    resolve(msg.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: curId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true, awaitPromise: true } }));
        });
    }

    console.log('Testing in WebView:');
    const t0 = Date.now();
    const res = await call('window.__supabase ? window.__supabase.auth.getSession() : "no window.__supabase"');
    console.log('getSession took:', Date.now() - t0, 'ms. Result:');
    console.log(JSON.stringify(res?.result?.value, null, 2));

    const path = await call('window.location.pathname');
    console.log('Current path:', path?.result?.value);

    ws.close();
}

main().catch(console.error);
