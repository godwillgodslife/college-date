import { execFileSync, execSync } from 'child_process';
import path from 'path';

const ADB_PATH = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
execFileSync(ADB_PATH, ['start-server']);
execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'wait-for-device']);
const unixOut = execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'shell', 'cat', '/proc/net/unix'], { encoding: 'utf8' });
const match = unixOut.match(/@(webview_devtools_remote_\d+)/);
const socketName = match[1];
execFileSync(ADB_PATH, ['-s', 'emulator-5554', 'forward', 'tcp:9222', 'localabstract:' + socketName]);
const jsonStr = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 4 http://127.0.0.1:9222/json', { encoding: 'utf8' });
const pages = JSON.parse(jsonStr);
const page = pages.find(p => p.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);

ws.onopen = async () => {
    let id = 1;
    const send = (method, params = {}) => new Promise((res) => {
        const myId = id++;
        const h = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === myId) {
                ws.removeEventListener('message', h);
                res(data.result);
            }
        };
        ws.addEventListener('message', h);
        ws.send(JSON.stringify({ id: myId, method, params }));
    });
    await send('Runtime.enable');
    const res = await send('Runtime.evaluate', {
        expression: `(() => {
            const el = document.querySelector('.soft-prompt-overlay');
            if (!el) return 'no element';
            const comp = window.getComputedStyle(el);
            const card = el.querySelector('.soft-prompt-card');
            const cardComp = card ? window.getComputedStyle(card) : null;
            return {
                compOpacity: comp.opacity,
                compDisplay: comp.display,
                compVisibility: comp.visibility,
                compZIndex: comp.zIndex,
                cardCompTransform: cardComp ? cardComp.transform : null,
                cardRect: card ? {
                    top: card.getBoundingClientRect().top,
                    bottom: card.getBoundingClientRect().bottom,
                    left: card.getBoundingClientRect().left,
                    right: card.getBoundingClientRect().right,
                    width: card.getBoundingClientRect().width,
                    height: card.getBoundingClientRect().height
                } : null
            };
        })()`,
        returnByValue: true
    });
    console.log(JSON.stringify(res.result.value, null, 2));
    ws.close();
    process.exit(0);
};
