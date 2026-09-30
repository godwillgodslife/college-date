async function run() {
    const listRes = await fetch("http://127.0.0.1:9222/json");
    const list = await listRes.json();
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    ws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.method === "Runtime.consoleAPICalled") {
            const text = d.params.args?.map(a => a.value || a.description).join(" ");
            if (d.params.type === "error" || text.includes("error") || text.includes("Error")) {
                console.log("[CONSOLE ERROR]", text);
            }
        }
        if (d.method === "Runtime.exceptionThrown") {
            console.log("[UNCAUGHT EXCEPTION]", d.params.exceptionDetails?.exception?.description || JSON.stringify(d.params.exceptionDetails));
        }
    };
    await new Promise(r => ws.onopen = r);
    ws.send(JSON.stringify({ id: 1, method: "Runtime.enable" }));
    ws.send(JSON.stringify({ id: 2, method: "Runtime.evaluate", params: { expression: "window.location.href = '/dashboard'" } }));
    await new Promise(r => setTimeout(r, 6000));
    ws.close();
}
run().catch(console.error);
