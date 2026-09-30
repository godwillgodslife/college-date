// scripts/login_and_open_face_verify.mjs
import fs from 'fs';
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
                    if (msg.error) reject(data.error);
                    else resolve(msg.result);
                }
            };
            ws.on('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    console.log('Injecting session and navigating to /profile/edit...');
    const sessionStr = JSON.stringify(session);
    await evalExpr(`(() => {
        localStorage.setItem("sb-gedoyoleoscgxgdqszzc-auth-token", ${JSON.stringify(sessionStr)});
        window.location.href = '/profile/edit';
        return 'navigated';
    })()`);

    console.log('Polling for /profile/edit and .edit-verify-btn to render...');
    let btnFound = false;
    for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const status = await evalExpr(`(() => {
            const btn = document.querySelector('.edit-verify-btn');
            const h1 = document.querySelector('.edit-profile-header h1');
            return {
                path: location.pathname,
                h1: h1?.innerText,
                hasBtn: Boolean(btn)
            };
        })()`);
        console.log(`Poll [${i + 1}/20]:`, status);
        if (status?.hasBtn) {
            btnFound = true;
            break;
        }
    }

    if (!btnFound) {
        console.warn('Button not found via polling. Checking fallback on /profile...');
        await evalExpr(`window.location.href = '/profile'`);
        await new Promise(r => setTimeout(r, 3000));
        const profileStatus = await evalExpr(`(() => {
            const btn = document.querySelector('.profile-verify-badge-btn, button:has-text("Verify"), button');
            return { path: location.pathname, allBtns: Array.from(document.querySelectorAll('button')).map(b => b.innerText) };
        })()`);
        console.log('Profile page buttons:', profileStatus);
    }

    console.log('Clicking edit-verify-btn...');
    const clickResult = await evalExpr(`(() => {
        const btn = document.querySelector('.edit-verify-btn');
        if (btn) {
            btn.click();
            return 'clicked';
        }
        return 'not-found';
    })()`);
    console.log('Click result:', clickResult);

    await new Promise(r => setTimeout(r, 1500));

    const checkModal = await evalExpr(`(() => {
        const consent = document.querySelector('.face-ndpa-consent-card');
        const modal = document.querySelector('.face-verification-modal');
        return {
            modalFound: Boolean(modal),
            consentFound: Boolean(consent),
            consentText: consent?.innerText
        };
    })()`);
    console.log('Face verification modal check:', checkModal);

    console.log('Capturing screenshot...');
    await sendCommand('Page.enable');
    const result = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const outPath = 'evidence_qa_03_face_verification_ndpa_consent.png';
    fs.writeFileSync(outPath, Buffer.from(result.data, 'base64'));
    console.log('Screenshot saved to:', outPath);

    ws.close();
}

main().catch(console.error);
