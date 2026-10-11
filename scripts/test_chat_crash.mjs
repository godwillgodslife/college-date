import WebSocket from 'ws';

async function main() {
    const targets = await fetch('http://localhost:9222/json').then(r => r.json());
    const page = targets.find(t => t.type === 'page');
    if (!page) {
        console.error('No page found');
        return;
    }
    const ws = new WebSocket(page.webSocketDebuggerUrl);
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

    const consoleLogs = [];
    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Console.messageAdded') {
            consoleLogs.push(msg.params.message);
        }
        if (msg.method === 'Runtime.exceptionThrown') {
            consoleLogs.push({
                level: 'exception',
                text: msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text
            });
        }
    });

    console.log('Clicking .back-btn...');
    const backRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const backBtn = document.querySelector('.back-btn');
            if (backBtn) {
                backBtn.click();
                return 'Clicked .back-btn!';
            }
            return 'Could not find .back-btn';
        })()`,
        returnByValue: true
    });
    console.log('Back button result:', backRes?.result?.value);

    await new Promise(r => setTimeout(r, 2000));

    // Check state after back button
    const stateRes = await send('Runtime.evaluate', {
        expression: `(() => {
            return {
                lastError: sessionStorage.getItem('tcd_last_error'),
                hasErrorBoundary: Boolean(document.querySelector('.error-boundary, .error-page')),
                url: window.location.href,
                bodySnippet: document.body.innerText.slice(0, 300)
            };
        })()`,
        returnByValue: true
    });
    console.log('State after back button:', JSON.stringify(stateRes?.result?.value, null, 2));

    console.log('Captured Console logs / exceptions (' + consoleLogs.length + '):');
    consoleLogs.forEach(l => console.log(`[${l.level}] ${l.text}`));

    ws.close();
}

main().catch(console.error);
