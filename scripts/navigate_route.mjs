import { execSync } from 'node:child_process';
import path from 'node:path';

const targetRoute = process.argv[2] || '/confessions';

async function navigate() {
    const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
    try { execSync(`"${adbPath}" connect 127.0.0.1:5555`); } catch (_) {}
    await new Promise(r => setTimeout(r, 2000));
    
    // Find active device
    const devicesOutput = execSync(`"${adbPath}" devices`).toString();
    const activeDevice = devicesOutput.includes('127.0.0.1:5555\tdevice')
        ? '127.0.0.1:5555'
        : (devicesOutput.includes('emulator-5554\tdevice') ? 'emulator-5554' : '127.0.0.1:5555');

    let unixSockets = '';
    let match = null;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            unixSockets = execSync(`"${adbPath}" -s ${activeDevice} shell "cat /proc/net/unix"`).toString();
            match = unixSockets.match(/@(webview_devtools_remote_\d+)/);
            if (match) break;
        } catch (_) {}
        // If not found, start app
        try {
            execSync(`"${adbPath}" -s ${activeDevice} shell monkey -p com.collegedate.app -c android.intent.category.LAUNCHER 1`);
        } catch (_) {}
        await new Promise(r => setTimeout(r, 2000));
    }
    if (!match) throw new Error('No webview socket found after launching app');
    const socketName = match[1];

    try { execSync(`"${adbPath}" -s ${activeDevice} forward --remove tcp:9222`); } catch (_) {}
    execSync(`"${adbPath}" -s ${activeDevice} forward tcp:9222 localabstract:${socketName}`);

    const jsonStr = execSync('curl.exe -s http://127.0.0.1:9222/json').toString();
    const pages = JSON.parse(jsonStr);
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(res => { ws.onopen = res; });

    function evaluate(expr) {
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
    }

    const exprToRun = targetRoute.startsWith('eval:')
        ? targetRoute.slice(5)
        : `(() => {
            if (typeof window.__reactNavigate === 'function') {
                window.__reactNavigate('${targetRoute}');
                return 'Navigated with window.__reactNavigate to ${targetRoute}';
            }
            window.location.href = '${targetRoute}';
            return 'Navigated with window.location.href to ${targetRoute}';
        })()`;

    const res = await evaluate(exprToRun);
    console.log('Result:', res);
    ws.close();
}

navigate().catch(console.error);
