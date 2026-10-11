import WebSocket from 'ws';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const res = await fetch('http://127.0.0.1:9222/json');
const targets = await res.json();
const target = targets.find(t => t.type === 'page');

const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
await new Promise(r => ws.on('open', r));

let id = 1;
function send(method, params = {}) {
    return new Promise((resolve, reject) => {
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

await send('Page.enable');
const filename = process.argv[2] || 'current_live.png';
const r = await send('Page.captureScreenshot', { format: 'png' });
const targetDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\713edf99-17db-41df-b5ca-20c12a82133c';
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
const targetPath = path.join(targetDir, filename);
fs.writeFileSync(targetPath, Buffer.from(r.data, 'base64'));
console.log(`Saved screenshot: ${targetPath}`);
ws.close();
