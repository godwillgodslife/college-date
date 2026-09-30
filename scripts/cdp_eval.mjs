const port = process.env.CDP_PORT || "9223";
const res = await fetch(`http://localhost:${port}/json/list`);
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
        const expr = process.argv[2] || "window.location.href";
        const result = await sendCommand("Runtime.evaluate", {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        console.log(JSON.stringify(result.result?.value, null, 2));
    } catch (err) {
        console.error("Evaluation error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
