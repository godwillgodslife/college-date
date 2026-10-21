import WebSocket from 'ws';

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function evalCDP(expr) {
    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
    if (!page) throw new Error('No page target');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === id) {
                ws.close();
                if (data.error) reject(data.error);
                else if (data.result?.exceptionDetails) reject(data.result.exceptionDetails);
                else resolve(data.result?.result?.value);
            }
        };
        ws.send(JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
    });
}

async function run() {
    console.log('Filling login form...');
    const res = await evalCDP(`(() => {
        const email = document.querySelector('input[type="email"]');
        const pw = document.querySelector('input[type="password"]');
        if (!email || !pw) return 'Inputs not found';

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(email, 'student.tester2026@gmail.com');
        email.dispatchEvent(new Event('input', { bubbles: true }));
        email.dispatchEvent(new Event('change', { bubbles: true }));

        nativeSetter.call(pw, 'CollegeDate2026!VerifiedPass');
        pw.dispatchEvent(new Event('input', { bubbles: true }));
        pw.dispatchEvent(new Event('change', { bubbles: true }));

        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In'));
        if (btn) {
            btn.click();
            return 'Sign In clicked!';
        }
        return 'Button not found';
    })()`);
    console.log('Result:', res);

    await sleep(4000);
    const after = await evalCDP('window.location.href');
    console.log('After login URL:', after);
}

run().catch(console.error);
