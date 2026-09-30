const res = await fetch("http://localhost:9222/json/list");
const targets = await res.json();
const target = targets[0];
if (!target) {
    console.error("No DevTools target found");
    process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 1;

function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
        const cmdId = id++;
        const handler = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === cmdId) {
                ws.removeEventListener("message", handler);
                if (data.error) reject(data.error);
                else resolve(data.result);
            }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: cmdId, method, params }));
    });
}

ws.addEventListener("open", async () => {
    try {
        await sendCommand("Runtime.enable");
        await sendCommand("Log.enable");

        ws.addEventListener("message", (event) => {
            const data = JSON.parse(event.data);
            if (data.method === "Runtime.consoleAPICalled") {
                const text = data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
                console.log(`[CONSOLE ${data.params.type}]`, text);
            } else if (data.method === "Runtime.exceptionThrown") {
                console.error(`[EXCEPTION]`, data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
            }
        });

        // Trigger reload
        await sendCommand("Page.enable");
        await sendCommand("Page.reload", { ignoreCache: true });

        await new Promise(r => setTimeout(r, 4000));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
