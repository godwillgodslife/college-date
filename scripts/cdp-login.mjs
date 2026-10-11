// scripts/cdp-login.mjs
// Automate login via CDP

async function login() {
    const pagesRes = await fetch('http://127.0.0.1:9222/json');
    const pages = await pagesRes.json();
    const page = pages.find(p => p.type === 'page');
    if (!page) throw new Error('No page found');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => { ws.onopen = res; });

    function evaluate(expr) {
        return new Promise((resolve, reject) => {
            const id = Math.floor(Math.random() * 100000);
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    resolve(data.result?.result?.value);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: { expression: expr, returnByValue: true, awaitPromise: true }
            }));
        });
    }

    const script = `
        (async () => {
            const emailInput = document.getElementById('email');
            const passInput = document.getElementById('password');
            const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

            if (!emailInput || !passInput) return 'Inputs not found';

            nativeSet.call(emailInput, 'student.tester2026@gmail.com');
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));

            nativeSet.call(passInput, 'CollegeDate2026!VerifiedPass');
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('change', { bubbles: true }));

            const submitBtn = document.querySelector('button[type=\"submit\"].btn-primary');
            if (submitBtn) {
                submitBtn.click();
                return 'Clicked submit';
            }
            return 'Submit button not found';
        })()
    `;

    const res = await evaluate(script);
    console.log('Login trigger result:', res);
    ws.close();
}

login().catch(console.error);
