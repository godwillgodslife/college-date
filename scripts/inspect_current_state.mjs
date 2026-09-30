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
    expression: 'localStorage.getItem("sb-gedoyoleoscgxgdqszzc-auth-token")',
    returnByValue: true
});
const parsed = JSON.parse(res?.result?.value || '{}');
console.log('Session User Email:', parsed?.user?.email);
console.log('Session User ID:', parsed?.user?.id);
console.log('User Metadata:', parsed?.user?.user_metadata);

const profRes = await send('Runtime.evaluate', {
    expression: '(() => { const k = Object.keys(localStorage).find(x => x.startsWith("persistent_cache:")); return k ? localStorage.getItem(k) : null; })()',
    returnByValue: true
});
console.log('Cache sample:', profRes?.result?.value?.slice(0, 100));

ws.close();
