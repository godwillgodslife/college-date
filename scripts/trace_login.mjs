const res = await fetch("http://localhost:9222/json/list");
const targets = await res.json();
const target = targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);

function send(method, params = {}) {
    return new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (e) => {
            const d = JSON.parse(e.data);
            if (d.id === id) {
                ws.removeEventListener('message', handler);
                resolve(d.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.addEventListener('open', async () => {
    try {
        await send('Runtime.enable');
        await send('Log.enable');

        ws.addEventListener('message', (e) => {
            const m = JSON.parse(e.data);
            if (m.method === 'Runtime.consoleAPICalled') {
                console.log(`[CONSOLE ${m.params.type}]`, m.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
            } else if (m.method === 'Runtime.exceptionThrown') {
                console.error(`[EXCEPTION]`, m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
            }
        });

        // Click Sign In
        const triggerRes = await send('Runtime.evaluate', {
            expression: `
                (async () => {
                    const emailInput = document.querySelector('#email');
                    const passInput = document.querySelector('#password');
                    const btn = document.querySelector('button[type="submit"]');

                    if (!emailInput || !passInput || !btn) {
                        return { error: 'Form elements not found' };
                    }

                    // Native value setters
                    const setVal = (el, val) => {
                        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                        setter.call(el, val);
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    };

                    setVal(emailInput, 'student.tester2026@gmail.com');
                    setVal(passInput, 'CollegeDate2026!VerifiedPass');

                    await new Promise(r => setTimeout(r, 400));
                    btn.click();
                    return { clicked: true, email: emailInput.value, passLen: passInput.value.length };
                })()
            `,
            returnByValue: true,
            awaitPromise: true
        });

        console.log('Trigger result:', triggerRes.result?.value);

        // Wait 6 seconds for network & auth
        await new Promise(r => setTimeout(r, 6000));

        const stateRes = await send('Runtime.evaluate', {
            expression: `({
                href: window.location.href,
                toasts: Array.from(document.querySelectorAll('.toast')).map(t => t.innerText),
                body: document.body.innerText.slice(0, 300)
            })`,
            returnByValue: true
        });
        console.log('Post-login UI state:', stateRes.result?.value);

    } catch (e) {
        console.error('Error:', e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
