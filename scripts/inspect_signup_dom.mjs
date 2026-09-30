const res = await fetch('http://localhost:9223/json/list');
const targets = await res.json();
const target = targets[0];
const ws = new WebSocket(target.webSocketDebuggerUrl);

function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (e) => {
            const d = JSON.parse(e.data);
            if (d.id === id) {
                ws.removeEventListener('message', handler);
                if (d.error) reject(d.error);
                else resolve(d.result);
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
    });
}

ws.addEventListener('open', async () => {
    await send('Runtime.enable');
    
    // Clear auth and navigate to signup
    await send('Runtime.evaluate', {
        expression: `(async () => {
            window.localStorage.clear();
            window.sessionStorage.clear();
            window.location.href = '/signup';
        })()`,
        awaitPromise: true
    });

    await new Promise(r => setTimeout(r, 2000));

    const domInfo = await send('Runtime.evaluate', {
        expression: `({
            url: window.location.href,
            inputs: Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder, value: i.value })),
            buttons: Array.from(document.querySelectorAll('button')).map(b => ({ text: b.innerText, type: b.type, className: b.className })),
            body: document.body.innerText.slice(0, 500)
        })`,
        returnByValue: true
    });

    console.log('DOM Info:', JSON.stringify(domInfo.result?.value, null, 2));
    ws.close();
    process.exit(0);
});
