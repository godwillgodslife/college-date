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
        await sendCommand("Console.enable");
        await sendCommand("Runtime.enable");
        await sendCommand("Log.enable");

        ws.addEventListener("message", (event) => {
            const data = JSON.parse(event.data);
            if (data.method === "Runtime.consoleAPICalled") {
                console.log(`[CONSOLE ${data.params.type}]`, data.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
            } else if (data.method === "Runtime.exceptionThrown") {
                console.error(`[EXCEPTION]`, data.params.exceptionDetails);
            }
        });

        // Trigger a simple evaluate to get anything buffered
        const evalRes = await sendCommand("Runtime.evaluate", {
            expression: "window.localStorage.getItem('tcd_token') || window.localStorage.getItem('sb-gedoyoleoscgxgdqszzc-auth-token')"
        });
        console.log("Auth Token in localStorage:", evalRes.result?.value ? "Present" : "None");

        await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
        console.error("Error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
