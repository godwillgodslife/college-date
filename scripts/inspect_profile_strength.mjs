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

const info = await evalCDP(`
    (() => {
        const els = Array.from(document.querySelectorAll('*')).filter(el => el.innerText && el.innerText.includes('Profile Strength') && el.children.length > 0);
        return els.map(el => ({
            tagName: el.tagName,
            className: el.className,
            bg: window.getComputedStyle(el).backgroundColor
        }));
    })()
`);
console.log('Profile Strength Elements:', info);
ws.close();
