import http from 'http';

function getTargets() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

async function main() {
    const targets = await getTargets();
    const page = targets.find(t => t.type === 'page') || targets[0];
    if (!page?.webSocketDebuggerUrl) {
        console.error('No page target found');
        process.exit(1);
    }

    console.log('Connecting to target:', page.title, page.url);
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });

    let msgId = 1000;
    function call(method, params = {}) {
        return new Promise((resolve) => {
            const id = ++msgId;
            const onMsg = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.id === id) {
                    ws.removeEventListener('message', onMsg);
                    resolve(msg.result);
                }
            };
            ws.addEventListener('message', onMsg);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    ws.addEventListener('message', (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.method === 'Runtime.consoleAPICalled') {
                const text = msg.params.args.map(a => a.value ?? a.description).join(' ');
                console.log(`[WebView Console ${msg.params.type}]`, text);
            } else if (msg.method === 'Runtime.exceptionThrown') {
                console.error(`[WebView Exception]`, msg.params.exceptionDetails?.text, msg.params.exceptionDetails?.exception?.description);
            }
        } catch {}
    });

    await call('Runtime.enable');
    await call('Log.enable');

    async function evalCode(expression) {
        const res = await call('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        return res?.result?.value;
    }

    console.log('--- Current Location ---');
    console.log(await evalCode('window.location.href'));

    console.log('--- Navigating to /login via React Router ---');
    await evalCode(`
        (function() {
            window.location.hash = '';
            window.history.pushState({}, '', '/login');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()
    `);

    await new Promise(r => setTimeout(r, 1500));
    console.log('Location after router push:', await evalCode('window.location.href'));

    console.log('--- Checking Form Fields on /login ---');
    const hasInputs = await evalCode(`
        ({
            hasEmail: Boolean(document.querySelector('input[type="email"]')),
            hasPassword: Boolean(document.querySelector('input[type="password"]')),
            hasSubmit: Boolean(document.querySelector('button[type="submit"]')),
            bodyText: document.body.innerText.slice(0, 200)
        })
    `);
    console.log('Login form elements:', hasInputs);

    if (hasInputs.hasEmail) {
        console.log('--- Submitting Login Form with Verified Test Account ---');
        const loginResult = await evalCode(`
            (async function() {
                const emailInput = document.querySelector('input[type="email"]');
                const passInput = document.querySelector('input[type="password"]');
                const form = document.querySelector('form');

                if (!emailInput || !passInput) return { success: false, reason: 'Inputs not found' };

                // Set values using standard React property descriptors
                const setVal = (input, val) => {
                    const proto = Object.getPrototypeOf(input);
                    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
                    desc.set.call(input, val);
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                };

                setVal(emailInput, 'student.tester2026@gmail.com');
                setVal(passInput, 'CollegeDate2026!VerifiedPass');

                await new Promise(r => setTimeout(r, 400));

                const submitBtn = document.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.click();
                    return { success: true, submittedVia: 'button' };
                } else if (form) {
                    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    return { success: true, submittedVia: 'form' };
                }
                return { success: false, reason: 'No submit element' };
            })()
        `);
        console.log('Submission result:', loginResult);

        // Wait for Supabase login & auth redirect
        console.log('Waiting for auth completion and navigation...');
        for (let i = 0; i < 10; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const currentUrl = await evalCode('window.location.href');
            console.log(`[${i+1}s] Current URL: ${currentUrl}`);
            if (currentUrl.includes('/dashboard') || currentUrl.includes('/mini-profile-setup')) {
                console.log('Successfully navigated to authenticated route:', currentUrl);
                break;
            }
        }
    }

    console.log('Final URL:', await evalCode('window.location.href'));
    const authState = await evalCode(`
        (function() {
            const keys = Object.keys(localStorage);
            const authKey = keys.find(k => k.includes('auth-token') || k.includes('supabase.auth.token'));
            return {
                keysFound: keys.length,
                authKeyPresent: Boolean(authKey),
                authKeyName: authKey,
                currentPath: window.location.pathname
            };
        })()
    `);
    console.log('Auth storage status:', authState);

    ws.close();
}

main().catch(console.error);
