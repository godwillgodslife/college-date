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

const networkLogs = [];

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
            networkLogs.push({ status: r.status, statusText: r.statusText, url: r.url });
        }
    }
});

ws.addEventListener('open', async () => {
    try {
        await send('Runtime.enable');
        await send('Network.enable');

        // STEP 0: Identity
        console.log('=== STEP 0: Identity ===');
        const s0 = await send('Runtime.evaluate', {
            expression: `(async () => {
                const nameInput = document.querySelector('input[placeholder*="Name" i]');
                const ageInput = document.querySelector('input[placeholder*="old" i]');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

                nativeSetter.call(nameInput, 'Alex Morgan');
                nameInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(ageInput, '21');
                ageInput.dispatchEvent(new Event('input', { bubbles: true }));

                await new Promise(r => setTimeout(r, 400));
                const nextBtn = document.querySelector('.quiz-next-btn');
                nextBtn.click();
                return { name: nameInput.value, age: ageInput.value };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Step 0 completed:', s0.result?.value);

        await new Promise(r => setTimeout(r, 1200));

        // STEP 1: Campus & Level
        console.log('=== STEP 1: Campus & Level ===');
        const s1 = await send('Runtime.evaluate', {
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
                const nextBtn = document.querySelector('.quiz-next-btn');
                nextBtn.click();
                return { uni: selects[0]?.value, level: selects[1]?.value };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Step 1 completed:', s1.result?.value);

        await new Promise(r => setTimeout(r, 1200));

        // STEP 2: Interests
        console.log('=== STEP 2: Interests ===');
        const s2 = await send('Runtime.evaluate', {
            expression: `(async () => {
                const interestButtons = document.querySelectorAll('.quiz-option-btn, .interest-tag, .interest-btn, div[class*="interest"]');
                console.log('Found interest buttons:', interestButtons.length);
                if (interestButtons[0]) interestButtons[0].click();
                if (interestButtons[1]) interestButtons[1].click();
                if (interestButtons[2]) interestButtons[2].click();
                await new Promise(r => setTimeout(r, 400));
                const nextBtn = document.querySelector('.quiz-next-btn');
                nextBtn.click();
                return { clickedInterests: 3 };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Step 2 completed:', s2.result?.value);

        await new Promise(r => setTimeout(r, 1200));

        // STEP 3: Intent
        console.log('=== STEP 3: Intent ===');
        const s3 = await send('Runtime.evaluate', {
            expression: `(async () => {
                const intentCards = document.querySelectorAll('.intent-card');
                console.log('Found intent cards:', intentCards.length);
                if (intentCards[0]) intentCards[0].click();
                await new Promise(r => setTimeout(r, 400));
                const nextBtn = document.querySelector('.quiz-next-btn');
                nextBtn.click();
                return { clickedIntent: true };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Step 3 completed:', s3.result?.value);

        await new Promise(r => setTimeout(r, 1500));

        // STEP 4: Photo Upload
        console.log('=== STEP 4: Photo Upload ===');
        const uploadRes = await send('Runtime.evaluate', {
            expression: `(async () => {
                const b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
                const res = await fetch(b64);
                const blob = await res.blob();
                const file = new File([blob], "alex_avatar.png", { type: "image/png" });
                const input = document.querySelector('input[type="file"]');
                if (!input) return { error: 'No file input' };
                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return { dispatched: true };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Photo dispatch result:', uploadRes.result?.value);

        console.log('Waiting 6s for photo upload to complete...');
        await new Promise(r => setTimeout(r, 6000));

        const photoStepCheck = await send('Runtime.evaluate', {
            expression: `({
                btnDisabled: document.querySelector('.quiz-next-btn')?.disabled,
                btnText: document.querySelector('.quiz-next-btn')?.innerText,
                toasts: Array.from(document.querySelectorAll('.toast, .auth-error, [role="alert"]')).map(t => t.innerText)
            })`,
            returnByValue: true
        });
        console.log('Photo Step State before finish:', photoStepCheck.result?.value);

        // STEP 5: Click "Let's Go! 🚀"
        console.log('=== STEP 5: Clicking Finish ("Let\'s Go! 🚀") ===');
        const finishClick = await send('Runtime.evaluate', {
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
        console.log('Finish click result:', finishClick.result?.value);

        // Wait 7s to observe network requests, toasts, confetti, and transitions
        console.log('Observing completion (7s)...');
        await new Promise(r => setTimeout(r, 7000));

        const postFinishState = await send('Runtime.evaluate', {
            expression: `({
                url: window.location.href,
                bodyText: document.body.innerText.slice(0, 400),
                toasts: Array.from(document.querySelectorAll('.toast, .auth-error, [role="alert"]')).map(t => t.innerText)
            })`,
            returnByValue: true
        });

        console.log('=== POST FINISH APP STATE ===');
        console.log('URL:', postFinishState.result?.value?.url);
        console.log('Body Text:', postFinishState.result?.value?.bodyText);
        console.log('Toasts Active:', postFinishState.result?.value?.toasts);

        console.log('=== RELEVANT SUPABASE NETWORK CALLS ===');
        for (const log of networkLogs) {
            console.log(`${log.status} ${log.statusText} ${log.url}`);
        }

    } catch (err) {
        console.error('Error during step execution:', err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
