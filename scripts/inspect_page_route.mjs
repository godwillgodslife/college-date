const list = await (await fetch('http://127.0.0.1:9222/json')).json();
const target = list.find(t => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 1;
function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const mid = id++;
        const h = (e) => {
            const d = JSON.parse(e.data);
            if (d.id === mid) {
                ws.removeEventListener('message', h);
                resolve(d.result);
            }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id: mid, method, params }));
    });
}
await send('Runtime.enable');
const res = await send('Runtime.evaluate', {
    expression: 'window.location.pathname',
    returnByValue: true
});
console.log('Current Pathname:', res?.result?.value);
ws.close();
