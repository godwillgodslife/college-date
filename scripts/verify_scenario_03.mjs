// scripts/verify_scenario_03.mjs
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\83d0a166-be4e-4042-8b8d-140a6cfe8146';
const PORT = 9222;

async function evalInPage(expr) {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const targets = await listRes.json();
    const page = targets.find(t => t.type === 'page') || targets[0];
    if (!page?.webSocketDebuggerUrl) throw new Error('No debugger url');

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
    });

    return new Promise((resolve, reject) => {
        const id = Math.floor(Math.random() * 100000);
        const handler = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id === id) {
                ws.removeEventListener('message', handler);
                ws.close();
                if (data.result?.exceptionDetails) {
                    reject(new Error(JSON.stringify(data.result.exceptionDetails)));
                } else {
                    resolve(data.result?.result?.value);
                }
            }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({
            id,
            method: 'Runtime.evaluate',
            params: {
                expression: expr,
                returnByValue: true,
                awaitPromise: true
            }
        }));
    });
}

async function captureScreen(outputPath) {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const targets = await listRes.json();
    const page = targets.find(t => t.type === 'page') || targets[0];

    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    function sendCommand(method, params = {}) {
        return new Promise((resolve, reject) => {
            const cmdId = id++;
            const handler = (data) => {
                const msg = JSON.parse(data);
                if (msg.id === cmdId) {
                    ws.removeEventListener('message', handler);
                    if (msg.error) reject(msg.error);
                    else resolve(msg.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id: cmdId, method, params }));
        });
    }

    await sendCommand('Page.enable');
    const result = await sendCommand('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outputPath, Buffer.from(result.data, 'base64'));
    ws.close();
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log('--- Step 1: Navigate to /profile/edit ---');
    await evalInPage("window.location.href = '/profile/edit'");
    await sleep(3500);

    const currentUrl = await evalInPage("window.location.href");
    console.log('Current URL:', currentUrl);

    // Check if on /profile/edit or redirected
    const hasVerifyBtn = await evalInPage("Boolean(document.querySelector('.edit-verify-btn'))");
    console.log('Has .edit-verify-btn:', hasVerifyBtn);

    if (!hasVerifyBtn) {
        // Maybe at /profile or need to check body text
        const bodyText = await evalInPage("document.body.innerText.slice(0, 300)");
        console.log('Page body snippet:', bodyText);
    }

    console.log('--- Step 2: Open Face Verification Modal ---');
    const clicked = await evalInPage(`(() => {
        const btn = document.querySelector('.edit-verify-btn') || document.querySelector('.verify-btn-cta') || document.querySelector('.verify-btn-reverify');
        if (btn) {
            btn.click();
            return true;
        }
        return false;
    })()`);
    console.log('Verify button clicked:', clicked);
    await sleep(1500);

    console.log('--- Step 3: Verify NDPA Biometric Consent Card ---');
    const consentCard = await evalInPage(`(() => {
        const card = document.querySelector('.face-verify-consent-card');
        if (!card) return null;
        return {
            text: card.innerText,
            visible: card.offsetParent !== null,
            title: card.querySelector('div')?.innerText
        };
    })()`);
    console.log('Consent Card Info:', consentCard);

    if (consentCard) {
        console.log('--- Step 4: Capturing Screenshot ---');
        const rootOutput = path.join(process.cwd(), 'evidence_qa_03_face_verification_ndpa_consent.png');
        const artifactOutput = path.join(ARTIFACT_DIR, 'evidence_qa_03_face_verification_ndpa_consent.png');

        await captureScreen(rootOutput);
        fs.copyFileSync(rootOutput, artifactOutput);
        console.log('Saved screenshots to root and artifact directory!');
    } else {
        console.error('Consent card not found!');
    }

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
