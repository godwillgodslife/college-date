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
        if (r.url.includes("supabase.co") || r.url.includes("rest/v1")) {
            console.log(`[NET ${r.status}] ${r.statusText} -> ${r.url}`);
        }
    }
});

ws.addEventListener("open", async () => {
    try {
        await send("Runtime.enable");
        await send("Network.enable");

        console.log("1. Navigating to /login...");
        await send("Runtime.evaluate", { expression: "window.location.href = 'https://localhost/login'" });
        await new Promise(r => setTimeout(r, 2000));

        console.log("2. Filling login form for emutest...");
        await send("Runtime.evaluate", {
            expression: `(async () => {
                const emailInput = document.querySelector('#email');
                const passInput = document.querySelector('#password');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

                nativeSetter.call(emailInput, 'emutest.1788518990283@thecollegedate.com');
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(passInput, 'CollegeDate2026!Pass');
                passInput.dispatchEvent(new Event('input', { bubbles: true }));

                await new Promise(r => setTimeout(r, 300));
                document.querySelector('button[type="submit"]')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 4000));
        let url = (await send("Runtime.evaluate", { expression: "window.location.href", returnByValue: true })).result?.value;
        console.log("URL after login:", url);

        if (!url.includes("mini-profile-setup")) {
            console.log("Waiting 3s...");
            await new Promise(r => setTimeout(r, 3000));
            url = (await send("Runtime.evaluate", { expression: "window.location.href", returnByValue: true })).result?.value;
            console.log("URL now:", url);
        }

        if (url.includes("mini-profile-setup")) {
            console.log("3. Reached mini-profile-setup! Automating to Step 5...");
            await send("Runtime.evaluate", {
                expression: `(async () => {
                    // Fill Step 1
                    const nameInput = document.querySelector('input[placeholder*="name" i]');
                    const ageInput = document.querySelector('input[placeholder*="old" i]');
                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

                    if (nameInput) {
                        nativeSetter.call(nameInput, 'Emu Student');
                        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (ageInput) {
                        nativeSetter.call(ageInput, '21');
                        ageInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    await new Promise(r => setTimeout(r, 300));
                    document.querySelector('.quiz-next-btn')?.click();
                    await new Promise(r => setTimeout(r, 700));

                    // Step 2
                    const uniInput = document.querySelector('input[placeholder*="University" i]');
                    if (uniInput) {
                        uniInput.focus();
                        uniInput.dispatchEvent(new Event('focus', { bubbles: true }));
                        await new Promise(r => setTimeout(r, 300));
                        document.querySelector('.uni-option')?.click();
                        await new Promise(r => setTimeout(r, 300));
                        document.querySelector('.level-btn')?.click();
                        await new Promise(r => setTimeout(r, 300));
                        document.querySelector('.quiz-next-btn')?.click();
                        await new Promise(r => setTimeout(r, 700));
                    }

                    // Step 3
                    const moodBubbles = document.querySelectorAll('.mood-bubble');
                    if (moodBubbles.length > 0) {
                        moodBubbles[0]?.click();
                        moodBubbles[1]?.click();
                        moodBubbles[2]?.click();
                        await new Promise(r => setTimeout(r, 300));
                        document.querySelector('.quiz-next-btn')?.click();
                        await new Promise(r => setTimeout(r, 700));
                    }

                    // Step 4
                    const intentCards = document.querySelectorAll('.intent-card');
                    if (intentCards.length > 0) {
                        intentCards[0]?.click();
                        await new Promise(r => setTimeout(r, 300));
                        document.querySelector('.quiz-next-btn')?.click();
                        await new Promise(r => setTimeout(r, 700));
                    }
                })()`,
                awaitPromise: true
            });

            await new Promise(r => setTimeout(r, 2000));
            const step5 = await send("Runtime.evaluate", {
                expression: `({
                    text: document.body.innerText.slice(0, 300),
                    hasFileInput: !!document.querySelector('input[type="file"]'),
                    finishBtn: document.querySelector('.quiz-next-btn')?.innerText,
                    finishDisabled: document.querySelector('.quiz-next-btn')?.disabled
                })`,
                returnByValue: true
            });
            console.log("Step 5 reached:", step5.result?.value);
        }

    } catch(err) {
        console.error("Error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
