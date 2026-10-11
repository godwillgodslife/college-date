// scripts/cdp-client.mjs
import { execSync } from 'node:child_process';

export async function getCdpConnection() {
    const adbPath = process.env.LOCALAPPDATA + '\\Android\\Sdk\\platform-tools\\adb.exe';

    // 1. Find active webview socket
    const unixSockets = execSync(`"${adbPath}" -s emulator-5554 shell "cat /proc/net/unix | grep webview_devtools_remote"`).toString();
    const match = unixSockets.match(/@(webview_devtools_remote_\d+)/);
    if (!match) {
        throw new Error('No webview_devtools_remote socket found');
    }
    const socketName = match[1];

    // 2. Forward port 9222 cleanly
    try { execSync(`"${adbPath}" -s emulator-5554 forward --remove tcp:9222`); } catch (_) {}
    execSync(`"${adbPath}" -s emulator-5554 forward tcp:9222 localabstract:${socketName}`);

    // 3. Connect to page using curl to avoid undici keepalive timeout
    const jsonStr = execSync('curl.exe -s http://127.0.0.1:9222/json').toString();
    const pages = JSON.parse(jsonStr);
    const page = pages.find(p => p.type === 'page');
    if (!page) throw new Error('No page found in CDP');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => { ws.onopen = res; });

    return {
        ws,
        async evaluate(expr) {
            return new Promise((resolve) => {
                const id = Math.floor(Math.random() * 100000);
                const handler = (evt) => {
                    const data = JSON.parse(evt.data);
                    if (data.id === id) {
                        ws.removeEventListener('message', handler);
                        resolve(data.result);
                    }
                };
                ws.addEventListener('message', handler);
                ws.send(JSON.stringify({
                    id,
                    method: 'Runtime.evaluate',
                    params: { expression: expr, returnByValue: true, awaitPromise: true }
                }));
            });
        },
        close() {
            try { ws.close(); } catch (_) {}
        }
    };
}
