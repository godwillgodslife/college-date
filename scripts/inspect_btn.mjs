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
                btnText: document.querySelector('.quiz-next-btn')?.innerText,
                btnDisabled: document.querySelector('.quiz-next-btn')?.disabled,
                toasts: Array.from(document.querySelectorAll('.toast')).map(t => t.innerText)
            })`,
            returnByValue: true
        } 
    }));
});
ws.addEventListener("message", (e) => {
    console.log("Button & Toast State:", JSON.parse(e.data).result?.result?.value);
    ws.close();
    process.exit(0);
});
