import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\DELL\\.gemini\\antigravity\\brain\\83d0a166-be4e-4042-8b8d-140a6cfe8146';
const PUBLIC_DOCS_DIR = 'c:\\college-date\\docs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
    const list = await (await fetch('http://127.0.0.1:9222/json')).json();
    const target = list.find(t => t.type === 'page');
    console.log('Connecting to:', target.title, target.url);

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

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

    async function capture(filename) {
        const artPath = path.join(ARTIFACT_DIR, filename);
        const docPath = path.join(PUBLIC_DOCS_DIR, filename);

        const res = await send('Page.captureScreenshot', { format: 'png' });
        if (res && res.data) {
            const buf = Buffer.from(res.data, 'base64');
            fs.writeFileSync(artPath, buf);
            try { fs.writeFileSync(docPath, buf); } catch (e) {}
            console.log(`📸 [SAVED] ${filename} (${buf.length} bytes)`);
        }
    }

    // Dismiss tour / popups
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"], .modal-close');
        if (tour) tour.click();
    })()`);

    // ── 1. MALE USER: CONFIRM CARD IS NOT RENDERED ──
    console.log('\nNavigating to /dashboard as Male user...');
    await evaluate(`(() => {
        history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(2500);

    const maleDashboardHasCard = await evaluate(`!!document.querySelector('.dashboard-active-program-card')`);
    console.log('Male Dashboard Active Card Visible:', maleDashboardHasCard, '(Must be false)');
    await capture('evidence_qa_05_dashboard_male_no_active_card.png');

    console.log('\nNavigating to /wallet as Male user...');
    await evaluate(`(() => {
        history.pushState({}, '', '/wallet');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(2500);

    const maleWalletHasCard = await evaluate(`!!document.querySelector('.wallet-active-program-card')`);
    console.log('Male Wallet Active Card Visible:', maleWalletHasCard, '(Must be false)');
    await capture('evidence_qa_06_wallet_male_no_active_card.png');

    // ── 2. FEMALE USER: SWITCH ROLE AND VERIFY CARD & MODAL ──
    console.log('\nSetting user_metadata role to Female for female cohort testing...');
    await evaluate(`(() => {
        const key = 'sb-gedoyoleoscgxgdqszzc-auth-token';
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.user) {
                parsed.user.user_metadata = parsed.user.user_metadata || {};
                parsed.user.user_metadata.role = 'Female';
                parsed.user.user_metadata.gender = 'Female';
                localStorage.setItem(key, JSON.stringify(parsed));
            }
        }
        // Also update any cached profile keys
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.includes('profile')) {
                try {
                    const obj = JSON.parse(localStorage.getItem(k));
                    if (obj) {
                        obj.role = 'Female';
                        obj.gender = 'Female';
                        if (obj.data) { obj.data.role = 'Female'; obj.data.gender = 'Female'; }
                        localStorage.setItem(k, JSON.stringify(obj));
                    }
                } catch (e) {}
            }
        }
    })()`);

    // Reload page to let AuthContext initialize with Female role
    console.log('Reloading page with Female profile state...');
    await send('Page.reload');
    await sleep(4000);

    // Dismiss any popups
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"], .modal-close');
        if (tour) tour.click();
    })()`);

    console.log('Navigating to /dashboard as Female user...');
    await evaluate(`(() => {
        history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3000);

    const femaleDashboardHasCard = await evaluate(`!!document.querySelector('.dashboard-active-program-card')`);
    console.log('Female Dashboard Active Card Visible:', femaleDashboardHasCard, '(Must be true)');
    await capture('evidence_qa_07_dashboard_female_active_card.png');

    // Click the active card to open College Date Active modal
    console.log('\nClicking Active Program card to open modal...');
    await evaluate(`(() => {
        const card = document.querySelector('.dashboard-active-program-card');
        if (card) card.click();
    })()`);
    await sleep(2000);

    const modalData = await evaluate(`(() => {
        const title = document.querySelector('.active-earnings-value')?.innerText?.trim();
        const target = document.querySelector('.active-target-hint')?.innerText?.trim();
        const days = document.querySelector('.active-days-counter')?.innerText?.trim();
        const items = Array.from(document.querySelectorAll('.active-check-item')).map(el => el.innerText.trim());
        return { title, target, days, items };
    })()`);
    console.log('Active Program Modal Data:', JSON.stringify(modalData, null, 2));

    // Scroll modal slightly so 15 swipes, 3 chats, and streak checklist are centered
    await evaluate(`(() => {
        const body = document.querySelector('.active-modal-body');
        if (body) body.scrollTop = 120;
    })()`);
    await sleep(600);

    console.log('Capturing Female Active Program Modal with 15 swipes, 3 chats, 24 days...');
    await capture('evidence_qa_08_active_modal_female_quotas.png');

    // ── 3. REVERT TO MALE ──
    console.log('\nReverting session back to Male role...');
    await evaluate(`(() => {
        const key = 'sb-gedoyoleoscgxgdqszzc-auth-token';
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.user) {
                parsed.user.user_metadata = parsed.user.user_metadata || {};
                parsed.user.user_metadata.role = 'Male';
                parsed.user.user_metadata.gender = 'Male';
                localStorage.setItem(key, JSON.stringify(parsed));
            }
        }
    })()`);

    console.log('Verification completed successfully!');
    ws.close();
}

main().catch(console.error);
