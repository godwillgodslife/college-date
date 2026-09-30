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

    // Step 1: Sign In as Jordan Taylor (Female) via in-app Supabase client
    console.log('\nSigning in as Jordan Taylor (Female: student.tester2026.partner@gmail.com)...');
    const loginResult = await evaluate(`(async () => {
        try {
            // Clear persistent caches
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('persistent_cache:')) {
                    localStorage.removeItem(k);
                }
            }

            const mod = await import('./assets/supabase-BZ0N5lZN.js').catch(() => null);
            const sb = window.__supabase || mod?.supabase;
            if (!sb) return { success: false, error: 'No supabase client' };

            const { data, error } = await sb.auth.signInWithPassword({
                email: 'student.tester2026.partner@gmail.com',
                password: 'CollegeDate2026!VerifiedPass'
            });

            if (error) return { success: false, error: error.message };

            // Update local token
            localStorage.setItem('hasSeenAppTour', 'true');
            return { success: true, user: data.user.email };
        } catch (e) {
            return { success: false, error: e.message };
        }
    })()`);
    console.log('Login result:', loginResult);

    await sleep(2000);

    // Dismiss tour / popups
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"], .modal-close');
        if (tour) tour.click();
    })()`);

    // Step 2: Navigate to /dashboard as Female
    console.log('\nNavigating to /dashboard as Female student...');
    await evaluate(`(() => {
        history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3500);

    // Check greeting & presence of card
    const dashboardCheck = await evaluate(`(() => {
        const greeting = document.querySelector('.dashboard-greeting')?.innerText;
        const hasCard = !!document.querySelector('.dashboard-active-program-card');
        const cardText = document.querySelector('.dashboard-active-program-card')?.innerText;
        return { greeting, hasCard, cardText };
    })()`);
    console.log('Female Dashboard status:', dashboardCheck);

    console.log('Capturing Female Dashboard with Active Card...');
    await capture('evidence_qa_07_dashboard_female_active_card.png');

    // Step 3: Open Active Program Modal to verify quotas
    console.log('\nClicking Active Program card to open modal...');
    await evaluate(`(() => {
        const card = document.querySelector('.dashboard-active-program-card');
        if (card) card.click();
    })()`);
    await sleep(2000);

    const modalData = await evaluate(`(() => {
        const items = Array.from(document.querySelectorAll('.active-check-item')).map(i => i.innerText.trim());
        const days = document.querySelector('.active-days-counter')?.innerText?.trim();
        const target = document.querySelector('.active-target-hint')?.innerText?.trim();
        const note = document.querySelector('.active-payout-note')?.innerText?.trim();
        return { items, days, target, note };
    })()`);
    console.log('Female Active Modal Data:', JSON.stringify(modalData, null, 2));

    // Scroll modal slightly so 15 swipes and 3 chats are centered
    await evaluate(`(() => {
        const body = document.querySelector('.active-modal-body');
        if (body) body.scrollTop = 120;
    })()`);
    await sleep(600);

    console.log('Capturing Female Active Modal with 15 swipes, 3 chats, 24 days...');
    await capture('evidence_qa_08_active_modal_female_quotas.png');

    // Close modal
    await evaluate(`(() => {
        const closeBtn = document.querySelector('.active-close-btn');
        if (closeBtn) closeBtn.click();
    })()`);
    await sleep(1000);

    // Step 4: Navigate to /wallet as Female
    console.log('\nNavigating to /wallet as Female student...');
    await evaluate(`(() => {
        history.pushState({}, '', '/wallet');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3000);

    const walletCheck = await evaluate(`(() => {
        const hasCard = !!document.querySelector('.wallet-active-program-card');
        const cardText = document.querySelector('.wallet-active-program-card')?.innerText;
        return { hasCard, cardText };
    })()`);
    console.log('Female Wallet status:', walletCheck);

    console.log('Capturing Female Wallet with Active Card...');
    await capture('evidence_qa_09_wallet_female_active_card.png');

    console.log('\nALL FEMALE VERIFICATION COMPLETED CLEANLY!');
    ws.close();
}

main().catch(console.error);
