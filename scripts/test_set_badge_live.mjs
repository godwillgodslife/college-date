import WebSocket from 'ws';

async function main() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) {
        console.error('No page target found');
        return;
    }

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

    const countToSet = parseInt(process.argv[2] || '3', 10);
    console.log(`Setting badge count to ${countToSet}...`);

    const setResult = await send('Runtime.evaluate', {
        expression: `(async () => {
            if (window.Capacitor) {
                const AppBadge = window.Capacitor.registerPlugin('AppBadge');
                try {
                    const res = await AppBadge.set({ count: ${countToSet} });
                    const getRes = await AppBadge.get();
                    return { success: true, setRes: res, getRes };
                } catch (err) {
                    return { success: false, error: err.message };
                }
            }
            return { success: false, error: 'window.Capacitor not found' };
        })()`,
        awaitPromise: true,
        returnByValue: true
    });

    console.log('AppBadge result:', setResult?.result?.value);
    ws.close();
}

main().catch(console.error);
