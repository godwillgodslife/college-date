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
        const step2 = await send("Runtime.evaluate", {
            expression: `(async () => {
                function setVal(el, val) {
                    const lastValue = el.value;
                    el.value = val;
                    const tracker = el._valueTracker;
                    if (tracker) tracker.setValue(lastValue);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }

                const uniInput = document.querySelector('input[placeholder*="University" i]');
                setVal(uniInput, 'Lagos');
                await new Promise(r => setTimeout(r, 400));

                const uniOption = document.querySelector('.uni-dropdown-item, .uni-option');
                console.log('Uni option found:', uniOption?.innerText);
                uniOption?.click();
                await new Promise(r => setTimeout(r, 400));

                const levelBtns = document.querySelectorAll('.level-btn');
                console.log('Level buttons found:', levelBtns.length);
                if (levelBtns[0]) levelBtns[0].click();
                await new Promise(r => setTimeout(r, 400));

                const nextBtn = document.querySelector('.quiz-next-btn');
                console.log('Next btn disabled:', nextBtn?.disabled);
                nextBtn?.click();
                await new Promise(r => setTimeout(r, 800));

                return {
                    body: document.body.innerText.slice(0, 200)
                };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log("After step 2:", step2.result?.value);
    } catch(e) {
        console.error(e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
