import WebSocket from 'ws';
import { execSync } from 'child_process';

async function main() {
    const raw = execSync('C:\\Windows\\System32\\curl.exe -s --max-time 3 http://127.0.0.1:9222/json', { encoding: 'utf8' });
    const targets = JSON.parse(raw);
    const target = targets.find(t => t.type === 'page');
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

    const r = await send('Runtime.evaluate', {
        expression: `(() => {
            return Array.from(document.querySelectorAll('.viewer-card')).map(c => {
                const avatar = c.querySelector('.viewer-avatar');
                const img = avatar?.querySelector('img');
                const placeholder = avatar?.querySelector('.avatar-placeholder');
                return {
                    name: c.querySelector('h3')?.innerText,
                    hasImg: !!img,
                    imgSrc: img?.src,
                    imgNaturalWidth: img?.naturalWidth,
                    imgComplete: img?.complete,
                    placeholderText: placeholder?.innerText,
                    placeholderComputed: placeholder ? window.getComputedStyle(placeholder).color + ' / ' + window.getComputedStyle(placeholder).backgroundColor : null,
                    html: avatar?.innerHTML
                };
            });
        })()`,
        returnByValue: true
    });

    console.log(JSON.stringify(r.result?.value, null, 2));
    ws.close();
}

main().catch(console.error);
