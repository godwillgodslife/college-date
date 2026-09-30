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
        ws.send(JSON.stringify({ id: id, method, params }));
    });
}

ws.addEventListener('open', async () => {
    try {
        await send('Runtime.enable');
        const testScript = `
            (async () => {
                const results = {};
                try {
                    const hasCap = !!window.Capacitor;
                    results.hasCapacitor = hasCap;
                    results.plugins = Object.keys(window.Capacitor?.Plugins || {});

                    const SecureStorage = window.Capacitor?.Plugins?.SecureStorage;
                    results.hasSecureStorage = !!SecureStorage;

                    if (SecureStorage) {
                        const start = Date.now();
                        try {
                            const val = await Promise.race([
                                SecureStorage.get({ key: 'test_key' }),
                                new Promise((_, reject) => setTimeout(() => reject(new Error('SecureStorage timeout 2s')), 2000))
                            ]);
                            results.secureStorageGet = val;
                        } catch (e) {
                            results.secureStorageGetError = e.message;
                        }
                        results.durationMs = Date.now() - start;
                    }
                } catch (e) {
                    results.error = e.message;
                }
                return results;
            })()
        `;

        const evalRes = await send('Runtime.evaluate', { expression: testScript, returnByValue: true, awaitPromise: true });
        console.log('SecureStorage Test Results:', evalRes.result?.value);
    } catch (e) {
        console.error(e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
