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
                expression: 'JSON.stringify(Array.from(document.querySelectorAll("button")).map((b, i) => ({ i, text: b.innerText.trim(), visible: b.offsetParent !== null })))',
                returnByValue: true
            }
        }));
    });
    ws.on('message', (data) => {
        const val = JSON.parse(data.toString()).result?.result?.value;
        console.log('Buttons:', JSON.parse(val));
        ws.close();
    });
}
main();
