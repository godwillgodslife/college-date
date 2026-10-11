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
            ws.on('message', function handler(data) {
                const msg = JSON.parse(data.toString());
                if (msg.id === cmdId) { ws.off('message', handler); resolve(msg.result); }
            });
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            return {
                url: window.location.href,
                bodyText: document.body.innerText.slice(0, 500),
                hasExplorePage: !!document.querySelector('.explore-page'),
                hasHiddenBanner: !!document.querySelector('.hidden-profile-banner'),
                hasLoadingSpinner: !!document.querySelector('.loading-spinner'),
                emptyText: document.querySelector('.empty-discovery')?.innerText
            };
        })()`,
        returnByValue: true
    });

    console.log('Page render state:', JSON.stringify(res.result?.value, null, 2));
    ws.close();
}

main().catch(console.error);
