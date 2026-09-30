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

        console.log("1. Logging out and clearing storage...");
        await send("Runtime.evaluate", {
            expression: `(async () => {
                try {
                    window.localStorage.clear();
                    window.sessionStorage.clear();
                    const SecureStorage = window.Capacitor?.Plugins?.SecureStorage;
                    if (SecureStorage) {
                        const keys = await SecureStorage.keys();
                        for (const k of keys) {
                            await SecureStorage.remove({ key: k }).catch(() => {});
                        }
                    }
                } catch(e) {}
                window.location.href = 'https://localhost/signup';
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 2500));

        const testEmail = `emutest.${Date.now()}@thecollegedate.com`;
        const testPass = "CollegeDate2026!Pass";

        console.log("2. On /signup, filling form for:", testEmail);
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

                const roleMale = Array.from(document.querySelectorAll('button, div, span, label')).find(el => el.textContent?.trim() === 'Male' || el.textContent?.trim() === '?? Male');
                if (roleMale) roleMale.click();

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
        await new Promise(r => setTimeout(r, 4000));

        let currentUrl = (await send("Runtime.evaluate", { expression: "window.location.href", returnByValue: true })).result?.value;
        console.log("URL after signup:", currentUrl);

        if (!currentUrl.includes("mini-profile-setup")) {
            console.log("Not on mini-profile-setup yet, waiting 3s...");
            await new Promise(r => setTimeout(r, 3000));
            currentUrl = (await send("Runtime.evaluate", { expression: "window.location.href", returnByValue: true })).result?.value;
            console.log("URL now:", currentUrl);
        }

        // Now automate MiniProfileSetup
        console.log("3. Automating MiniProfileSetup steps...");
        const setupResult = await send("Runtime.evaluate", {
            expression: `(async () => {
                const logs = [];
                function log(msg) { logs.push(msg); console.log('[Setup Automation]', msg); }

                // Check inputs on step 1
                log('Step 1: Full name and age');
                const nameInput = document.querySelector('input[placeholder*="name" i]') || document.querySelector('input[type="text"]');
                const ageInput = document.querySelector('input[placeholder*="age" i]') || document.querySelector('input[type="number"]');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;

                if (nameInput) {
                    nativeSetter.call(nameInput, 'Emu Tester');
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (ageInput) {
                    nativeSetter.call(ageInput, '22');
                    ageInput.dispatchEvent(new Event('input', { bubbles: true }));
                }

                await new Promise(r => setTimeout(r, 300));
                let nextBtn = document.querySelector('.quiz-next-btn');
                if (nextBtn && !nextBtn.disabled) nextBtn.click();
                else log('Step 1 next button disabled or not found');

                await new Promise(r => setTimeout(r, 800));

                // Step 2: Campus
                log('Step 2: Campus');
                const uniSelect = document.querySelector('select');
                if (uniSelect) {
                    uniSelect.value = 'University of Lagos (UNILAG)';
                    uniSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
                await new Promise(r => setTimeout(r, 300));
                nextBtn = document.querySelector('.quiz-next-btn');
                if (nextBtn && !nextBtn.disabled) nextBtn.click();

                await new Promise(r => setTimeout(r, 800));

                // Step 3: Vibe (Interests)
                log('Step 3: Vibe');
                const interestCards = document.querySelectorAll('.interest-tag, .vibe-chip, .interest-pill, div[class*="interest"]');
                if (interestCards.length > 0) {
                    interestCards[0].click();
                    if (interestCards[1]) interestCards[1].click();
                }
                await new Promise(r => setTimeout(r, 300));
                nextBtn = document.querySelector('.quiz-next-btn');
                if (nextBtn && !nextBtn.disabled) nextBtn.click();

                await new Promise(r => setTimeout(r, 800));

                // Step 4: Intent
                log('Step 4: Intent');
                const intentCards = document.querySelectorAll('.intent-card');
                if (intentCards.length > 0) {
                    intentCards[0].click();
                }
                await new Promise(r => setTimeout(r, 300));
                nextBtn = document.querySelector('.quiz-next-btn');
                if (nextBtn && !nextBtn.disabled) nextBtn.click();

                await new Promise(r => setTimeout(r, 800));

                // Step 5: Photo upload step
                log('Step 5: Photo step reached. Inspecting state before clicking Let\'s Go...');
                
                return { logs, stepText: document.body.innerText.slice(0, 200) };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });

        console.log("Setup progress:", setupResult.result?.value);

    } catch(err) {
        console.error("Error:", err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
