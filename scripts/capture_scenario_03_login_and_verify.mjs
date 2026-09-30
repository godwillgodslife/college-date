// scripts/capture_scenario_03_login_and_verify.mjs
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
    console.log('--- Step 1: Fill Login Form via CDP Value Tracker ---');
    const fillResult = await evalInPage(`(() => {
        const emailInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        if (!emailInput || !passInput) return { error: 'Inputs not found' };

        function setVal(el, val) {
            const tracker = el._valueTracker;
            if (tracker) tracker.setValue('');
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        setVal(emailInput, 'student.tester2026@gmail.com');
        setVal(passInput, 'CollegeDate2026!VerifiedPass');

        return { email: emailInput.value, passLen: passInput.value.length };
    })()`);
    console.log('Filled inputs:', fillResult);

    await sleep(500);

    console.log('--- Step 2: Click Sign In ---');
    await evalInPage(`(() => {
        const form = document.querySelector('form.auth-form');
        const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Sign In'));
        if (submitBtn) submitBtn.click();
        else if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`);

    // Poll for authentication and redirection
    console.log('Waiting for authentication...');
    let authed = false;
    for (let i = 0; i < 20; i++) {
        await sleep(1000);
        const url = await evalInPage("window.location.pathname");
        console.log(`Current pathname [${i}]:`, url);
        if (url !== '/login' && url !== '/') {
            authed = true;
            break;
        }
    }

    if (!authed) {
        console.log('Checking for any toast or error message:');
        const errText = await evalInPage("document.querySelector('.toast, .auth-error, .error-message')?.innerText");
        console.log('Error snippet:', errText);
    }

    console.log('--- Step 3: Navigate to /profile/edit ---');
    // Use React router pushState or programmatic navigate if possible, or window.location
    await evalInPage(`(() => {
        window.history.pushState({}, '', '/profile/edit');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(1500);

    let currentPath = await evalInPage("window.location.pathname");
    if (currentPath !== '/profile/edit') {
        await evalInPage("window.location.href = '/profile/edit'");
        await sleep(3500);
    }
    console.log('Pathname after navigation:', await evalInPage("window.location.pathname"));

    console.log('--- Step 4: Click Verify Button ---');
    const verifyClicked = await evalInPage(`(() => {
        const btn = document.querySelector('.edit-verify-btn') || 
                    document.querySelector('.verify-btn-cta') || 
                    document.querySelector('.verify-btn-reverify') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Verify Face'));
        if (btn) {
            btn.click();
            return { clicked: true, text: btn.innerText, class: btn.className };
        }
        return { clicked: false, availableButtons: Array.from(document.querySelectorAll('button')).map(b => b.innerText) };
    })()`);
    console.log('Verify clicked result:', verifyClicked);

    await sleep(2000);

    console.log('--- Step 5: Verify NDPA Biometric Consent Card ---');
    const cardInfo = await evalInPage(`(() => {
        const card = document.querySelector('.face-verify-consent-card');
        const modal = document.querySelector('.face-verify-card');
        if (!modal) return { modalFound: false };
        return {
            modalFound: true,
            cardFound: !!card,
            cardText: card?.innerText,
            cardVisible: card ? card.offsetParent !== null : false
        };
    })()`);
    console.log('Modal & Card Info:', cardInfo);

    console.log('--- Step 6: Capture Screenshot ---');
    const rootOutput = path.join(process.cwd(), 'evidence_qa_03_face_verification_ndpa_consent.png');
    const artifactOutput = path.join(ARTIFACT_DIR, 'evidence_qa_03_face_verification_ndpa_consent.png');

    await captureScreen(rootOutput);
    fs.copyFileSync(rootOutput, artifactOutput);
    console.log('Successfully captured and saved:', rootOutput);

    process.exit(0);
}

main().catch(err => {
    console.error('Script error:', err);
    process.exit(1);
});
