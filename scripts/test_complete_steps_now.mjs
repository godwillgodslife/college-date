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

        // STEP 1: Campus & Level
        console.log('=== EXECUTING STEP 1: Campus & Level ===');
        const s1 = await send('Runtime.evaluate', {
            expression: `(async () => {
                const uniInput = document.querySelector('input[placeholder*="University" i]');
                if (!uniInput) return { error: 'No uni input found' };
                
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(uniInput, 'Lagos');
                uniInput.dispatchEvent(new Event('input', { bubbles: true }));
                uniInput.dispatchEvent(new Event('focus', { bubbles: true }));

                await new Promise(r => setTimeout(r, 400));
                const firstOption = document.querySelector('.uni-option');
                if (!firstOption) return { error: 'No uni options rendered' };
                firstOption.click();

                await new Promise(r => setTimeout(r, 400));
                const levelBtns = document.querySelectorAll('.level-btn');
                if (levelBtns.length === 0) return { error: 'No level buttons rendered' };
                levelBtns[1].click(); // Click 200L or 300L

                await new Promise(r => setTimeout(r, 400));
                const nextBtn = document.querySelector('.quiz-next-btn');
                if (!nextBtn || nextBtn.disabled) return { error: 'Next button disabled after level' };
                nextBtn.click();
                return { success: true };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Step 1 result:', s1.result?.value);

        await new Promise(r => setTimeout(r, 1200));

        // STEP 2: Interests (Vibe)
        console.log('=== EXECUTING STEP 2: Interests (Vibe) ===');
        const s2 = await send('Runtime.evaluate', {
            expression: `(async () => {
                const bubbles = document.querySelectorAll('.mood-bubble');
                if (bubbles.length < 3) return { error: 'Fewer than 3 mood bubbles: ' + bubbles.length };
                bubbles[0].click();
                bubbles[1].click();
                bubbles[2].click();

                await new Promise(r => setTimeout(r, 400));
                const nextBtn = document.querySelector('.quiz-next-btn');
                if (!nextBtn || nextBtn.disabled) return { error: 'Next button disabled after interests' };
                nextBtn.click();
                return { success: true, count: 3 };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Step 2 result:', s2.result?.value);

        await new Promise(r => setTimeout(r, 1200));

        // STEP 3: Intent
        console.log('=== EXECUTING STEP 3: Intent ===');
        const s3 = await send('Runtime.evaluate', {
            expression: `(async () => {
                const intentCards = document.querySelectorAll('.intent-card');
                if (intentCards.length === 0) return { error: 'No intent cards found' };
                intentCards[0].click();

                await new Promise(r => setTimeout(r, 400));
                const nextBtn = document.querySelector('.quiz-next-btn');
                if (!nextBtn || nextBtn.disabled) return { error: 'Next button disabled after intent' };
                nextBtn.click();
                return { success: true };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Step 3 result:', s3.result?.value);

        await new Promise(r => setTimeout(r, 1500));

        // STEP 4: Photo Upload
        console.log('=== EXECUTING STEP 4: Photo Upload ===');
        const s4 = await send('Runtime.evaluate', {
            expression: `(async () => {
                const b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
                const res = await fetch(b64);
                const blob = await res.blob();
                const file = new File([blob], "test_profile_pic.png", { type: "image/png" });
                const input = document.querySelector('input[type="file"]');
                if (!input) return { error: 'No file input found' };

                const dt = new DataTransfer();
                dt.items.add(file);
                input.files = dt.files;
                input.dispatchEvent(new Event('change', { bubbles: true }));
                return { dispatched: true };
            })()`,
            returnByValue: true,
            awaitPromise: true
        });
        console.log('Step 4 photo dispatch:', s4.result?.value);

        console.log('Waiting 6s for photo upload to process...');
        await new Promise(r => setTimeout(r, 6000));

        const photoCheck = await send('Runtime.evaluate', {
            expression: `({
                btnDisabled: document.querySelector('.quiz-next-btn')?.disabled,
                btnText: document.querySelector('.quiz-next-btn')?.innerText,
                toasts: Array.from(document.querySelectorAll('.toast')).map(t => t.innerText)
            })`,
            returnByValue: true
        });
        console.log('Photo check state:', photoCheck.result?.value);

        // STEP 5: Click "Let's Go! 🚀"
        console.log('=== EXECUTING STEP 5: TAPPING "Let\'s Go! 🚀" ===');
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
        console.log('Finish button clicked:', finishClick.result?.value);

        // Wait 7s for completion and transitions
        console.log('Waiting 7s for onboarding save and transition...');
        await new Promise(r => setTimeout(r, 7000));

        const finalState = await send('Runtime.evaluate', {
            expression: `({
                url: window.location.href,
                bodyText: document.body.innerText.slice(0, 400),
                toasts: Array.from(document.querySelectorAll('.toast, .auth-error, [role="alert"]')).map(t => t.innerText)
            })`,
            returnByValue: true
        });

        console.log('=== FINAL APPLICATION STATE ===');
        console.log('URL:', finalState.result?.value?.url);
        console.log('Body Text:', finalState.result?.value?.bodyText);
        console.log('Active Toasts:', finalState.result?.value?.toasts);

    } catch (err) {
        console.error('Error during step execution:', err);
    } finally {
        ws.close();
        process.exit(0);
    }
});
