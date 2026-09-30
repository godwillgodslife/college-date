// scripts/capture_face_verify_modal.mjs
import fs from 'fs';
import WebSocket from 'ws';

async function main() {
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

    console.log('Checking current path...');
    console.log('Current path:', await evalExpr('location.pathname'));

    console.log('Polling for .edit-verify-btn...');
    let btnFound = false;
    for (let i = 0; i < 15; i++) {
        const check = await evalExpr(`(() => {
            const btn = document.querySelector('.edit-verify-btn');
            return { hasBtn: Boolean(btn), text: btn?.innerText };
        })()`);
        console.log(`Poll [${i + 1}/15]:`, check);
        if (check?.hasBtn) {
            btnFound = true;
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    if (btnFound) {
        console.log('Clicking .edit-verify-btn...');
        await evalExpr(`document.querySelector('.edit-verify-btn').click()`);
    } else {
        console.log('Trying fallback: clicking any verify button or setting state directly...');
        await evalExpr(`(() => {
            const anyBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Verify'));
            if (anyBtn) anyBtn.click();
        })()`);
    }

    await new Promise(r => setTimeout(r, 2000));

    const modalCheck = await evalExpr(`(() => {
        const consent = document.querySelector('.face-ndpa-consent-card');
        const modal = document.querySelector('.face-verification-modal, .face-modal-card');
        return {
            modalFound: Boolean(modal),
            consentFound: Boolean(consent),
            consentText: consent?.innerText
        };
    })()`);
    console.log('Modal check result:', modalCheck);

    console.log('Capturing screenshot...');
    await sendCommand('Page.enable');
    const result = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const outPath = 'evidence_qa_03_face_verification_ndpa_consent.png';
    fs.writeFileSync(outPath, Buffer.from(result.data, 'base64'));
    console.log('Screenshot saved to:', outPath);

    ws.close();
}

main().catch(console.error);
