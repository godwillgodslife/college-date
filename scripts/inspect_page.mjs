const res = await fetch("http://localhost:9223/json/list");
const targets = await res.json();
const target = targets[0];
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
            expression: `({
                url: window.location.href,
                bodyText: document.body.innerText,
                toasts: Array.from(document.querySelectorAll('.toast, .auth-error, [role="alert"]')).map(el => el.innerText)
            })`,
            returnByValue: true
        });
        console.log("Current page state:", evalRes.result?.value);
    } catch(err) {
        console.error(err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
