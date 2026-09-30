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

    // Step 1: Update profile gender to Female in Supabase database
    console.log('\nUpdating Alex Davis profile gender to Female in Supabase...');
    const updateRes = await evaluate(`(async () => {
        try {
            const mod = await import('./assets/supabase-BZ0N5lZN.js').catch(() => null);
            // Or use window.supabase or window.__supabase
            const sb = window.__supabase || mod?.supabase;
            if (!sb) {
                // Find supabase client from window or module cache
                return { success: false, error: 'No supabase client found' };
            }
            const authRes = await sb.auth.getUser();
            const user = authRes?.data?.user;
            if (!user) return { success: false, error: 'No auth user' };

            const { error } = await sb
                .from('profiles')
                .update({ gender: 'Female', role: 'Female' })
                .eq('id', user.id);

            return { success: !error, error: error?.message, userId: user.id };
        } catch (e) {
            return { success: false, error: e.message };
        }
    })()`);
    console.log('Update result:', updateRes);

    // If dynamic import didn't work, clear persistent caches and set Female
    await evaluate(`(() => {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.includes('profile') || k.includes('user') || k.includes('active_program'))) {
                localStorage.removeItem(k);
            }
        }
    })()`);

    // Reload page so fresh profile with Female gender is fetched
    console.log('Reloading page...');
    await send('Page.reload');
    await sleep(4500);

    // Dismiss tour / popups
    await evaluate(`(() => {
        localStorage.setItem('hasSeenAppTour', 'true');
        const tour = document.querySelector('.tour-close, .btn-tour-skip, [aria-label="Close tour"], .modal-close');
        if (tour) tour.click();
    })()`);

    console.log('Navigating to /dashboard...');
    await evaluate(`(() => {
        history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
    })()`);
    await sleep(3000);

    // Inspect userProfile on Dashboard
    const profileInfo = await evaluate(`(() => {
        const name = document.querySelector('.dashboard-name')?.innerText;
        const hasCard = !!document.querySelector('.dashboard-active-program-card');
        const cardText = document.querySelector('.dashboard-active-program-card')?.innerText;
        return { name, hasCard, cardText };
    })()`);
    console.log('Dashboard Info:', profileInfo);

    if (profileInfo?.hasCard) {
        console.log('Capturing Female Dashboard with College Date Active Card...');
        await capture('evidence_qa_07_dashboard_female_active_card.png');

        console.log('Opening College Date Active Modal...');
        await evaluate(`(() => {
            const card = document.querySelector('.dashboard-active-program-card');
            if (card) card.click();
        })()`);
        await sleep(2000);

        const modalCheck = await evaluate(`(() => {
            const items = Array.from(document.querySelectorAll('.active-check-item')).map(i => i.innerText.trim());
            const days = document.querySelector('.active-days-counter')?.innerText?.trim();
            const target = document.querySelector('.active-target-hint')?.innerText?.trim();
            const note = document.querySelector('.active-payout-note')?.innerText?.trim();
            return { items, days, target, note };
        })()`);
        console.log('Modal Check with 15 swipes, 3 chats, 24 days:', modalCheck);

        // Scroll modal body slightly to capture full checklist
        await evaluate(`(() => {
            const body = document.querySelector('.active-modal-body');
            if (body) body.scrollTop = 120;
        })()`);
        await sleep(600);

        console.log('Capturing Female Active Modal with Updated Quotas...');
        await capture('evidence_qa_08_active_modal_female_quotas.png');
    }

    // Step 3: Revert Alex Davis gender back to Male in Supabase database
    console.log('\nReverting Alex Davis profile gender back to Male...');
    await evaluate(`(async () => {
        try {
            const mod = await import('./assets/supabase-BZ0N5lZN.js').catch(() => null);
            const sb = window.__supabase || mod?.supabase;
            if (sb) {
                const authRes = await sb.auth.getUser();
                const user = authRes?.data?.user;
                if (user) {
                    await sb.from('profiles').update({ gender: 'Male', role: 'Male' }).eq('id', user.id);
                }
            }
        } catch (e) {}
    })()`);

    console.log('Done!');
    ws.close();
}

main().catch(console.error);
