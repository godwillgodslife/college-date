import WebSocket from 'ws';

const res = await fetch('http://127.0.0.1:9222/json');
const pages = await res.json();
const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

function evalCDP(expr) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === id) {
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

console.log('Submitting login form in webview...');
const result = await evalCDP(`
    (() => {
        const emailInput = document.querySelector('input[type="email"]');
        const pwInput = document.querySelector('input[type="password"]');
        if (!emailInput || !pwInput) return 'Inputs not found';

        const setVal = (el, val) => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        };

        setVal(emailInput, 'student.tester2026@gmail.com');
        setVal(pwInput, 'CollegeDate2026!VerifiedPass');

        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In'));
        if (!btn) return 'Sign in button not found';
        btn.click();
        return 'Sign in clicked!';
    })()
`);
console.log('Login action:', result);

// Wait for redirect
await new Promise(r => setTimeout(r, 4000));
const urlAfter = await evalCDP('window.location.href');
console.log('URL after login:', urlAfter);
const textAfter = await evalCDP('document.body.innerText.slice(0, 200)');
console.log('Text after login:', textAfter);

ws.close();
