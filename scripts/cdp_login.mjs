const port = process.env.CDP_PORT || "9223";
const res = await fetch(`http://localhost:${port}/json/list`);
const targets = await res.json();
const target = targets[0];
if (!target) {
    console.error("No DevTools target found");
    process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
let id = 1;

function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
        const cmdId = id++;
        const handler = (event) => {
            const data = JSON.parse(event.data);
            if (data.id === cmdId) {
                ws.removeEventListener("message", handler);
                if (data.error) reject(data.error);
                else resolve(data.result);
            }
        };
        ws.addEventListener("message", handler);
        ws.send(JSON.stringify({ id: cmdId, method, params }));
    });
}

ws.addEventListener("open", async () => {
    try {
        const loginScript = `
            (async () => {
                const passInput = document.querySelector('#new-password');
                const confirmInput = document.querySelector('#confirm-password');
                const submitBtn = document.querySelector('button[type="submit"]');

                if (!passInput || !confirmInput || !submitBtn) {
                    return { error: "Inputs not found", pass: !!passInput, confirm: !!confirmInput, btn: !!submitBtn };
                }

                const setValue = (el, value) => {
                    const proto = Object.getPrototypeOf(el);
                    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
                    setter.call(el, value);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                };

                setValue(passInput, 'CollegeDate2026!VerifiedPass');
                setValue(confirmInput, 'CollegeDate2026!VerifiedPass');

                await new Promise(r => setTimeout(r, 200));
                submitBtn.click();
                return { success: true, btnText: submitBtn.innerText };
            })()
        `;

        const result = await sendCommand("Runtime.evaluate", {
            expression: loginScript,
            returnByValue: true,
            awaitPromise: true
        });
        console.log("Login trigger result:", JSON.stringify(result.result?.value, null, 2));

        // Wait 3 seconds and check location
        await new Promise(r => setTimeout(r, 3500));
        const locResult = await sendCommand("Runtime.evaluate", {
            expression: "window.location.href",
            returnByValue: true
        });
        console.log("Current location:", locResult.result?.value);
    } catch (err) {
        console.error("Evaluation error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
