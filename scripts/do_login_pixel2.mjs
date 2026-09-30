const res = await fetch("http://localhost:9224/json/list");
const targets = await res.json();
const target = targets.find(t => t.type === 'page') || targets[0];
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
        const fillScript = `
            (() => {
                const emailInput = document.querySelector('#email');
                const passInput = document.querySelector('#password');
                const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

                if (!emailInput || !passInput) return { error: 'Inputs not found' };

                nativeSetter.call(emailInput, 'student.tester2026@gmail.com');
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));

                nativeSetter.call(passInput, 'CollegeDate2026!VerifiedPass');
                passInput.dispatchEvent(new Event('input', { bubbles: true }));

                const btn = document.querySelector('button[type="submit"]');
                if (btn) {
                    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
                    return { clicked: true, email: emailInput.value, passLen: passInput.value.length };
                }
                return { error: 'Submit button not found' };
            })()
        `;

        const evalRes = await send('Runtime.evaluate', { expression: fillScript, returnByValue: true });
        console.log('Fill & Click Result:', evalRes.result?.value);

        await new Promise(r => setTimeout(r, 4500));

        const loc = await send('Runtime.evaluate', { expression: 'window.location.href', returnByValue: true });
        console.log('Post-login URL:', loc.result?.value);

        const text = await send('Runtime.evaluate', { expression: 'document.body.innerText.slice(0, 300)', returnByValue: true });
        console.log('Page text:', text.result?.value);
    } catch (e) {
        console.error(e);
    } finally {
        ws.close();
        process.exit(0);
    }
});
