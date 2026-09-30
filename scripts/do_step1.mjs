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
        const step1 = await send("Runtime.evaluate", {
            expression: `(async () => {
                const nameInput = document.querySelector('input[placeholder*="name" i]');
                const ageInput = document.querySelector('input[placeholder*="old" i]');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

                nativeSetter.call(nameInput, 'Emu Student');
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(ageInput, '21');
                ageInput.dispatchEvent(new Event('input', { bubbles: true }));

                await new Promise(r => setTimeout(r, 400));
                document.querySelector('.quiz-next-btn')?.click();
                await new Promise(r => setTimeout(r, 600));

                return {
                    body: document.body.innerText.slice(0, 200)
                };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log("After step 1:", step1.result?.value);
    } catch(e) {
        console.error(e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
