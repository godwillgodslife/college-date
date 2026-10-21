import WebSocket from 'ws';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ADB = `"${process.env.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe" -s emulator-5554`;

function captureScreenshot(filename) {
    const targetPath = path.resolve(filename);
    const buf = execSync(`${ADB} exec-out screencap -p`, { maxBuffer: 15 * 1024 * 1024 });
    fs.writeFileSync(targetPath, buf);
    console.log(`[Captured]: ${targetPath} (${buf.length} bytes)`);
}

async function run() {
    const res = await fetch('http://127.0.0.1:9222/json');
    const pages = await res.json();
    const page = pages.find(p => p.type === 'page' && p.title) || pages[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
            expression: '({ pathname: window.location.pathname, title: document.title, text: document.body.innerText.slice(0, 300) })',
            returnByValue: true
        }
    }));

    ws.onmessage = evt => {
        const data = JSON.parse(evt.data);
        console.log('Page info:', JSON.stringify(data.result?.result?.value, null, 2));
        ws.close();
        captureScreenshot('public/evidence_qa/v2.2.73_emulator_screen_status_page.png');
    };
}

run().catch(console.error);
