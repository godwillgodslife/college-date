const res = await fetch("http://localhost:9223/json/list");
const targets = await res.json();
const target = targets[0];
if (!target) {
    console.error("No target found");
    process.exit(1);
}
const ws = new WebSocket(target.webSocketDebuggerUrl);

function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (e) => {
            const d = JSON.parse(e.data);
            if (d.id === id) {
                ws.removeEventListener("message", handler);
                if (d.error) reject(d.error);
                else resolve(d.result);
            }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.addEventListener("open", async () => {
    try {
        await send("Runtime.enable");
        const evalRes = await send("Runtime.evaluate", {
            expression: `(async () => {
                let sessionInfo = {};
                try {
                    const sb = window.__supabase || window.supabase;
                    // Check if supabase client exists on window or in modules
                    sessionInfo.hasWindowSupabase = !!sb;
                    sessionInfo.href = window.location.href;
                    sessionInfo.localStorageKeys = Object.keys(window.localStorage);
                    sessionInfo.sessionStorageKeys = Object.keys(window.sessionStorage);
                    
                    const SecureStorage = window.Capacitor?.Plugins?.SecureStorage;
                    if (SecureStorage) {
                        sessionInfo.secureKeys = await SecureStorage.keys();
                    }
                } catch(e) {
                    sessionInfo.error = e.message;
                }
                return sessionInfo;
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log("Inspection result:", evalRes.result?.value);
    } catch(err) {
        console.error(err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
