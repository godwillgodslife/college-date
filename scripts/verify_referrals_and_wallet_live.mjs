import fs from 'fs';
import path from 'path';
import WebSocket from 'ws';

const SUPABASE_URL = 'https://gedoyoleoscgxgdqszzc.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlZG95b2xlb3NjZ3hnZHFzenpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MjQ4ODcsImV4cCI6MjA4NjQwMDg4N30.pVnlTBOwxYSFgC0fQ2Wo1oEsrBWak6X2FBBeNGariys';

async function getSession(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

async function main() {
    const session = await getSession('student.tester2026@gmail.com', 'CollegeDate2026!VerifiedPass');
    if (!session || !session.access_token) {
        throw new Error('Failed to get session: ' + JSON.stringify(session));
    }
    console.log('Got session for:', session.user.email);

    const res = await fetch('http://127.0.0.1:9222/json');
    const targets = await res.json();
    const page = targets.find(t => t.type === 'page');
    if (!page) throw new Error('No webview target');

    const ws = new WebSocket(page.webSocketDebuggerUrl, {
        headers: { Host: 'localhost' }
    });

    await new Promise((resolve, reject) => {
        ws.on('open', resolve);
        ws.on('error', reject);
    });

    let msgId = 1;
    function evalExpr(expression) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (data) => {
                const msg = JSON.parse(data);
                if (msg.id === id) {
                    ws.removeListener('message', handler);
                    if (msg.error) reject(msg.error);
                    else resolve(msg.result?.result?.value);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({
                id,
                method: 'Runtime.evaluate',
                params: { expression, returnByValue: true, awaitPromise: true }
            }));
        });
    }

    function sendCommand(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (data) => {
                const msg = JSON.parse(data);
                if (msg.id === id) {
                    ws.removeListener('message', handler);
                    if (msg.error) reject(msg.error);
                    else resolve(msg.result);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    console.log('Authenticating via window.__supabase.auth.setSession...');
    await evalExpr(`(async () => {
        if (window.__supabase) {
            await window.__supabase.auth.setSession({
                access_token: ${JSON.stringify(session.access_token)},
                refresh_token: ${JSON.stringify(session.refresh_token)}
            });
            return 'auth_set';
        }
        return 'no_supabase';
    })()`);

    await new Promise(r => setTimeout(r, 2000));

    console.log('Navigating to /referrals...');
    await evalExpr(`window.location.href = '/referrals'`);

    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const rendered = await evalExpr(`Boolean(document.querySelector('.share-btn-whatsapp'))`);
        if (rendered) {
            console.log(`Referrals page rendered after ${i + 1}s`);
            break;
        }
    }

    // Capture screenshot of /referrals
    console.log('Capturing /referrals...');
    const shotRef = await sendCommand('Page.captureScreenshot', { format: 'png' });
    if (shotRef?.data) {
        const outPath = path.resolve('public/evidence_qa/referrals_whatsapp_share_live.png');
        fs.writeFileSync(outPath, Buffer.from(shotRef.data, 'base64'));
        console.log('Saved referrals screenshot to:', outPath);
    }

    const refCheck = await evalExpr(`({
        code: document.querySelector('.code-display')?.innerText,
        hasWhatsAppBtn: Boolean(document.querySelector('.share-btn-whatsapp')),
        whatsAppBtnText: document.querySelector('.share-btn-whatsapp')?.innerText,
        hasCopyBtn: Boolean(document.querySelector('.share-btn')),
        copyBtnText: document.querySelector('.share-btn')?.innerText
    })`);
    console.log('Referrals Check:', refCheck);

    // Navigate to /wallet
    console.log('Navigating to /wallet...');
    await evalExpr(`window.location.href = '/wallet';`);

    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const rendered = await evalExpr(`Boolean(document.querySelector('.wallet-action-tabs'))`);
        if (rendered) {
            console.log(`Wallet page rendered after ${i + 1}s`);
            break;
        }
    }

    console.log('Capturing /wallet...');
    const shotWallet = await sendCommand('Page.captureScreenshot', { format: 'png' });
    if (shotWallet?.data) {
        const outPath = path.resolve('public/evidence_qa/wallet_bank_safeguards_live.png');
        fs.writeFileSync(outPath, Buffer.from(shotWallet.data, 'base64'));
        console.log('Saved wallet screenshot to:', outPath);
    }

    const walletCheck = await evalExpr(`({
        title: document.querySelector('.wallet-header h1, h1')?.innerText,
        hasAddFundsTab: Boolean(document.querySelector('.wallet-action-tabs button:first-child')),
        hasWithdrawTab: Boolean(document.querySelector('.wallet-action-tabs button:last-child')),
        bankNameInput: Boolean(document.querySelector('input[placeholder*="GTBank"]')),
        accountNumInput: Boolean(document.querySelector('input[placeholder*="0123456789"]'))
    })`);
    console.log('Wallet Check:', walletCheck);

    ws.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Script error:', err);
    process.exit(1);
});
