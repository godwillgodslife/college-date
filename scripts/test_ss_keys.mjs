const res = await fetch("http://localhost:9223/json/list");
const targets = await res.json();
const target = targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);

ws.addEventListener("open", async () => {
    ws.send(JSON.stringify({ 
        id: 1, 
        method: "Runtime.evaluate", 
        params: { 
            expression: `(async () => {
                const SecureStorage = window.Capacitor?.Plugins?.SecureStorage;
                const results = {};
                try {
                    const keys = await SecureStorage.keys();
                    results.keys = keys;

                    for (const k of keys) {
                        try {
                            const val = await SecureStorage.get({ key: k });
                            results['val_' + k] = typeof val?.value === 'string' ? val.value.slice(0, 50) + '...' : val;
                        } catch(e) {
                            results['err_' + k] = e.message;
                        }
                    }
                } catch(e) {
                    results.error = e.message;
                }
                return results;
            })()`,
            returnByValue: true,
            awaitPromise: true
        } 
    }));
});
ws.addEventListener("message", (e) => {
    console.log("SecureStorage content:", JSON.parse(e.data).result?.result?.value);
    ws.close();
    process.exit(0);
});
