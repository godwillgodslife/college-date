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

        const testEmail = 'brand.new.' + Date.now() + '@thecollegedate.com';
        const testPassword = 'Password123!Test';
        console.log('Testing fresh signup with:', testEmail);

        // 1. Sign out completely and clear all native + browser storage
        const signOutRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                try {
                    const { clearSecureAuthStorage } = await import('/src/lib/secureAuthStorage.js');
                    await clearSecureAuthStorage();
                } catch(e) {}
                window.localStorage.clear();
                window.sessionStorage.clear();
                return { cleared: true };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Storage cleared:', signOutRes.result?.value);

        // 2. Perform fresh signup directly using Supabase JS client within the app's WebView context
        console.log('Performing signup inside WebView context...');
        const appSignUpRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                const { supabase } = await import('/src/lib/supabase.js');
                const { data, error } = await supabase.auth.signUp({
                    email: '${testEmail}',
                    password: '${testPassword}',
                    options: {
                        data: {
                            role: 'Female',
                            full_name: 'Jessica New'
                        }
                    }
                });
                if (error) return { error: error.message };
                return { 
                    user_id: data.user?.id, 
                    session: Boolean(data.session),
                    email: data.user?.email 
                };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('App context signup result:', appSignUpRes.result?.value);

        const newUserId = appSignUpRes.result?.value?.user_id;
        if (!newUserId) {
            throw new Error('Failed to sign up new user in WebView context');
        }

        // 3. Navigate directly to /mini-setup
        await send('Runtime.evaluate', {
            expression: `window.location.href = '/mini-setup'`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 2000));

        // Step 0: Name & Age
        console.log('=== Step 0: Identity ===');
        await send('Runtime.evaluate', {
            expression: `(async () => {
                const nameInput = document.querySelector('input[placeholder*="name" i]');
                const ageInput = document.querySelector('input[placeholder*="old" i]');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

                if (nameInput) {
                    nativeSetter.call(nameInput, 'Jessica New');
                    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (ageInput) {
                    nativeSetter.call(ageInput, '20');
                    ageInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                await new Promise(r => setTimeout(r, 300));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1200));

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
                    selects[1].value = '200 Level';
                    selects[1].dispatchEvent(new Event('change', { bubbles: true }));
                }
                await new Promise(r => setTimeout(r, 300));
                document.querySelector('.quiz-next-btn')?.click();
            })()`,
            awaitPromise: true
        });

        await new Promise(r => setTimeout(r, 1200));

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

        await new Promise(r => setTimeout(r, 1200));

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

        console.log('Waiting for photo upload to complete in storage...');
        await new Promise(r => setTimeout(r, 6000));

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
