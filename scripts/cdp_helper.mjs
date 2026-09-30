import WebSocket from 'ws';

export async function evalInPage(expression, customPort = null) {
    const port = customPort || process.env.CDP_PORT || '9223';
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(`http://127.0.0.1:${port}/json`, {
                headers: { Connection: 'close' }
            });
            const targets = await res.json();
            const page = targets.find(t => t.type === 'page');
            if (!page) throw new Error('No page target found');

            return await new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    try { ws.close(); } catch(e) {}
                    reject(new Error('CDP evaluation timed out after 15000ms'));
                }, 15000);

                const ws = new WebSocket(page.webSocketDebuggerUrl, {
                    headers: { Host: 'localhost' }
                });
                const id = 1;

                ws.on('open', () => {
                    ws.send(JSON.stringify({
                        id,
                        method: 'Runtime.evaluate',
                        params: {
                            expression,
                            returnByValue: true,
                            awaitPromise: true
                        }
                    }));
                });

                ws.on('message', (data) => {
                    const msg = JSON.parse(data);
                    if (msg.id === id) {
                        clearTimeout(timer);
                        ws.close();
                        if (msg.error) {
                            reject(msg.error);
                        } else if (msg.result?.exceptionDetails) {
                            reject(msg.result.exceptionDetails);
                        } else {
                            resolve(msg.result?.result?.value);
                        }
                    }
                });

                ws.on('error', (err) => {
                    clearTimeout(timer);
                    reject(err);
                });
            });
        } catch (err) {
            if (attempt === 2) throw err;
            await new Promise(r => setTimeout(r, 1200));
        }
    }
}

if (process.argv[1]?.endsWith('cdp_helper.mjs') && process.argv[2]) {
    let port = '9223';
    let args = process.argv.slice(2);
    const portIdx = args.indexOf('--port');
    if (portIdx !== -1) {
        port = args[portIdx + 1];
        args.splice(portIdx, 2);
    }
    const evalIdx = args.indexOf('--eval');
    if (evalIdx !== -1) {
        args.splice(evalIdx, 1);
    }
    evalInPage(args.join(' '), port)
        .then(val => {
            console.log(typeof val === 'object' ? JSON.stringify(val, null, 2) : val);
            process.exit(0);
        })
        .catch(err => {
            console.error('CDP Error:', err);
            process.exit(1);
        });
}
