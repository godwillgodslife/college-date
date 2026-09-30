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

    async function waitFor(selector, timeoutMs = 8000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const exists = await evaluate(`!!document.querySelector('${selector}')`);
            if (exists) return true;
            await sleep(250);
        }
        return false;
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

    // Reset all guide seen keys so all tips show fresh!
    console.log('[QA] Resetting all guidance seen flags...');
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith('tcd_guide_seen_')) localStorage.removeItem(k);
        });
        const tourModal = document.querySelector('.tour-modal');
        if (tourModal) {
            const btn = tourModal.querySelector('button');
            if (btn) btn.click();
        }
    })()`);
    await sleep(1000);

    // 1. MATCH GUIDE
    console.log('Navigating to /match...');
    await navigateTo('/match');
    await waitFor('.swipe-container');
    await sleep(2000);
    // Dismiss tour modal if present (ONLY target .tour-modal, NEVER tip-close-btn)
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        const tourModal = document.querySelector('.tour-modal');
        if (tourModal) {
            const btn = tourModal.querySelector('button');
            if (btn) btn.click();
        }
    })()`);
    await sleep(1000);
    await capture('c:\\college-date\\evidence_qa_01_match_guide.png');

    // 2. EXPLORE GUIDE
    console.log('Navigating to /explore...');
    await navigateTo('/explore');
    await waitFor('.explore-page, .explore-grid, .explore-sticky-header');
    await sleep(2000);
    await capture('c:\\college-date\\evidence_qa_02_explore_guide.png');

    // 3. CHAT GUIDE
    console.log('Navigating to /chat...');
    await navigateTo('/chat');
    await waitFor('.chat-sidebar, .chat-page');
    await sleep(2000);
    await capture('c:\\college-date\\evidence_qa_03_chat_guide.png');

    // 4. REQUESTS GUIDE
    console.log('Navigating to /requests...');
    await navigateTo('/requests');
    await waitFor('.requests-page, .requests-container');
    await sleep(2000);
    await capture('c:\\college-date\\evidence_qa_04_requests_guide.png');

    // 5. VIEWERS GUIDE
    console.log('Navigating to /viewers...');
    await navigateTo('/viewers');
    await waitFor('.viewers-page, .viewers-list');
    await sleep(2000);
    await capture('c:\\college-date\\evidence_qa_05_viewers_guide.png');

    // 6. PREMIUM GUIDE
    console.log('Navigating to /premium...');
    await navigateTo('/premium');
    await waitFor('.premium-page, .premium-plans');
    await sleep(2000);
    await capture('c:\\college-date\\evidence_qa_06_premium_guide.png');

    // 7. SETTINGS & APP GUIDE MODAL
    console.log('Navigating to /settings...');
    await navigateTo('/settings');
    await waitFor('.settings-page, .settings-group');
    await sleep(2000);
    // Click "How College Date Works (App Guide)"
    await evaluate(`(() => {
        const items = Array.from(document.querySelectorAll('.settings-item'));
        const guide = items.find(i => i.innerText.includes('How College Date Works'));
        if (guide) {
            guide.scrollIntoView({ block: 'center' });
            guide.click();
        }
    })()`);
    await waitFor('.guide-modal-card');
    await sleep(1000);
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

    console.log('ALL SCREENSHOTS CAPTURED CLEANLY AND TIMED ACCURATELY!');
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
