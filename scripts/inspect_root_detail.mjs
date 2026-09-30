const res = await fetch("http://localhost:9223/json/list");
const targets = await res.json();
const target = targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);

ws.addEventListener("open", async () => {
    ws.send(JSON.stringify({ 
        id: 1, 
        method: "Runtime.evaluate", 
        params: { 
            expression: `(() => {
                const root = document.getElementById('root');
                return {
                    childCount: root?.children?.length,
                    innerHTML: root?.innerHTML,
                    outerHTML: root?.outerHTML?.slice(0, 500)
                };
            })()`,
            returnByValue: true
        } 
    }));
});
ws.addEventListener("message", (e) => {
    console.log("Root details:", JSON.parse(e.data).result?.result?.value);
    ws.close();
    process.exit(0);
});
