import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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
await send('Page.enable');

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.method === 'Runtime.consoleAPICalled') {
        const line = `[${msg.params.type}] ` + msg.params.args.map(a => a.value !== undefined ? (typeof a.value === 'object' ? JSON.stringify(a.value) : a.value) : (a.description || '')).join(' ');
        console.log(line);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[UNCAUGHT EXCEPTION]', JSON.stringify(msg.params.exceptionDetails));
    }
});

console.log('Navigating to /match...');
await send('Runtime.evaluate', {
    expression: 'window.__reactNavigate("/match")',
    returnByValue: true
});

await new Promise(r => setTimeout(r, 2000));

const r = await send('Page.captureScreenshot', { format: 'png' });
const targetDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\713edf99-17db-41df-b5ca-20c12a82133c';
fs.writeFileSync(path.join(targetDir, 'match_screen.png'), Buffer.from(r.data, 'base64'));
console.log('Saved match_screen.png');

ws.close();
