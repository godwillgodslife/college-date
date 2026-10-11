import WebSocket from 'ws';
import { execSync } from 'child_process';

async function main() {
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

    await send('Runtime.enable');
    await send('Log.enable');

    const logs = [];
    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Runtime.consoleAPICalled') {
            logs.push({
                type: msg.params.type,
                args: msg.params.args.map(a => a.value || a.description || JSON.stringify(a))
            });
        } else if (msg.method === 'Runtime.exceptionThrown') {
            logs.push({
                type: 'exception',
                desc: msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || '')
            });
        }
    });

    // Clear search first, then search "David"
    await send('Runtime.evaluate', {
        expression: `(async () => {
            const input = document.querySelector('.explore-search-input');
            const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSet.call(input, 'David');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            const submitBtn = document.querySelector('.search-submit-btn');
            submitBtn.click();
        })()`,
        returnByValue: true,
        awaitPromise: true
    });

    await new Promise(r => setTimeout(r, 3000));

    console.log('--- CONSOLE LOGS DURING SEARCH ---');
    logs.forEach(l => console.log(l));

    ws.close();
}

main().catch(console.error);
