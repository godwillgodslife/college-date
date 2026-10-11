import WebSocket from 'ws';
import { execSync } from 'child_process';
import path from 'path';

async function main() {
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const target = targets.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found');

    const ws = new WebSocket(target.webSocketDebuggerUrl, { headers: { Host: 'localhost' } });
    await new Promise((res, rej) => { ws.on('open', res); ws.on('error', rej); });

    let msgId = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id === id) {
                    ws.off('message', handler);
                    if (msg.error) reject(msg.error);
                    else if (msg.result?.exceptionDetails) reject(msg.result.exceptionDetails);
                    else resolve(msg.result?.result?.value);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    console.log('Navigating to /viewers...');
    await send('Runtime.evaluate', {
        expression: `(() => {
            window.location.href = '/viewers';
            return window.location.href;
        })()`,
        returnByValue: true,
        awaitPromise: true
    });

    ws.close();
}

main().catch(console.error);
