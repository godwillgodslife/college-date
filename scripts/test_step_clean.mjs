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

        console.log("Stepping through onboarding cleanly...");
        const runRes = await send("Runtime.evaluate", {
            expression: `(async () => {
                const logs = [];
                function log(m) { logs.push(m); console.log('[RUN]', m); }

                // Check step
                const stepText = document.querySelector('.quiz-step-title, h1, h2')?.innerText || '';
                log('Initial title: ' + stepText);

                // If on Step 2 (University):
                const uniInput = document.querySelector('input[placeholder*="University" i]');
                if (uniInput) {
                    log('Handling University step');
                    uniInput.focus();
                    uniInput.dispatchEvent(new Event('focus', { bubbles: true }));
                    await new Promise(r => setTimeout(r, 200));

                    const uniOption = document.querySelector('.uni-option');
                    if (uniOption) {
                        log('Clicking uni option: ' + uniOption.innerText);
                        uniOption.click();
                    }
                    await new Promise(r => setTimeout(r, 400));

                    const levelBtn = document.querySelector('.level-btn');
                    if (levelBtn) {
                        log('Clicking level btn: ' + levelBtn.innerText);
                        levelBtn.click();
                    }
                    await new Promise(r => setTimeout(r, 300));
                    document.querySelector('.quiz-next-btn')?.click();
                    await new Promise(r => setTimeout(r, 600));
                }

                // Step 3 (Interests):
                const moodBubbles = document.querySelectorAll('.mood-bubble');
                if (moodBubbles.length > 0) {
                    log('Handling Mood Bubbles step');
                    moodBubbles[0]?.click();
                    moodBubbles[1]?.click();
                    moodBubbles[2]?.click();
                    await new Promise(r => setTimeout(r, 300));
                    document.querySelector('.quiz-next-btn')?.click();
                    await new Promise(r => setTimeout(r, 600));
                }

                // Step 4 (Intent):
                const intentCards = document.querySelectorAll('.intent-card');
                if (intentCards.length > 0) {
                    log('Handling Intent step');
                    intentCards[0]?.click();
                    await new Promise(r => setTimeout(r, 300));
                    document.querySelector('.quiz-next-btn')?.click();
                    await new Promise(r => setTimeout(r, 600));
                }

                // Step 5 (Photos):
                log('Step 5 check: ' + document.body.innerText.slice(0, 200));

                return { logs, bodySnippet: document.body.innerText.slice(0, 300) };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });

        console.log("Run result:", runRes.result?.value);

    } catch(err) {
        console.error("Error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
