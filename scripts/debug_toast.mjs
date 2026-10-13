import WebSocket from 'ws';
import { execSync } from 'child_process';

const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
const targets = JSON.parse(raw);
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
await new Promise(r => ws.on('open', r));

let id = 1;
function send(method, params = {}) {
    return new Promise(res => {
        const cmdId = id++;
        const h = (d) => {
            const msg = JSON.parse(d.toString());
            if (msg.id === cmdId) {
                ws.off('message', h);
                res(msg.result);
            }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: cmdId, method, params }));
    });
}

await send('Runtime.evaluate', { expression: "window.__showNotificationToast('New Mutual Match! 🎉', 'You and Chioma liked each other. Start the conversation!', 'Just now')" });
await new Promise(r => setTimeout(r, 600));

const el = await send('Runtime.evaluate', {
    expression: `(() => {
        const t = document.querySelector('.toast');
        const c = document.querySelector('.toast-container');
        return {
            viewport: { width: window.innerWidth, height: window.innerHeight },
            toastRect: t ? t.getBoundingClientRect() : null,
            containerRect: c ? c.getBoundingClientRect() : null,
            toastClass: t ? t.className : null,
            toastTransform: t ? window.getComputedStyle(t).transform : null
        };
    })()`,
    returnByValue: true
});

console.log('Toast inspect:', el.result.value);
ws.close();
