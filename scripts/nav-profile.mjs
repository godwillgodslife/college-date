import { execSync } from 'node:child_process';
import path from 'path';

async function nav() {
    const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
    const unixSockets = execSync(`"${adbPath}" -s emulator-5554 shell "cat /proc/net/unix | grep webview_devtools_remote"`).toString();
    const match = unixSockets.match(/@(webview_devtools_remote_\d+)/);
    if (!match) throw new Error('No webview socket');
    const socketName = match[1];

    try { execSync(`"${adbPath}" -s emulator-5554 forward --remove tcp:9222`); } catch (_) {}
    execSync(`"${adbPath}" -s emulator-5554 forward tcp:9222 localabstract:${socketName}`);

    const jsonStr = execSync('curl.exe -s http://127.0.0.1:9222/json').toString();
    const pages = JSON.parse(jsonStr);
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
    if (!page) throw new Error('No page found');

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

    const res = await evaluate(`
        (() => {
            const profileTab = Array.from(document.querySelectorAll('.bottom-nav-item')).find(el => el.textContent.includes('Profile'));
            if (profileTab) {
                profileTab.click();
                return 'Clicked profile tab';
            }
            window.location.href = '/profile';
            return 'Navigated via href';
        })()
    `);
    console.log('Nav result:', res);
    ws.close();
}

nav().catch(console.error);
