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

ws.addEventListener("message", (e) => {
    const d = JSON.parse(e.data);
    if (d.method === "Runtime.consoleAPICalled") {
        const args = (d.params.args || []).map(a => a.value || JSON.stringify(a)).join(" ");
        console.log(`[CONSOLE ${d.params.type}]`, args);
    }
    if (d.method === "Network.responseReceived") {
        const r = d.params.response;
        if (r.url.includes("supabase.co") || r.url.includes("rest/v1")) {
            console.log(`[NET ${r.status}] ${r.statusText} -> ${r.url}`);
        }
    }
});

ws.addEventListener("open", async () => {
    try {
        await send("Runtime.enable");
        await send("Network.enable");

        console.log("Navigating directly to /mini-profile-setup...");
        await send("Runtime.evaluate", {
            expression: "window.location.href = 'https://localhost/mini-profile-setup'"
        });

        await new Promise(r => setTimeout(r, 4000));

        const pageState = await send("Runtime.evaluate", {
            expression: `({
                href: window.location.href,
                bodyText: document.body.innerText.slice(0, 300),
                inputs: Array.from(document.querySelectorAll('input')).map(i => ({ placeholder: i.placeholder, type: i.type }))
            })`,
            returnByValue: true
        });

        console.log("Page state on /mini-profile-setup:", pageState.result?.value);

    } catch(err) {
        console.error(err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
