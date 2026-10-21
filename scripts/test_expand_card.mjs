import WebSocket from 'ws';
import { execSync } from 'child_process';

const ADB = `${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`;

async function main() {
    const pid = execSync(`"${ADB}" -s emulator-5554 shell "pidof com.collegedate.app"`).toString().trim();
    execSync(`"${ADB}" -s emulator-5554 forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

    const res = await fetch('http://127.0.0.1:9222/json');
    const tabs = await res.json();
    const tab = tabs.find(t => t.type === 'page' && t.title) || tabs[0];

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(r => { ws.onopen = r; });

    const evalExpr = (expr) => new Promise((resolve) => {
        const id = Math.floor(Math.random() * 100000);
        ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === id) resolve(data.result?.result?.value);
        };
        ws.send(JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: { expression: expr, returnByValue: true, awaitPromise: true }
        }));
    });

    const info = await evalExpr(`(() => {
        const topCard = document.querySelector('.swipe-card.top-card');
        if (!topCard) return { error: 'No topCard' };
        
        // Click the card body to expand
        topCard.click();
        
        return {
            clicked: true,
            isExpanded: topCard.classList.contains('expanded-mode')
        };
    })()`);

    console.log('Expand Result:', info);
    ws.close();
}

main().catch(console.error);
