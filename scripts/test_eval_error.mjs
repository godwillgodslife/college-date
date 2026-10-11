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

// Let's test getDiscoverProfiles in the app's context
const res = await send('Runtime.evaluate', {
    expression: `
        (async () => {
            try {
                // Find supabase client from window or module
                const keys = Object.keys(localStorage);
                return { keys };
            } catch (e) {
                return { error: e.message, stack: e.stack };
            }
        })()
    `,
    returnByValue: true,
    awaitPromise: true
});
console.log('Result:', res?.result?.value);

ws.close();
