const res = await fetch("http://localhost:9223/json/list");
const targets = await res.json();
const target = targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);

ws.addEventListener("open", async () => {
    ws.send(JSON.stringify({ id: 1, method: "Log.enable" }));
    ws.send(JSON.stringify({ id: 2, method: "Runtime.enable" }));
    ws.send(JSON.stringify({ 
        id: 3, 
        method: "Runtime.evaluate", 
        params: { 
            expression: `window.__capturedErrors || []`,
            returnByValue: true
        } 
    }));
});

ws.addEventListener("message", (e) => {
    const msg = JSON.parse(e.data);
    if (msg.method === "Log.entryAdded") {
        console.log("[LOG ENTRY]", msg.params.entry);
    }
});

setTimeout(() => {
    ws.close();
    process.exit(0);
}, 2000);
