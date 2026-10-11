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

// Find conversation elements
const elements = await send('Runtime.evaluate', {
    expression: `
        (() => {
            const items = document.querySelectorAll('*');
            const found = [];
            for (const el of items) {
                if (el.textContent && el.textContent.includes('Tasha')) {
                    found.push({ tag: el.tagName, className: el.className });
                }
            }
            return found;
        })()
    `,
    returnByValue: true
});
console.log('Tasha elements:', elements?.result?.value);

ws.close();
