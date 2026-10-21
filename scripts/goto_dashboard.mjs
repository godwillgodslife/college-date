import WebSocket from 'ws';

async function main() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    function evalCDP(expr) {
        return new Promise((resolve, reject) => {
            const id = Math.floor(Math.random() * 100000);
            ws.onmessage = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === id) {
                    if (data.error) reject(data.error);
                    else if (data.result?.exceptionDetails) reject(data.result.exceptionDetails);
                    else resolve(data.result?.result?.value);
                }
            };
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: { expression: expr, returnByValue: true, awaitPromise: true }
            }));
        });
    }

    console.log('Navigating to /dashboard via location.href...');
    await evalCDP(`window.location.href = '/dashboard'`);
    await new Promise(r => setTimeout(r, 3500));

    const info = await evalCDP(`(() => {
        return {
            url: window.location.href,
            hero: !!document.querySelector('.dashboard-hero'),
            quests: !!document.querySelector('.campus-quests-card'),
            streak: !!document.querySelector('.dashboard-streak-card'),
            primetime: !!document.querySelector('.campus-primetime-banner'),
            text: document.body.innerText.slice(0, 300)
        };
    })()`);
    console.log('Dashboard Info:', info);
    ws.close();
}

main().catch(console.error);
