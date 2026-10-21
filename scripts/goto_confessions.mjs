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

console.log('Navigating to /confessions via DOM click...');
await evalCDP(`
    (() => {
        const items = Array.from(document.querySelectorAll('.bottom-nav-item, .bottom-nav a, .nav-item'));
        const confessions = items.find(el => el.innerText.includes('Confessions'));
        if (confessions) confessions.click();
    })()
`);
await new Promise(r => setTimeout(r, 2000));
const url = await evalCDP('window.location.href');
console.log('URL:', url);
ws.close();
