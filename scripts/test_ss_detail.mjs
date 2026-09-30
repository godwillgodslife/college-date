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
                    // Try with prefix
                    const v1 = await SecureStorage.get({ key: 'tcd-auth:sb-gedoyoleoscgxgdqszzc-auth-token' });
                    results.v1_get = v1;

                    // Try without prefix
                    const v2 = await SecureStorage.get({ key: 'sb-gedoyoleoscgxgdqszzc-auth-token' });
                    results.v2_get = v2;

                    // Try getItem method if it exists
                    if (SecureStorage.getItem) {
                        results.getItem1 = await SecureStorage.getItem({ key: 'tcd-auth:sb-gedoyoleoscgxgdqszzc-auth-token' });
                        results.getItem2 = await SecureStorage.getItem('tcd-auth:sb-gedoyoleoscgxgdqszzc-auth-token');
                    } else {
                        results.hasGetItem = false;
                    }

                    // Check what methods exist on SecureStorage plugin
                    results.pluginMethods = Object.keys(SecureStorage);
                    results.protoMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(SecureStorage));
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
    console.log("Detailed SecureStorage inspection:", JSON.parse(e.data).result?.result?.value);
    ws.close();
    process.exit(0);
});
