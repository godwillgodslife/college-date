import WebSocket from 'ws';

async function evalCDP(expr) {
    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
    if (!page) throw new Error('No page target');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === id) {
                ws.close();
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

async function run() {
    const modalStyle = await evalCDP(`(() => {
        const overlay = document.querySelector('.status-modal-overlay');
        const card = document.querySelector('.status-modal-card');
        if (!overlay) return 'No overlay';
        const cs = window.getComputedStyle(overlay);
        const cardCs = card ? window.getComputedStyle(card) : null;
        return {
            overlayDisplay: cs.display,
            overlayOpacity: cs.opacity,
            overlayVisibility: cs.visibility,
            overlayZIndex: cs.zIndex,
            overlayRect: overlay.getBoundingClientRect(),
            cardRect: card ? card.getBoundingClientRect() : null,
            cardDisplay: cardCs ? cardCs.display : null,
            cardOpacity: cardCs ? cardCs.opacity : null
        };
    })()`);
    console.log('Modal style:', modalStyle);
}

run().catch(console.error);
