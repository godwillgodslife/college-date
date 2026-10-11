import WebSocket from 'ws';
import { execSync } from 'child_process';

const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
const target = JSON.parse(raw).find(t => t.type === 'page');

const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
await new Promise(r => ws.on('open', r));

let id = 1;
function send(method, params = {}) {
    return new Promise((resolve) => {
        const cmdId = id++;
        const handler = (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.id === cmdId) {
                ws.off('message', handler);
                resolve(msg.result);
            }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id: cmdId, method, params }));
    });
}

await send('Console.enable');
await send('Runtime.enable');

const logs = [];
ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.method === 'Console.messageAdded') {
        logs.push(msg.params.message);
    }
});

// Evaluate expression to check errors
const res = await send('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
});
console.log('Current URL:', res?.result?.value);

await new Promise(r => setTimeout(r, 1000));
console.log(`Received ${logs.length} console messages:`);
logs.slice(-20).forEach(l => console.log(`[${l.level}] ${l.text}`));

ws.close();
