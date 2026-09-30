import WebSocket from "ws";

async function main() {
    const listRes = await fetch("http://127.0.0.1:9223/json");
    const targets = await listRes.json();
    const page = targets.find(t => t.type === "page");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = new Map();

    ws.on("message", (raw) => {
        const msg = JSON.parse(raw);
        if (msg.method === "Runtime.consoleAPICalled") {
            console.log("[CONSOLE]", msg.params.type, msg.params.args?.map(a => a.value || a.description).join(" "));
        }
        if (msg.method === "Runtime.exceptionThrown") {
            console.log("[EXCEPTION]", JSON.stringify(msg.params.exceptionDetails, null, 2));
        }
        if (msg.id && callbacks.has(msg.id)) {
            const cb = callbacks.get(msg.id);
            callbacks.delete(msg.id);
            cb(msg);
        }
    });

    const send = (method, params = {}) => new Promise((resolve) => {
        const curId = id++;
        callbacks.set(curId, (res) => resolve(res));
        ws.send(JSON.stringify({ id: curId, method, params }));
    });

    await new Promise(r => ws.on("open", r));
    await send("Runtime.enable");
    await send("Log.enable");

    // Click Refresh Page button to trigger the crash again and catch it live
    console.log("Clicking Refresh Page button...");
    await send("Runtime.evaluate", {
        expression: `
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Refresh Page'));
            if (btn) btn.click();
            else window.location.reload();
        `
    });

    await new Promise(r => setTimeout(r, 4000));
    ws.close();
}

main().catch(err => console.error(err));
