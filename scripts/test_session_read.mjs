const res = await fetch("http://localhost:9222/json/list");
const targets = await res.json();
const target = targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);

function send(method, params = {}) {
    return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (e) => {
            const d = JSON.parse(e.data);
            if (d.id === id) {
                ws.removeEventListener('message', handler);
                resolve(d.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.addEventListener('open', async () => {
    try {
        await send('Runtime.enable');
        const testSession = `
            (async () => {
                const start = Date.now();
                // Test SecureStorage.getItem directly
                const SecureStorage = window.Capacitor?.Plugins?.SecureStorage;
                const secureGetStart = Date.now();
                const token = await SecureStorage.get({ key: 'tcd-auth:sb-gedoyoleoscgxgdqszzc-auth-token' });
                const secureGetDuration = Date.now() - secureGetStart;

                return {
                    secureGetDuration,
                    tokenFound: !!token?.value,
                    tokenLength: token?.value?.length || 0,
                    totalDuration: Date.now() - start
                };
            })()
        `;

        const evalRes = await send('Runtime.evaluate', { expression: testSession, returnByValue: true, awaitPromise: true });
        console.log('SecureStorage Direct Read:', evalRes.result?.value);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
