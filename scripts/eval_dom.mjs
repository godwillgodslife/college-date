import WebSocket from 'ws';
import { execSync } from 'child_process';

const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
const target = JSON.parse(raw).find(t => t.type === 'page');

const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
await new Promise(r => ws.on('open', r));

let id = 1;
function send(method, params = {}) {
    return new Promise(res => {
        const cmdId = id++;
        const handler = (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.id === cmdId) {
                ws.off('message', handler);
                res(msg.result);
            }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id: cmdId, method, params }));
    });
}

const r = await send('Runtime.evaluate', {
    expression: 'document.body.innerHTML',
    returnByValue: true
});
console.log('HTML snippet:\n', r?.result?.value?.slice(0, 800));

const authProfile = await send('Runtime.evaluate', {
    expression: `(() => {
        const key = 'tcd-cache-v2.2.65:[\"auth-profile\",\"1e618bba-9d24-4262-b3c0-1b24b4ff40ff\"]';
        return JSON.parse(localStorage.getItem(key));
    })()`,
    returnByValue: true
});
console.log('Cached Profile:\n', authProfile?.result?.value);

ws.close();
