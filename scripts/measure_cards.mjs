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

    const id = 1;
    ws.send(JSON.stringify({
        id,
        method: 'Runtime.evaluate',
        params: {
            expression: `(() => {
                const v = document.querySelector(".verification-card-permanent");
                const c = document.querySelector(".profile-completion-card");
                return {
                    verification: v ? { height: v.offsetHeight, width: v.offsetWidth } : null,
                    completion: c ? { height: c.offsetHeight, width: c.offsetWidth } : null
                };
            })()`,
            returnByValue: true
        }
    }));

    ws.on('message', data => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 1) {
            console.log('Card Dimensions:', JSON.stringify(msg.result?.result?.value, null, 2));
            ws.close();
            process.exit(0);
        }
    });
}

main().catch(console.error);
