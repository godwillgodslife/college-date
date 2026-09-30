const res = await fetch("http://localhost:9223/json/list");
const targets = await res.json();
const target = targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);

ws.addEventListener("open", async () => {
    ws.send(JSON.stringify({ 
        id: 1, 
        method: "Runtime.evaluate", 
        params: { 
            expression: `({
                href: window.location.href,
                pathname: window.location.pathname,
                bodyText: document.body.innerText.slice(0, 300)
            })`,
            returnByValue: true
        } 
    }));
});
ws.addEventListener("message", (e) => {
    console.log("Current state:", JSON.parse(e.data).result?.result?.value);
    ws.close();
    process.exit(0);
});
