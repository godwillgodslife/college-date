const res = await fetch('http://localhost:9223/json/list');
const targets = await res.json();
const target = targets[0];
console.log('Connecting to target:', target.title, target.url);
const ws = new WebSocket(target.webSocketDebuggerUrl);

function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (e) => {
            const d = JSON.parse(e.data);
            if (d.id === id) {
                ws.removeEventListener('message', handler);
                if (d.error) reject(d.error);
                else resolve(d.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.addEventListener('message', (e) => {
    const d = JSON.parse(e.data);
    if (d.method === 'Runtime.consoleAPICalled') {
        const args = (d.params.args || []).map(a => a.value || JSON.stringify(a)).join(' ');
        console.log(`[CONSOLE ${d.params.type}]`, args);
    }
    if (d.method === 'Runtime.exceptionThrown') {
        console.log(`[EXCEPTION]`, d.params.exceptionDetails?.exception?.description || d.params.exceptionDetails?.text);
    }
    if (d.method === 'Network.responseReceived') {
        const r = d.params.response;
        if (r.url.includes('supabase.co') || r.url.includes('rest/v1')) {
            console.log(`[NET ${r.status}] ${r.statusText} -> ${r.url}`);
        }
    }
});

ws.addEventListener('open', async () => {
    try {
        await send('Runtime.enable');
        await send('Network.enable');

        const testEmail = 'real.signup.' + Date.now() + '@thecollegedate.com';
        const testPassword = 'Password123!Test';
        console.log('Signing up brand new account:', testEmail);

        // Fill form fields
        const fillRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                const emailInput = document.querySelector('input[type="email"]');
                const passInput = document.querySelector('input[placeholder*="At least 6" i]');
                const confirmInput = document.querySelector('input[placeholder*="Confirm" i]');
                const roleButtons = document.querySelectorAll('.role-btn');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

                if (!emailInput || !passInput || !confirmInput) {
                    return { error: 'Inputs not found' };
                }

                nativeSetter.call(emailInput, '${testEmail}');
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(passInput, '${testPassword}');
                passInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(confirmInput, '${testPassword}');
                confirmInput.dispatchEvent(new Event('input', { bubbles: true }));

                // Click 'Guy' role
                if (roleButtons.length > 0) roleButtons[0].click();

                await new Promise(r => setTimeout(r, 400));

                const submitBtn = document.querySelector('button[type="submit"].btn-primary');
                if (!submitBtn) return { error: 'Submit button not found' };
                
                submitBtn.click();
                return { submitted: true };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });

        console.log('Form fill and submit result:', fillRes.result?.value);

        // Wait for auth & navigation to /mini-setup
        console.log('Waiting for signup auth completion and navigation...');
        let onMiniSetup = false;
        for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const urlRes = await send('Runtime.evaluate', {
                expression: 'window.location.href',
                returnByValue: true
            });
            const currentUrl = urlRes.result?.value || '';
            console.log(`[Wait ${i + 1}s] URL: ${currentUrl}`);
            if (currentUrl.includes('mini-setup')) {
                onMiniSetup = true;
                break;
            }
        }

        if (!onMiniSetup) {
            console.log('Not on /mini-setup yet, attempting redirect...');
            await send('Runtime.evaluate', {
                expression: 'window.location.href = "/mini-setup"',
                awaitPromise: true
            });
            await new Promise(r => setTimeout(r, 2000));
        }

        // STEP 0: Identity (Full Name & Age)
        console.log('=== STEP 0: Identity ===');
        await send('Runtime.evaluate', {
            expression: `(async () => {
                const nameInput = document.querySelector('input[placeholder*="name" i]');
                const ageInput = document.querySelector('input[placeholder*="old" i]');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

                if (nameInput) {
                    nativeSetter.call(nameInput, 'Alex Morgan');
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (ageInput) {
                    nativeSetter.call(ageInput, '21');
                    ageInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                await new Promise(r => setTimeout(r, 400));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1200));

        // STEP 1: Campus & Level
        console.log('=== STEP 1: Campus & Level ===');
        await send('Runtime.evaluate', {
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

        // STEP 2: Interests
        console.log('=== STEP 2: Interests ===');
        await send('Runtime.evaluate', {
            expression: `(async () => {
                const interestButtons = document.querySelectorAll('.quiz-option-btn, .interest-tag, .interest-btn, div[class*="interest"]');
                if (interestButtons[0]) interestButtons[0].click();
                if (interestButtons[1]) interestButtons[1].click();
                if (interestButtons[2]) interestButtons[2].click();
                await new Promise(r => setTimeout(r, 400));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1200));

        // STEP 3: Intent
        console.log('=== STEP 3: Intent ===');
        await send('Runtime.evaluate', {
            expression: `(async () => {
                const intentCards = document.querySelectorAll('.intent-card');
                if (intentCards[0]) intentCards[0].click();
                await new Promise(r => setTimeout(r, 400));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1500));

        // STEP 4: Photo Upload
        console.log('=== STEP 4: Photo Upload ===');
        await send('Runtime.evaluate', {
            expression: `(async () => {
                const b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
                const res = await fetch(b64);
                const blob = await res.blob();
                const file = new File([blob], "test_avatar.png", { type: "image/png" });
                const input = document.querySelector('input[type="file"]');
                if (input) {
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    input.files = dt.files;
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            })()`,
            awaitPromise: true
        });

        console.log('Waiting 6s for photo upload to finish...');
        await new Promise(r => setTimeout(r, 6000));

        // Inspect photo step state before clicking Let's Go!
        const step4State = await send('Runtime.evaluate', {
            expression: `({
                btnDisabled: document.querySelector('.quiz-next-btn')?.disabled,
                btnText: document.querySelector('.quiz-next-btn')?.innerText,
                toasts: Array.from(document.querySelectorAll('.toast, .auth-error, [role="alert"]')).map(t => t.innerText)
            })`,
            returnByValue: true
        });
        console.log('Step 4 state before click:', step4State.result?.value);

        // STEP 5: Click Let's Go! 🚀
        console.log('=== STEP 5: Clicking Finish ("Let\'s Go! 🚀") ===');
        const finishRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                const btn = document.querySelector('.quiz-next-btn');
                if (!btn) return { error: 'No button found' };
                const text = btn.innerText;
                btn.click();
                return { clicked: true, text };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Finish Click Result:', finishRes.result?.value);

        // Wait 6 seconds for onboarding completion & transitions
        await new Promise(r => setTimeout(r, 6000));

        const finalState = await send('Runtime.evaluate', {
            expression: `({
                url: window.location.href,
                bodyText: document.body.innerText.slice(0, 400),
                toasts: Array.from(document.querySelectorAll('.toast, .auth-error, [role="alert"]')).map(t => t.innerText)
            })`,
            returnByValue: true
        });

        console.log('Final Application State:', finalState.result?.value);

    } catch (err) {
        console.error('Error during execution:', err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
