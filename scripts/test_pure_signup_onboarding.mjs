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

const recordedNetwork = [];

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
            recordedNetwork.push({ status: r.status, url: r.url });
        }
    }
});

ws.addEventListener('open', async () => {
    try {
        await send('Runtime.enable');
        await send('Network.enable');

        const testEmail = 'pure.signup.' + Date.now() + '@thecollegedate.com';
        const testPassword = 'Password123!Test';
        console.log('--- STARTING PURE SIGNUP ONBOARDING TEST ---');
        console.log('New User Email:', testEmail);

        // 1. Navigate to /signup with clean storage
        console.log('Clearing storage and navigating to /signup...');
        await send('Runtime.evaluate', {
            expression: `(() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/signup';
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 2000));

        // 2. Fill in signup form
        console.log('Filling in Signup form...');
        const fillResult = await send('Runtime.evaluate', {
            expression: `(async () => {
                const emailInput = document.querySelector('input[type="email"]');
                const passInput = document.querySelector('input[placeholder*="At least 6" i]');
                const confirmInput = document.querySelector('input[placeholder*="Confirm" i]');
                const roleButtons = document.querySelectorAll('.role-btn');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

                if (!emailInput || !passInput || !confirmInput) {
                    return { error: 'Inputs missing' };
                }

                nativeSetter.call(emailInput, '${testEmail}');
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(passInput, '${testPassword}');
                passInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(confirmInput, '${testPassword}');
                confirmInput.dispatchEvent(new Event('input', { bubbles: true }));

                if (roleButtons.length > 0) roleButtons[0].click(); // Select Guy

                await new Promise(r => setTimeout(r, 400));

                const submitBtn = document.querySelector('button[type="submit"].btn-primary');
                if (!submitBtn) return { error: 'Submit button missing' };
                submitBtn.click();
                return { submitted: true };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Signup form submitted:', fillResult.result?.value);

        // 3. Wait for navigation to /mini-setup
        console.log('Waiting for onboarding navigation...');
        let onSetup = false;
        for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const urlRes = await send('Runtime.evaluate', {
                expression: 'window.location.href',
                returnByValue: true
            });
            const url = urlRes.result?.value || '';
            console.log(`[Wait ${i + 1}s] URL: ${url}`);
            if (url.includes('mini-profile-setup') || url.includes('mini-setup')) {
                onSetup = true;
                break;
            }
        }

        if (!onSetup) {
            throw new Error('Did not reach /mini-profile-setup after signup');
        }

        await new Promise(r => setTimeout(r, 1000));

        // 4. Step 0: Name & Age
        console.log('=== Step 0: Full Name & Age ===');
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
                await new Promise(r => setTimeout(r, 300));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1200));

        // 5. Step 1: Campus & Level
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

        await new Promise(r => setTimeout(r, 1200));

        // 6. Step 2: Interests
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

        await new Promise(r => setTimeout(r, 1200));

        // 7. Step 3: Intent
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

        // 8. Step 4: Photo Upload
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

        console.log('Waiting 5 seconds for photo upload to process...');
        await new Promise(r => setTimeout(r, 5000));

        const photoState = await send('Runtime.evaluate', {
            expression: `({
                btnDisabled: document.querySelector('.quiz-next-btn')?.disabled,
                btnText: document.querySelector('.quiz-next-btn')?.innerText,
                hasVerifyBox: !!document.querySelector('.onboarding-verify-box'),
                verifyBoxText: document.querySelector('.onboarding-verify-box')?.innerText,
                toasts: Array.from(document.querySelectorAll('.toast, .auth-error, [role="alert"]')).map(t => t.innerText)
            })`,
            returnByValue: true
        });
        console.log('Step 4 state before Let\'s Go! click:', photoState.result?.value);

        await send('Page.enable');
        const s4Snap = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\a3d414a0-3923-40a1-bbc5-86db2aad6abf\\verify_05_onboarding_step4_face_verify.png', Buffer.from(s4Snap.data, 'base64'));
        console.log('Saved verify_05_onboarding_step4_face_verify.png');

        // Open Face Verification modal on Step 4
        console.log('Opening Face Verification modal on Step 4...');
        await send('Runtime.evaluate', {
            expression: `document.querySelector('.onboarding-verify-btn')?.click()`,
            awaitPromise: true
        });
        await new Promise(r => setTimeout(r, 1200));

        const modalSnap = await send('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\a3d414a0-3923-40a1-bbc5-86db2aad6abf\\verify_06_onboarding_face_verify_modal.png', Buffer.from(modalSnap.data, 'base64'));
        console.log('Saved verify_06_onboarding_face_verify_modal.png');

        // Close modal
        await send('Runtime.evaluate', {
            expression: `document.querySelector('.face-verify-close')?.click()`,
            awaitPromise: true
        });
        await new Promise(r => setTimeout(r, 600));

        // 9. Step 5: Tapping "Let's Go! 🚀"
        console.log('=== Step 5: TAPPING LET\'S GO! 🚀 ===');
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
        console.log('Finish click dispatched:', finishRes.result?.value);

        // Wait 6 seconds for completion
        console.log('Waiting 6s for onboarding completion & transitions...');
        await new Promise(r => setTimeout(r, 6000));

        const finalState = await send('Runtime.evaluate', {
            expression: `({
                url: window.location.href,
                bodyText: document.body.innerText.slice(0, 400),
                toasts: Array.from(document.querySelectorAll('.toast, .auth-error, [role="alert"]')).map(t => t.innerText)
            })`,
            returnByValue: true
        });

        console.log('=== FINAL APP STATE ===');
        console.log('URL:', finalState.result?.value?.url);
        console.log('Body Text Preview:', finalState.result?.value?.bodyText);
        console.log('Toasts Active:', finalState.result?.value?.toasts);

    } catch (err) {
        console.error('Error during pure signup test:', err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
