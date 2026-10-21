import WebSocket from 'ws';

const res = await fetch('http://127.0.0.1:9222/json');
const pages = await res.json();
const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

function evalCDP(expr) {
    return new Promise((resolve, reject) => {
        const id = 12345;
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

const html = await evalCDP('document.body.innerHTML');
console.log('Body HTML length:', html.length);
console.log('Snippet:', html.slice(0, 400));
const text = await evalCDP('document.body.innerText');
console.log('Text:', text);
ws.close();
