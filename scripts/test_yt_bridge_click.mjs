import WebSocket from 'ws';
import { execSync } from 'child_process';
import path from 'path';

async function main() {
    const raw = await (await fetch('http://127.0.0.1:9222/json')).json();
    const target = raw.find(t => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    let id = 1;
    function send(m, p = {}) {
        return new Promise((res, rej) => {
            const cmdId = id++;
            const h = (d) => {
                const msg = JSON.parse(d.toString());
                if (msg.id === cmdId) {
                    ws.off('message', h);
                    if (msg.error) rej(msg.error); else res(msg.result);
                }
            };
            ws.on('message', h);
            ws.send(JSON.stringify({ id: cmdId, method: m, params: p }));
        });
    }

    const clickRes = await send('Runtime.evaluate', {
        expression: `(() => {
            const btn = document.querySelector('.profile-yt-bridge-btn');
            if (btn) {
                btn.click();
                return 'Clicked bridge';
            }
            return 'Button not found';
        })()`,
        returnByValue: true
    });
    console.log('Click result:', clickRes.result?.value);

    await new Promise(r => setTimeout(r, 1500));
    const pathRes = await send('Runtime.evaluate', {
        expression: 'window.location.pathname',
        returnByValue: true
    });
    console.log('Path after click:', pathRes.result?.value);

    // Take screenshot
    const adb = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
    execSync(`"${adb}" -s emulator-5554 shell screencap -p /sdcard/screen.png`);
    execSync(`"${adb}" -s emulator-5554 pull /sdcard/screen.png "C:\\Users\\DELL\\.gemini\\antigravity\\brain\\713edf99-17db-41df-b5ca-20c12a82133c\\dashboard_live_from_yt.png"`);
    console.log('Saved dashboard screenshot');

    ws.close();
}

main().catch(console.error);
