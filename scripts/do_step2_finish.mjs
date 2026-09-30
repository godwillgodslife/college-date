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
        const step2Finish = await send("Runtime.evaluate", {
            expression: `(async () => {
                const levelBtns = document.querySelectorAll('.level-btn');
                if (levelBtns[0]) levelBtns[0].click();
                await new Promise(r => setTimeout(r, 400));
                document.querySelector('.quiz-next-btn')?.click();
                await new Promise(r => setTimeout(r, 800));
                return {
                    body: document.body.innerText.slice(0, 200)
                };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log("After clicking level:", step2Finish.result?.value);
    } catch(e) {
        console.error(e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
