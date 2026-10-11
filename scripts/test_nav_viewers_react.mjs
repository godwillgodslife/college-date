import WebSocket from 'ws';
import { execSync } from 'child_process';
import path from 'path';

const ADB = `"${path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe')}" -s emulator-5554`;

async function main() {
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

    console.log('Navigating to /viewers via __reactNavigate...');
    const navRes = await send('Runtime.evaluate', {
        expression: `(() => {
            if (window.__reactNavigate) {
                window.__reactNavigate('/viewers');
                return 'Used window.__reactNavigate';
            }
            return 'No window.__reactNavigate';
        })()`,
        returnByValue: true
    });
    console.log('Nav result:', navRes.result?.value);

    await new Promise(r => setTimeout(r, 4000));

    // Capture screen
    const targetPath = path.resolve('public/evidence_qa/evidence_02_viewers_real_photos_no_v_boxes.png');
    execSync(`${ADB} exec-out screencap -p > "${targetPath}"`);
    console.log(`Saved screenshot to ${targetPath}`);

    // Inspect viewers
    const checkViewers = await send('Runtime.evaluate', {
        expression: `(() => {
            return {
                url: window.location.href,
                hasViewersPage: !!document.querySelector('.viewers-page'),
                cards: Array.from(document.querySelectorAll('.viewer-card')).map(c => ({
                    name: c.querySelector('.viewer-info h3')?.innerText,
                    hasImg: !!c.querySelector('img'),
                    imgSrc: c.querySelector('img')?.src,
                    placeholder: c.querySelector('.avatar-placeholder')?.innerText
                }))
            };
        })()`,
        returnByValue: true
    });
    console.log('Viewers check:', JSON.stringify(checkViewers.result?.value, null, 2));

    ws.close();
}

main().catch(console.error);
