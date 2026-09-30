import fs from 'fs';

async function main() {
    console.log('Connecting to emulator CDP on port 9222...');
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const targets = await listRes.json();
    console.log('Found targets:', targets.map(t => ({ title: t.title, url: t.url, id: t.id })));
    const page = targets.find(t => t.type === 'page') || targets[0];
    if (!page?.webSocketDebuggerUrl) {
        console.error('No debugger url found');
        process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.addEventListener('open', r));

    const errors = [];
    const logs = [];

    ws.addEventListener('message', (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.method === 'Runtime.consoleAPICalled') {
                const args = msg.params.args.map(a => a.value ?? a.description).join(' ');
                logs.push(`[Console ${msg.params.type}] ${args}`);
                if (msg.params.type === 'error') {
                    errors.push(`[Console Error] ${args}`);
                }
            } else if (msg.method === 'Runtime.exceptionThrown') {
                const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
                errors.push(`[Exception] ${desc}`);
            }
        } catch (e) {}
    });

    let msgId = 100;
    function sendCommand(method, params = {}) {
        return new Promise((resolve) => {
            const id = ++msgId;
            const handler = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.id === id) {
                    ws.removeEventListener('message', handler);
                    resolve(msg.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await sendCommand('Runtime.enable');
    await sendCommand('Log.enable');

    async function evalInPage(expr) {
        const res = await sendCommand('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        return res?.result?.value;
    }

    const currentUrl = await evalInPage('window.location.href');
    console.log('Current URL in WebView:', currentUrl);

    // Check localStorage keys
    const lsKeys = await evalInPage('Object.keys(localStorage)');
    console.log('LocalStorage keys:', lsKeys);

    // Check any unhandled errors in window
    const windowErrors = await evalInPage('window.__unhandledErrors || []');
    console.log('Window errors:', windowErrors);

    // Wait 2s to gather console logs
    await new Promise(r => setTimeout(r, 2000));
    console.log('Recent logs (' + logs.length + '):');
    logs.slice(-20).forEach(l => console.log('  ', l));

    if (errors.length > 0) {
        console.log('ERRORS DETECTED (' + errors.length + '):');
        errors.forEach(e => console.error('  !', e));
    } else {
        console.log('No console errors or unhandled exceptions detected so far.');
    }

    ws.close();
}

main().catch(console.error);
