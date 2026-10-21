import WebSocket from 'ws';
import { execSync } from 'node:child_process';
import path from 'node:path';

const adbPath = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'platform-tools', 'adb.exe');
const ADB = `"${adbPath}" -s emulator-5554`;

async function main() {
    const pid = execSync(`${ADB} shell pidof com.collegedate.app`).toString().trim();
    console.log('App PID:', pid);
    try { execSync(`${ADB} forward --remove tcp:9222`); } catch(_) {}
    execSync(`${ADB} forward tcp:9222 localabstract:webview_devtools_remote_${pid}`);

    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    console.log('Pages:', pages.map(p => ({ title: p.title, url: p.url, type: p.type })));
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

    const state = await evalCDP(`(() => {
        return {
            url: window.location.href,
            title: document.title,
            bodyLength: document.body.innerHTML.length,
            bodySnippet: document.body.innerText.slice(0, 300),
            rootLength: document.getElementById('root')?.innerHTML.length
        };
    })()`);
    console.log('State:', state);
    ws.close();
}

main().catch(console.error);
