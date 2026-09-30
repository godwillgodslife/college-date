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

const networkRequests = new Map();

ws.addEventListener("message", async (e) => {
    const d = JSON.parse(e.data);
    if (d.method === "Runtime.consoleAPICalled") {
        const args = (d.params.args || []).map(a => a.value || JSON.stringify(a)).join(" ");
        console.log(`[CONSOLE ${d.params.type}]`, args);
    }
    if (d.method === "Runtime.exceptionThrown") {
        console.log(`[EXCEPTION]`, d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text);
    }
    if (d.method === "Network.requestWillBeSent") {
        const req = d.params.request;
        networkRequests.set(d.params.requestId, req);
        if (req.url.includes("supabase.co") || req.url.includes("rest/v1")) {
            console.log(`[REQ] ${req.method} ${req.url}`);
            if (req.postData) console.log(`   Body:`, req.postData.slice(0, 300));
            console.log(`   Headers:`, JSON.stringify(req.headers));
        }
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

        console.log("CLICKING Let's Go! ??...");
        const clickRes = await send("Runtime.evaluate", {
            expression: `(async () => {
                const btn = document.querySelector('.quiz-next-btn');
                if (!btn) return { error: 'No finish button' };
                btn.click();
                return { clicked: true, text: btn.innerText };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });

        console.log("Click result:", clickRes.result?.value);
        await new Promise(r => setTimeout(r, 6000));

        const postFinishState = await send("Runtime.evaluate", {
            expression: `({
                url: window.location.href,
                bodyText: document.body.innerText.slice(0, 300),
                toasts: Array.from(document.querySelectorAll('.toast, .auth-error, [role="alert"]')).map(t => t.innerText)
            })`,
            returnByValue: true
        });

        console.log("Post-finish state:", postFinishState.result?.value);

    } catch(err) {
        console.error("Error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
