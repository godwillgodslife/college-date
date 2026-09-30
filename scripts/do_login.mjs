import fs from 'fs';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\83d0a166-be4e-4042-8b8d-140a6cfe8146';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
    const target = list[0];
    const ws = new WebSocket(target.webSocketDebuggerUrl);

    let msgId = 1;
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = msgId++;
            const handler = (event) => {
                const data = JSON.parse(event.data);
                if (data.id === id) {
                    ws.removeEventListener('message', handler);
                    if (data.error) reject(data.error);
                    else resolve(data.result);
                }
            };
            ws.addEventListener('message', handler);
            ws.send(JSON.stringify({ id, method, params }));
        });
    }

    await new Promise((resolve, reject) => {
        ws.addEventListener('open', resolve);
        ws.addEventListener('error', reject);
    });

    await send('Page.enable');
    await send('Runtime.enable');

    async function evaluate(expr) {
        const res = await send('Runtime.evaluate', {
            expression: expr,
            returnByValue: true,
            awaitPromise: true
        });
        return res?.result?.value;
    }

    async function navigateTo(path) {
        await evaluate(`(() => {
            if (window.__reactNavigate) {
                window.__reactNavigate('${path}');
            } else {
                window.location.href = '${path}';
            }
        })()`);
    }

    async function capture(filename) {
        const base = filename.split(/[/\\]/).pop();
        const res = await send('Page.captureScreenshot', { format: 'png' });
        if (res && res.data) {
            const buf = Buffer.from(res.data, 'base64');
            fs.writeFileSync(filename, buf);
            fs.writeFileSync(`${ARTIFACT_DIR}\\${base}`, buf);
            console.log(`[SAVED] ${filename} (${buf.length} bytes)`);
        }
    }

    console.log('[QA] Submitting login form with tester credentials...');
    await evaluate(`(() => {
        function setVal(el, val) {
            const last = el.value;
            el.value = val;
            if (el._valueTracker) el._valueTracker.setValue(last);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const emailInput = document.querySelector('#email');
        const passInput = document.querySelector('#password');
        if (emailInput && passInput) {
            setVal(emailInput, 'student.tester2026@gmail.com');
            setVal(passInput, 'CollegeDate2026!VerifiedPass');
            const btn = document.querySelector('button[type="submit"]');
            if (btn) btn.click();
        }
    })()`);

    console.log('[QA] Waiting for authentication...');
    const start = Date.now();
    while (Date.now() - start < 15000) {
        await sleep(1000);
        const path = await evaluate(`window.location.pathname`);
        console.log('[QA] Current path:', path);
        if (path && path !== '/login') break;
    }

    await sleep(2000);

    // Reset tips seen for secondary views
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        ['accept_request', 'who_liked_me', 'who_viewed_me', 'premium_benefits'].forEach(id => {
            localStorage.removeItem('tcd_guide_seen_' + id);
        });
        const tourModal = document.querySelector('.tour-modal');
        if (tourModal) {
            const btn = tourModal.querySelector('button');
            if (btn) btn.click();
        }
    })()`);
    await sleep(1000);

    // 4. REQUESTS
    console.log('Navigating to /requests...');
    await navigateTo('/requests');
    await sleep(3500);
    await capture('c:\\college-date\\evidence_qa_04_requests_guide.png');

    // 5. VIEWERS
    console.log('Navigating to /viewers...');
    await navigateTo('/viewers');
    await sleep(3500);
    await capture('c:\\college-date\\evidence_qa_05_viewers_guide.png');

    // 6. PREMIUM
    console.log('Navigating to /premium...');
    await navigateTo('/premium');
    await sleep(3500);
    await capture('c:\\college-date\\evidence_qa_06_premium_guide.png');

    // 7. SETTINGS & APP GUIDE MODAL
    console.log('Navigating to /settings...');
    await navigateTo('/settings');
    await sleep(3500);
    // Click "How College Date Works (App Guide)"
    await evaluate(`(() => {
        const items = Array.from(document.querySelectorAll('.settings-item'));
        const guide = items.find(i => i.innerText.includes('How College Date Works'));
        if (guide) {
            guide.scrollIntoView({ block: 'center' });
            guide.click();
        }
    })()`);
    await sleep(2000);
    await capture('c:\\college-date\\evidence_qa_07_guide_modal.png');

    // Close modal & Reset
    await evaluate(`(() => {
        const close = document.querySelector('.guide-close-btn');
        if (close) close.click();
    })()`);
    await sleep(1000);
    await evaluate(`(() => {
        const items = Array.from(document.querySelectorAll('.settings-item'));
        const reset = items.find(i => i.innerText.includes('Reset Guidance Tips'));
        if (reset) {
            reset.scrollIntoView({ block: 'center' });
            reset.click();
        }
    })()`);
    await sleep(1500);
    await capture('c:\\college-date\\evidence_qa_08_guides_reset.png');

    console.log('ALL SECONDARY SCREENS LOGGED IN & CAPTURED!');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
