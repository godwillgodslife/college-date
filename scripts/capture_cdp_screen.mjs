// scripts/capture_cdp_screen.mjs
import fs from 'fs';
import WebSocket from 'ws';

const port = process.argv[3] || '9222';
const outputPath = process.argv[2] || 'cdp_screen.png';

async function main() {
    const res = await fetch(`http://127.0.0.1:${port}/json`);
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) {
        console.error('No page target found');
        process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl, {
        headers: { Host: 'localhost' }
    });

    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    let id = 1;
    function sendCommand(method, params = {}) {
        return new Promise((resolve, reject) => {
            const cmdId = id++;
            const handler = (data) => {
                const msg = JSON.parse(data);
                if (msg.id === cmdId) {
                    ws.removeListener('message', handler);
                    if (msg.error) reject(msg.error);
                    else resolve(msg.result);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    try {
        await sendCommand('Page.enable');
        const result = await sendCommand('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(outputPath, Buffer.from(result.data, 'base64'));
        console.log('Successfully saved screenshot to:', outputPath);
    } finally {
        ws.close();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
