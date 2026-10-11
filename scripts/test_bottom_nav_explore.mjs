import WebSocket from 'ws';
import { execSync } from 'child_process';
import path from 'path';

const ADB = `"${path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe')}" -s emulator-5554`;

async function main() {
    // 1. Auto forward
    const out = execSync(`${ADB} shell "cat /proc/net/unix"`).toString();
    const match = out.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket');
    console.log('Forwarding socket:', match[1]);
    execSync(`${ADB} forward tcp:9222 localabstract:${match[1]}`);

    // 2. Connect
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

    // 1. Click Explore in BottomNav
    console.log('Clicking Explore tab in BottomNav...');
    const clickRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const link = document.querySelector('a[href="/explore"]') || Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Explore'));
            if (link) {
                link.click();
                return 'Clicked Explore link';
            }
            return 'Explore link not found';
        })()`,
        returnByValue: true
    });
    console.log(clickRes.result?.value);

    await new Promise(r => setTimeout(r, 3500));

    // 2. Check cards on Explore
    const cardsRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const cards = Array.from(document.querySelectorAll('.explore-card')).map(c => c.querySelector('.card-info h3')?.innerText);
            return {
                url: window.location.href,
                hasExplore: !!document.querySelector('.explore-page'),
                cardsCount: cards.length,
                cards
            };
        })()`,
        returnByValue: true
    });
    console.log('Explore state:', JSON.stringify(cardsRes.result?.value, null, 2));

    // Capture screenshot
    execSync(`${ADB} exec-out screencap -p > screen_explore_nav.png`);
    console.log('Captured screen_explore_nav.png');

    ws.close();
}

main().catch(console.error);
