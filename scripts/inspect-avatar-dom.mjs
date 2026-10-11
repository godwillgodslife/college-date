import { execSync } from 'node:child_process';
import path from 'path';

async function inspect() {
    const adbPath = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
    const unixSockets = execSync(`"${adbPath}" -s emulator-5554 shell "cat /proc/net/unix | grep webview_devtools_remote"`).toString();
    const match = unixSockets.match(/@(webview_devtools_remote_\d+)/);
    const socketName = match[1];

    try { execSync(`"${adbPath}" -s emulator-5554 forward --remove tcp:9222`); } catch (_) {}
    execSync(`"${adbPath}" -s emulator-5554 forward tcp:9222 localabstract:${socketName}`);

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

    const script = `
        (() => {
            const wrapper = document.querySelector('.profile-avatar-wrapper');
            const avatar = document.querySelector('.profile-avatar');
            const img = document.querySelector('.profile-avatar img') || document.querySelector('.profile-avatar-wrapper img');
            const card = document.querySelector('.profile-card');

            function getInfo(el) {
                if (!el) return null;
                const cs = window.getComputedStyle(el);
                return {
                    tagName: el.tagName,
                    className: el.className,
                    background: cs.background,
                    backgroundColor: cs.backgroundColor,
                    backgroundImage: cs.backgroundImage,
                    boxShadow: cs.boxShadow,
                    borderRadius: cs.borderRadius,
                    width: cs.width,
                    height: cs.height,
                    border: cs.border,
                    filter: cs.filter
                };
            }

            return {
                wrapper: getInfo(wrapper),
                avatar: getInfo(avatar),
                img: getInfo(img),
                card: getInfo(card)
            };
        })()
    `;

    const res = await evaluate(script);
    console.log('DOM Info:', JSON.stringify(res.result.value, null, 2));
    ws.close();
}

inspect().catch(console.error);
