import fs from 'fs';
import path from 'path';

async function run() {
    const filename = process.argv[2] || 'dashboard_live.png';
    const pagesRes = await fetch('http://127.0.0.1:9222/json');
    const pages = await pagesRes.json();
    const page = pages.find(p => p.type === 'page');
    if (!page) {
        console.error('No page target found');
        process.exit(1);
    }

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    ws.onopen = () => {
        ws.send(JSON.stringify({
            id: 1,
            method: 'Page.captureScreenshot',
            params: { format: 'png' }
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.id === 1) {
            const base64 = data.result?.data;
            if (base64) {
                const targetDir = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\713edf99-17db-41df-b5ca-20c12a82133c';
                const outPath = path.join(targetDir, filename);
                fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
                console.log(`Saved screenshot to ${outPath}`);
            } else {
                console.error('No screenshot data in result', data);
            }
            ws.close();
            process.exit(0);
        }
    };

    ws.onerror = (err) => {
        console.error('WS Error:', err);
        process.exit(1);
    };
}

run().catch(console.error);
