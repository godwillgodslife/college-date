import fs from 'fs';

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

        const testEmail = 'verify.onboard.' + Date.now() + '@thecollegedate.com';
        const testPassword = 'Password123!Test';
        console.log('Testing fresh signup with:', testEmail);

        // 1. Navigate to signup
        await send('Runtime.evaluate', {
            expression: `(async () => {
                window.localStorage.clear();
                window.sessionStorage.clear();
                window.location.href = '/signup';
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 2500));

        // 2. Perform signup via UI or Supabase client in app context
        const signupRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                const emailInput = document.querySelector('input[type="email"], input[placeholder*="email" i]');
                const passInput = document.querySelector('input[type="password"]');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

                if (emailInput && passInput) {
                    nativeSetter.call(emailInput, '${testEmail}');
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    nativeSetter.call(passInput, '${testPassword}');
                    passInput.dispatchEvent(new Event('input', { bubbles: true }));

                    const genderBtns = document.querySelectorAll('button[type="button"], .role-btn, .gender-btn');
                    if (genderBtns.length > 0) genderBtns[0].click();

                    const submitBtn = document.querySelector('button[type="submit"], .auth-submit-btn, button.btn-primary');
                    if (submitBtn) {
                        submitBtn.click();
                        return { submitted: true };
                    }
                }

                return { submitted: false };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Signup form submission:', signupRes.result?.value);

        // Wait for auth & navigation
        await new Promise(r => setTimeout(r, 4000));

        let currentUrl = await send('Runtime.evaluate', {
            expression: 'window.location.href',
            returnByValue: true
        });
        console.log('Current URL after signup:', currentUrl.result?.value);

        // Step 0: Name & Age
        console.log('=== Step 0: Identity ===');
        await send('Runtime.evaluate', {
            expression: `(async () => {
                const nameInput = document.querySelector('input[placeholder*="name" i]');
                const ageInput = document.querySelector('input[placeholder*="old" i]');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

                if (nameInput) {
                    nativeSetter.call(nameInput, 'Verification User');
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (ageInput) {
                    nativeSetter.call(ageInput, '21');
                    ageInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                await new Promise(r => setTimeout(r, 300));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1000));

        // Step 1: Campus & Level
        console.log('=== Step 1: Campus & Level ===');
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
                await new Promise(r => setTimeout(r, 300));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1000));

        // Step 2: Interests
        console.log('=== Step 2: Interests ===');
        await send('Runtime.evaluate', {
            expression: `(async () => {
                const interestButtons = document.querySelectorAll('.quiz-option-btn, .interest-tag, .interest-btn, div[class*="interest"]');
                if (interestButtons[0]) interestButtons[0].click();
                if (interestButtons[1]) interestButtons[1].click();
                if (interestButtons[2]) interestButtons[2].click();
                await new Promise(r => setTimeout(r, 300));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1000));

        // Step 3: Intent
        console.log('=== Step 3: Intent ===');
        await send('Runtime.evaluate', {
            expression: `(async () => {
                const intentCards = document.querySelectorAll('.intent-card');
                if (intentCards[0]) intentCards[0].click();
                await new Promise(r => setTimeout(r, 300));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1500));

        // Step 4: Photo Upload
        console.log('=== Step 4: Photo Upload ===');
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

        console.log('Waiting for photo upload to process...');
        await new Promise(r => setTimeout(r, 4000));

        // Step 5: Tap Let's Go! 🚀
        console.log('=== Step 5: Tapping Let\'s Go! 🚀 ===');
        const finishRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                const btn = document.querySelector('.quiz-next-btn');
                if (!btn) return { error: 'No finish button found' };
                const text = btn.innerText;
                btn.click();
                return { clicked: true, text };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Finish Button Clicked:', finishRes.result?.value);

        // Wait 6 seconds to observe results
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
        console.error('Error in verification:', err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
