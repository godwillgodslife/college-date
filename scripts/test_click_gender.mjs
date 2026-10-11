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

console.log('Finding and clicking Women button...');
const res = await send('Runtime.evaluate', {
    expression: `
        (() => {
            const btns = Array.from(document.querySelectorAll('.discover-rail-btn'));
            const womenBtn = btns.find(b => b.innerText.includes('Women') || b.innerText.includes('Men') || b.innerText.includes('All'));
            if (womenBtn) {
                womenBtn.click();
                return 'Clicked ' + womenBtn.innerText;
            }
            return 'Button not found';
        })()
    `,
    returnByValue: true
});
console.log('Click result:', res?.result?.value);

await new Promise(r => setTimeout(r, 1000));

// Check if gender quick menu is in DOM and where it is positioned!
const menuInfo = await send('Runtime.evaluate', {
    expression: `
        (() => {
            const menu = document.querySelector('.gender-quick-menu');
            if (!menu) return 'Menu not in DOM';
            const rect = menu.getBoundingClientRect();
            return {
                inDOM: true,
                rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, visible: rect.width > 0 && rect.height > 0 },
                parentOverflow: window.getComputedStyle(menu.parentElement).overflow,
                text: menu.innerText
            };
        })()
    `,
    returnByValue: true
});
console.log('Menu info:', menuInfo?.result?.value);

const r = await send('Page.captureScreenshot', { format: 'png' });
const targetDir = 'C:\\Users\\DELL\\.gemini\antigravity\\brain\\713edf99-17db-41df-b5ca-20c12a82133c';
fs.writeFileSync(path.join(targetDir, 'after_click_women.png'), Buffer.from(r.data, 'base64'));
console.log('Saved after_click_women.png');

ws.close();
