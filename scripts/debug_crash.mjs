async function main() {
    const listRes = await fetch("http://127.0.0.1:9222/json");
    const targets = await listRes.json();
    const page = targets.find(t => t.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;

    ws.onmessage = (raw) => {
        const msg = JSON.parse(raw.data);
        if (msg.method === "Runtime.consoleAPICalled") {
            console.log("[CONSOLE]", msg.params.type, msg.params.args?.map(a => a.value || a.description).join(" "));
        }
        if (msg.method === "Runtime.exceptionThrown") {
            console.log("[EXCEPTION]", JSON.stringify(msg.params.exceptionDetails, null, 2));
        }
    };

    const send = (method, params = {}) => new Promise((resolve) => {
        const curId = id++;
        const handler = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === curId) {
                ws.removeEventListener('message', handler);
                resolve(data.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await new Promise(r => ws.onopen = r);
    await send("Runtime.enable");
    await send("Log.enable");

    console.log("Reloading window to catch exception...");
    await send("Runtime.evaluate", {
        expression: "window.location.reload()"
    });

    await new Promise(r => setTimeout(r, 5000));
    ws.close();
}

main().catch(console.error);
