import WebSocket from 'ws';

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
    const report = await evalCDP(`(() => {
        const root = document.querySelector('#root');
        return {
            classes: Array.from(document.querySelectorAll('div[class]')).map(d => d.className).slice(0, 25),
            buttons: Array.from(document.querySelectorAll('button')).map(b => ({ text: b.innerText, class: b.className, aria: b.getAttribute('aria-label') })).slice(0, 25)
        };
    })()`);
    console.log(JSON.stringify(report, null, 2));
}

run().catch(console.error);
