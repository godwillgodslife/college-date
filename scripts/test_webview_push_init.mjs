import { execFileSync, execSync } from 'child_process';
import path from 'path';

const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    execFileSync(ADB_PATH, ['start-server']);
    await sleep(2000);
    execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'wait-for-device']);

    let socketName = null;
    for (let i = 0; i < 10; i++) {
        const unixOut = execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'shell', 'cat', '/proc/net/unix'], { encoding: 'utf8' });
        const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
        if (match) {
            socketName = match[1];
            break;
        }
        await sleep(1000);
    }
    if (!socketName) throw new Error('No webview socket');

    try { execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'forward', '--remove', 'tcp:9222'], { stdio: 'ignore' }); } catch (_) {}
    execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'forward', 'tcp:9222', `localabstract:${socketName}`]);

    const jsonStr = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 4 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const pages = JSON.parse(jsonStr);
    const page = pages.find(p => p.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
    });

    let id = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const myId = id++;
            const t = setTimeout(() => reject(new Error('Timeout ' + method)), 10000);
            const handler = (evt) => {
                const data = JSON.parse(evt.data);
                if (data.id === myId) {
                    clearTimeout(t);
                    ws.removeEventListener('message', handler);
                    resolve(data.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: myId, method, params }));
        });
    }

    await send('Runtime.enable');

    const res = await send('Runtime.evaluate', {
        expression: `(async () => {
            const plugin = window.Capacitor?.Plugins?.OneSignalCapacitor;
            if (!plugin) return { error: 'No OneSignalCapacitor plugin' };
            try {
                const initRes = await plugin.initialize({ appId: 'eda29312-5e13-406f-a1bd-5c8a8e27e6c4' });
                const loginRes = await plugin.login({ externalId: '1e618bba-9d24-4262-b3c0-1b24b4ff40ff' });
                const permRes = await plugin.requestPermission({ fallbackToSettings: true });
                const subId = await plugin.getPushSubscriptionId();
                const oneId = await plugin.getOnesignalId();
                const extId = await plugin.getExternalId();
                return {
                    initRes,
                    loginRes,
                    permRes,
                    subId,
                    oneId,
                    extId
                };
            } catch(e) {
                return { error: e.message, stack: e.stack };
            }
        })()`,
        awaitPromise: true,
        returnByValue: true
    });

    console.log('Push Init in Live WebView:', JSON.stringify(res?.result?.value, null, 2));

    ws.close();
}

main().catch(console.error);
