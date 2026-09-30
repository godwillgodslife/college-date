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

        const testEmail = `emutest.${Date.now()}@thecollegedate.com`;
        const testPass = "CollegeDate2026!Pass";

        console.log("Filling form for:", testEmail);
        const fillSignup = await send("Runtime.evaluate", {
            expression: `(async () => {
                const emailInput = document.querySelector('#email');
                const passInput = document.querySelector('#password');
                const confirmInput = document.querySelector('#confirmPassword');
                
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
                
                nativeInputValueSetter.call(emailInput, '${testEmail}');
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeInputValueSetter.call(passInput, '${testPass}');
                passInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeInputValueSetter.call(confirmInput, '${testPass}');
                confirmInput.dispatchEvent(new Event('input', { bubbles: true }));

                const roleBtn = document.querySelector('button.role-btn');
                if (roleBtn) roleBtn.click();

                await new Promise(r => setTimeout(r, 400));
                
                const submitBtn = document.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                    return { status: 'submitted' };
                }
                return { status: 'no_submit_btn' };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });

        console.log("Signup submit result:", fillSignup.result?.value);
        await new Promise(r => setTimeout(r, 5000));

        let currentUrl = (await send("Runtime.evaluate", { expression: "window.location.href", returnByValue: true })).result?.value;
        console.log("URL after signup:", currentUrl);

        if (!currentUrl.includes("mini-profile-setup")) {
            console.log("Waiting 3s for redirect...");
            await new Promise(r => setTimeout(r, 3000));
            currentUrl = (await send("Runtime.evaluate", { expression: "window.location.href", returnByValue: true })).result?.value;
            console.log("URL now:", currentUrl);
        }

    } catch(err) {
        console.error("Error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
