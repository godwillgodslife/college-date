import WebSocket from 'ws';

async function main() {
    const res = await fetch('http://localhost:9222/json');
    const tabs = await res.json();
    const tab = tabs.find(t => t.url.includes('gamification-lab')) || tabs[0];
    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    ws.on('open', () => {
        ws.send(JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: {
                expression: `
                    new Promise(resolve => {
                        const closeBtn = document.querySelector('.mini-game-btn-close');
                        if (closeBtn) closeBtn.click();
                        
                        setTimeout(() => {
                            const endorseBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Endorse Amaka') || b.innerText.includes('+ Endorse'));
                            if (!endorseBtn) return resolve('endorseBtn not found');
                            endorseBtn.click();
                            setTimeout(() => {
                                resolve({
                                    foundSheet: !!document.querySelector('.endorse-vibe-sheet'),
                                    badgeCount: document.querySelectorAll('.endorse-badge-card').length
                                });
                            }, 300);
                        }, 300);
                    })
                `,
                awaitPromise: true,
                returnByValue: true
            }
        }));
    });
    ws.on('message', (data) => {
        console.log('Result:', JSON.parse(data.toString()).result?.result?.value);
        ws.close();
    });
}
main();
