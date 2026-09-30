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
                function setVal(el, val) {
                    const lastValue = el.value;
                    el.value = val;
                    const tracker = el._valueTracker;
                    if (tracker) tracker.setValue(lastValue);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }

                const nameInput = document.querySelector('input[placeholder*="name" i]');
                const ageInput = document.querySelector('input[placeholder*="old" i]');

                setVal(nameInput, 'Emu Student');
                setVal(ageInput, '21');

                await new Promise(r => setTimeout(r, 400));
                const btn = document.querySelector('.quiz-next-btn');
                const disabled = btn?.disabled;
                btn?.click();
                await new Promise(r => setTimeout(r, 800));

                return {
                    disabledBeforeClick: disabled,
                    body: document.body.innerText.slice(0, 200)
                };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log("After step 1 with tracker:", step1.result?.value);
    } catch(e) {
        console.error(e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
