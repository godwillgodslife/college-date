import WebSocket from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';

(async () => {
    const targets = await new Promise(r => http.get('http://127.0.0.1:9222/json', res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => r(JSON.parse(d)));
    }));
    const page = targets.find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    let id = 1;
    const send = (method, params = {}) => new Promise(r => {
        const i = id++;
        const h = (m) => {
            const p = JSON.parse(m);
            if (p.id === i) {
                ws.removeListener('message', h);
                r(p.result);
            }
        };
        ws.on('message', h);
        ws.send(JSON.stringify({ id: i, method, params }));
    });

    console.log('Navigating to /referrals via pushState...');
    await send('Runtime.evaluate', {
        expression: `(() => {
            window.history.pushState({}, '', '/referrals');
            window.dispatchEvent(new PopStateEvent('popstate'));
        })()`
    });

    await new Promise(r => setTimeout(r, 2000));

    // Scroll to share actions
    await send('Runtime.evaluate', {
        expression: `(() => {
            const el = document.querySelector('.share-actions') || document.querySelector('.referral-main-card');
            if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
        })()`
    });

    await new Promise(r => setTimeout(r, 1000));

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.resolve('public/evidence_qa/referrals_whatsapp_share_live.png'), Buffer.from(shot.data, 'base64'));
    console.log('Scrolled referrals screenshot saved!');
    ws.close();
    process.exit(0);
})();
