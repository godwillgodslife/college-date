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
        console.log(`[NET ${r.status}] ${r.statusText} -> ${r.url}`);
    }
});

ws.addEventListener("open", async () => {
    try {
        await send("Runtime.enable");
        await send("Network.enable");

        console.log("=== STEP 1: Name & Age ===");
        await send("Runtime.evaluate", {
            expression: `(async () => {
                const nameInput = document.querySelector('input[placeholder*="name" i]');
                const ageInput = document.querySelector('input[placeholder*="old" i]');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

                nativeSetter.call(nameInput, 'Onboard Tester');
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(ageInput, '21');
                ageInput.dispatchEvent(new Event('input', { bubbles: true }));

                await new Promise(r => setTimeout(r, 400));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1200));

        console.log("=== STEP 2: University & Level ===");
        await send("Runtime.evaluate", {
            expression: `(async () => {
                const selects = document.querySelectorAll('select');
                if (selects[0]) {
                    selects[0].value = 'University of Lagos (UNILAG)';
                    selects[0].dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (selects[1]) {
                    selects[1].value = '300 Level';
                    selects[1].dispatchEvent(new Event('change', { bubbles: true }));
                }
                await new Promise(r => setTimeout(r, 400));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1200));

        console.log("=== STEP 3: Vibe (Interests) ===");
        await send("Runtime.evaluate", {
            expression: `(async () => {
                const interestButtons = document.querySelectorAll('.quiz-option-btn, .interest-tag, .interest-btn, div[class*="interest"]');
                console.log('Found interest buttons:', interestButtons.length);
                if (interestButtons[0]) interestButtons[0].click();
                if (interestButtons[1]) interestButtons[1].click();
                if (interestButtons[2]) interestButtons[2].click();
                await new Promise(r => setTimeout(r, 400));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1200));

        console.log("=== STEP 4: Intent ===");
        await send("Runtime.evaluate", {
            expression: `(async () => {
                const intentCards = document.querySelectorAll('.intent-card');
                console.log('Found intent cards:', intentCards.length);
                if (intentCards[0]) intentCards[0].click();
                await new Promise(r => setTimeout(r, 400));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1200));

        console.log("=== STEP 5: Photo upload & Finish ===");
        const step5State = await send("Runtime.evaluate", {
            expression: `({
                stepText: document.body.innerText.slice(0, 300),
                buttons: Array.from(document.querySelectorAll('button')).map(b => b.innerText)
            })`,
            returnByValue: true
        });
        console.log("Step 5 State:", step5State.result?.value);

    } catch(err) {
        console.error("Error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
